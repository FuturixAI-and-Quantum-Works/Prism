import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import {
  documentVersions,
  driveFiles,
  driveStorageOperations,
  fileVersions,
  type DriveStorageOperationPayload,
} from "../../db/index.js";
import { ObjectNotFoundError, parseObjectRef, type ObjectStore } from "../../storage/types.js";

export type DriveStorageOperationLease = Readonly<{
  id: string;
  owner: string;
  generation: number;
}>;

export type DriveStorageOperation = Readonly<{
  lease: DriveStorageOperationLease;
  state: "committed" | "cleanup";
  payload: DriveStorageOperationPayload;
  cleanupUntil: Date | null;
}>;

export interface DriveStorageOperationRepository {
  prepare(input: {
    idempotencyKey: string;
    payload: DriveStorageOperationPayload;
    owner: string;
    leaseDurationMs: number;
    cleanupGraceMs: number;
  }): Promise<DriveStorageOperationLease>;
  abandon(lease: DriveStorageOperationLease): Promise<boolean>;
  finishCommitted(lease: DriveStorageOperationLease): Promise<boolean>;
  claim(input: {
    owner: string;
    leaseDurationMs: number;
    operationId?: string;
  }): Promise<DriveStorageOperation | null>;
  complete(
    lease: DriveStorageOperationLease,
    state: DriveStorageOperation["state"],
  ): Promise<boolean>;
  deferCleanup(lease: DriveStorageOperationLease, availableAt: Date): Promise<boolean>;
  retry(lease: DriveStorageOperationLease, error: string, availableAt: Date): Promise<boolean>;
  isReferenced(path: string): Promise<boolean>;
}

export class DrizzleDriveStorageOperationRepository implements DriveStorageOperationRepository {
  constructor(private readonly database: Database) {}

  async prepare(input: {
    idempotencyKey: string;
    payload: DriveStorageOperationPayload;
    owner: string;
    leaseDurationMs: number;
    cleanupGraceMs: number;
  }): Promise<DriveStorageOperationLease> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + input.leaseDurationMs);
    const [created] = await this.database
      .insert(driveStorageOperations)
      .values({
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        state: "prepared",
        leaseGeneration: 1,
        lockedBy: input.owner,
        lockedUntil,
        availableAt: lockedUntil,
        cleanupGraceMs: input.cleanupGraceMs,
      })
      .onConflictDoNothing({ target: driveStorageOperations.idempotencyKey })
      .returning({
        id: driveStorageOperations.id,
        owner: driveStorageOperations.lockedBy,
        generation: driveStorageOperations.leaseGeneration,
      });
    if (created?.owner) {
      return { id: created.id, owner: created.owner, generation: created.generation };
    }
    const [existing] = await this.database
      .select()
      .from(driveStorageOperations)
      .where(eq(driveStorageOperations.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (
      !existing ||
      existing.state !== "prepared" ||
      existing.lockedBy !== input.owner ||
      existing.cleanupGraceMs !== input.cleanupGraceMs ||
      JSON.stringify(existing.payload) !== JSON.stringify(input.payload)
    ) {
      throw new Error(`Drive storage idempotency key conflicts: ${input.idempotencyKey}`);
    }
    return {
      id: existing.id,
      owner: input.owner,
      generation: existing.leaseGeneration,
    };
  }

  async abandon(lease: DriveStorageOperationLease): Promise<boolean> {
    const now = new Date();
    const [updated] = await this.database
      .update(driveStorageOperations)
      .set({
        state: "cleanup",
        lockedBy: null,
        lockedUntil: null,
        availableAt: now,
        cleanupUntil: sql`${now}::timestamp + (${driveStorageOperations.cleanupGraceMs} * interval '1 millisecond')`,
        updatedAt: now,
      })
      .where(operationFence(lease, "prepared"))
      .returning({ id: driveStorageOperations.id });
    return Boolean(updated);
  }

  async finishCommitted(lease: DriveStorageOperationLease): Promise<boolean> {
    const now = new Date();
    const [updated] = await this.database
      .update(driveStorageOperations)
      .set({
        state: "completed",
        completedAt: now,
        lockedBy: null,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(operationFence(lease, "committed"))
      .returning({ id: driveStorageOperations.id });
    return Boolean(updated);
  }

  async claim(input: {
    owner: string;
    leaseDurationMs: number;
    operationId?: string;
  }): Promise<DriveStorageOperation | null> {
    const now = new Date();
    return this.database.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(driveStorageOperations)
        .where(
          and(
            input.operationId ? eq(driveStorageOperations.id, input.operationId) : undefined,
            lte(driveStorageOperations.availableAt, now),
            or(
              and(
                eq(driveStorageOperations.state, "prepared"),
                lte(driveStorageOperations.lockedUntil, now),
              ),
              and(
                eq(driveStorageOperations.state, "cleanup"),
                or(
                  eq(driveStorageOperations.lockedBy, input.owner),
                  isNull(driveStorageOperations.lockedBy),
                  lte(driveStorageOperations.lockedUntil, now),
                ),
              ),
              and(
                eq(driveStorageOperations.state, "committed"),
                or(
                  isNull(driveStorageOperations.lockedBy),
                  lte(driveStorageOperations.lockedUntil, now),
                ),
              ),
            ),
          ),
        )
        .orderBy(asc(driveStorageOperations.availableAt), asc(driveStorageOperations.createdAt))
        .for("update", { skipLocked: true })
        .limit(1);
      if (!candidate) return null;
      const state: DriveStorageOperation["state"] =
        candidate.state === "committed" ? "committed" : "cleanup";
      const cleanupUntil =
        candidate.state === "prepared"
          ? new Date(now.getTime() + candidate.cleanupGraceMs)
          : candidate.cleanupUntil;
      const generation = candidate.leaseGeneration + 1;
      const [claimed] = await tx
        .update(driveStorageOperations)
        .set({
          state,
          leaseGeneration: generation,
          lockedBy: input.owner,
          lockedUntil: new Date(now.getTime() + input.leaseDurationMs),
          cleanupUntil,
          updatedAt: now,
        })
        .where(eq(driveStorageOperations.id, candidate.id))
        .returning({
          payload: driveStorageOperations.payload,
          cleanupUntil: driveStorageOperations.cleanupUntil,
        });
      if (!claimed) return null;
      return {
        lease: { id: candidate.id, owner: input.owner, generation },
        state,
        payload: claimed.payload,
        cleanupUntil: claimed.cleanupUntil,
      };
    });
  }

  async complete(
    lease: DriveStorageOperationLease,
    state: DriveStorageOperation["state"],
  ): Promise<boolean> {
    const now = new Date();
    const completionFence =
      state === "cleanup"
        ? and(
            operationFence(lease, state),
            or(
              isNull(driveStorageOperations.cleanupUntil),
              lte(driveStorageOperations.cleanupUntil, now),
            ),
          )
        : operationFence(lease, state);
    const [updated] = await this.database
      .update(driveStorageOperations)
      .set({
        state: "completed",
        completedAt: now,
        lockedBy: null,
        lockedUntil: null,
        lastError: null,
        updatedAt: now,
      })
      .where(completionFence)
      .returning({ id: driveStorageOperations.id });
    return Boolean(updated);
  }

  async deferCleanup(lease: DriveStorageOperationLease, availableAt: Date): Promise<boolean> {
    const now = new Date();
    const [updated] = await this.database
      .update(driveStorageOperations)
      .set({
        lockedBy: null,
        lockedUntil: null,
        availableAt,
        lastError: null,
        updatedAt: now,
      })
      .where(operationFence(lease, "cleanup"))
      .returning({ id: driveStorageOperations.id });
    return Boolean(updated);
  }

  async retry(
    lease: DriveStorageOperationLease,
    error: string,
    availableAt: Date,
  ): Promise<boolean> {
    const now = new Date();
    const [updated] = await this.database
      .update(driveStorageOperations)
      .set({
        lockedBy: null,
        lockedUntil: null,
        attempts: sql`${driveStorageOperations.attempts} + 1`,
        availableAt,
        lastError: error,
        updatedAt: now,
      })
      .where(operationFence(lease, "cleanup"))
      .returning({ id: driveStorageOperations.id });
    return Boolean(updated);
  }

  async isReferenced(path: string): Promise<boolean> {
    const [file, version, documentVersion, documentPdf] = await Promise.all([
      this.database
        .select({ id: driveFiles.id })
        .from(driveFiles)
        .where(eq(driveFiles.storagePath, path))
        .limit(1),
      this.database
        .select({ id: fileVersions.id })
        .from(fileVersions)
        .where(eq(fileVersions.storagePath, path))
        .limit(1),
      this.database
        .select({ id: documentVersions.id })
        .from(documentVersions)
        .where(eq(documentVersions.storagePath, path))
        .limit(1),
      this.database
        .select({ id: documentVersions.id })
        .from(documentVersions)
        .where(eq(documentVersions.pdfStoragePath, path))
        .limit(1),
    ]);
    return Boolean(file[0] || version[0] || documentVersion[0] || documentPdf[0]);
  }
}

export class DriveStorageReconciler {
  constructor(
    private readonly repository: DriveStorageOperationRepository,
    private readonly objectStore: ObjectStore,
    private readonly leaseDurationMs = 30_000,
    private readonly cleanupIntervalMs = 30_000,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async runOne(operationId?: string): Promise<boolean> {
    const operation = await this.repository.claim({
      owner: `drive-reconciler:${randomUUID()}`,
      leaseDurationMs: this.leaseDurationMs,
      operationId,
    });
    if (!operation) return false;
    try {
      if (operation.state === "committed") {
        if (!(await this.repository.complete(operation.lease, "committed"))) {
          throw new Error("Drive storage reconciliation lease was lost");
        }
        return true;
      }
      for (const action of operation.payload.actions) {
        if (await this.repository.isReferenced(action.destinationPath)) continue;
        try {
          await this.objectStore.delete(parseObjectRef(action.destinationPath));
        } catch (error) {
          if (!(error instanceof ObjectNotFoundError)) throw error;
        }
      }
      const now = this.now();
      if (operation.cleanupUntil && now < operation.cleanupUntil) {
        const availableAt = new Date(
          Math.min(now.getTime() + this.cleanupIntervalMs, operation.cleanupUntil.getTime()),
        );
        if (!(await this.repository.deferCleanup(operation.lease, availableAt))) {
          throw new Error("Drive storage reconciliation lease was lost");
        }
        return true;
      }
      if (!(await this.repository.complete(operation.lease, operation.state))) {
        throw new Error("Drive storage reconciliation lease was lost");
      }
      return true;
    } catch (error) {
      if (operation.state === "cleanup") {
        await this.repository.retry(
          operation.lease,
          errorMessage(error),
          new Date(this.now().getTime() + this.cleanupIntervalMs),
        );
      }
      throw error;
    }
  }
}

export function operationFence(
  lease: DriveStorageOperationLease,
  state: "prepared" | "committed" | "cleanup",
) {
  return and(
    eq(driveStorageOperations.id, lease.id),
    eq(driveStorageOperations.state, state),
    eq(driveStorageOperations.lockedBy, lease.owner),
    eq(driveStorageOperations.leaseGeneration, lease.generation),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
