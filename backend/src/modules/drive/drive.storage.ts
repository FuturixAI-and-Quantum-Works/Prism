import crypto from "node:crypto";
import { driveStorageKey, driveVersionStorageKey } from "../../lib/storage.js";
import {
  type ObjectRef,
  type ObjectStore,
  type ObjectStoreCopy,
  type ObjectStorePut,
} from "../../storage/types.js";
import {
  DriveStorageReconciler,
  type DriveStorageOperationLease,
  type DriveStorageOperationRepository,
} from "./drive.reconciliation.js";

export function fileObjectRef(
  userId: string,
  fileId: string,
  filename: string,
  workspaceId: string | null,
): ObjectRef {
  return driveStorageKey(userId, fileId, filename, workspaceId);
}

export function versionObjectRef(
  userId: string,
  fileId: string,
  versionSlug: string,
  filename: string,
  workspaceId: string | null,
): ObjectRef {
  return driveVersionStorageKey(userId, fileId, versionSlug, filename, workspaceId);
}

export class DriveStorageCoordinator {
  private readonly reconciler: DriveStorageReconciler;

  constructor(
    private readonly objectStore: ObjectStore,
    private readonly operations: DriveStorageOperationRepository,
  ) {
    this.reconciler = new DriveStorageReconciler(operations, objectStore);
  }

  private requestLeaseDurationMs(actionCount: number): number {
    const requestTimeoutMs = this.objectStore.requestTimeoutMs ?? 0;
    return Math.max(300_000, requestTimeoutMs * actionCount + 30_000);
  }

  async putThenCommit<T>(
    idempotencyKey: string,
    input: ObjectStorePut,
    commit: (lease: DriveStorageOperationLease) => Promise<T>,
  ): Promise<T> {
    const lease = await this.operations.prepare({
      idempotencyKey,
      owner: `drive-request:${crypto.randomUUID()}`,
      leaseDurationMs: this.requestLeaseDurationMs(1),
      cleanupGraceMs: this.objectStore.requestTimeoutMs ?? 0,
      payload: {
        actions: [
          {
            kind: "put",
            destinationPath: input.ref,
            contentType: input.contentType,
          },
        ],
      },
    });
    try {
      await this.objectStore.put(input);
      const result = await commit(lease);
      await this.operations.finishCommitted(lease);
      return result;
    } catch (error) {
      return this.abandonAndReconcile(lease, error);
    }
  }

  async copyThenCommit<T>(
    idempotencyKey: string,
    copies: readonly ObjectStoreCopy[],
    commit: (lease: DriveStorageOperationLease) => Promise<T>,
  ): Promise<T> {
    const lease = await this.operations.prepare({
      idempotencyKey,
      owner: `drive-request:${crypto.randomUUID()}`,
      leaseDurationMs: this.requestLeaseDurationMs(copies.length),
      cleanupGraceMs: this.objectStore.requestTimeoutMs ?? 0,
      payload: {
        actions: copies.map((copy) => ({
          kind: "copy",
          sourcePath: copy.sourceRef,
          destinationPath: copy.destinationRef,
        })),
      },
    });
    try {
      for (const copy of copies) {
        await this.objectStore.copy(copy);
      }
      const result = await commit(lease);
      await this.operations.finishCommitted(lease);
      return result;
    } catch (error) {
      return this.abandonAndReconcile(lease, error);
    }
  }

  async reconcileDelete(operationId: string): Promise<void> {
    try {
      await this.reconciler.runOne(operationId);
    } catch (error) {
      throw new Error("Drive metadata was committed; object cleanup will be retried", {
        cause: error,
      });
    }
  }

  private async abandonAndReconcile(
    lease: DriveStorageOperationLease,
    original: unknown,
  ): Promise<never> {
    await this.operations.abandon(lease);
    try {
      await this.reconciler.runOne(lease.id);
    } catch (reconciliationError) {
      throw new AggregateError(
        [original, reconciliationError],
        "Drive storage operation failed; durable reconciliation is pending",
        { cause: reconciliationError },
      );
    }
    throw original;
  }
}
