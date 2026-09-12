import { describe, expect, it } from "vitest";
import {
  DriveStorageReconciler,
  type DriveStorageOperation,
  type DriveStorageOperationLease,
  type DriveStorageOperationRepository,
} from "../../src/modules/drive/drive.reconciliation.js";
import { DriveStorageCoordinator } from "../../src/modules/drive/drive.storage.js";
import {
  ObjectNotFoundError,
  parseObjectRef,
  type ObjectRef,
  type ObjectStore,
} from "../../src/storage/types.js";

function bytes(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

class MemoryObjectStore implements ObjectStore {
  readonly objects = new Map<ObjectRef, ArrayBuffer>();
  failNextDelete = false;

  async put(input: Parameters<ObjectStore["put"]>[0]): Promise<void> {
    this.objects.set(input.ref, input.content);
  }

  async get(ref: ObjectRef): Promise<ArrayBuffer> {
    const value = this.objects.get(ref);
    if (!value) throw new ObjectNotFoundError(ref);
    return value;
  }

  async delete(ref: ObjectRef): Promise<void> {
    if (this.failNextDelete) {
      this.failNextDelete = false;
      throw new Error("delete failed");
    }
    this.objects.delete(ref);
  }

  async copy(input: Parameters<ObjectStore["copy"]>[0]): Promise<void> {
    this.objects.set(input.destinationRef, await this.get(input.sourceRef));
  }

  async signRead(): Promise<string> {
    return "https://example.test/download";
  }

  async health() {
    return { kind: "healthy" as const };
  }

  close(): void {}
}

type MemoryRecord = {
  lease: DriveStorageOperationLease;
  state: "prepared" | "cleanup" | "committed" | "completed";
  payload: DriveStorageOperation["payload"];
  cleanupGraceMs: number;
  cleanupUntil: Date | null;
  availableAt: Date;
};

class MemoryOperations implements DriveStorageOperationRepository {
  readonly records = new Map<string, MemoryRecord>();
  readonly references = new Set<string>();
  private sequence = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async prepare(input: Parameters<DriveStorageOperationRepository["prepare"]>[0]) {
    const existing = [...this.records.values()].find(
      (record) => record.lease.id === input.idempotencyKey,
    );
    if (existing) return existing.lease;
    const lease = {
      id: input.idempotencyKey,
      owner: input.owner,
      generation: 1,
    };
    const now = this.now();
    this.records.set(lease.id, {
      lease,
      state: "prepared",
      payload: input.payload,
      cleanupGraceMs: input.cleanupGraceMs,
      cleanupUntil: null,
      availableAt: new Date(now.getTime() + input.leaseDurationMs),
    });
    return lease;
  }

  async abandon(lease: DriveStorageOperationLease) {
    const record = this.fenced(lease, "prepared");
    if (!record) return false;
    record.state = "cleanup";
    record.lease = { ...record.lease, owner: "" };
    record.availableAt = this.now();
    record.cleanupUntil = new Date(this.now().getTime() + record.cleanupGraceMs);
    return true;
  }

  async finishCommitted(lease: DriveStorageOperationLease) {
    const record = this.fenced(lease, "committed");
    if (!record) return false;
    record.state = "completed";
    return true;
  }

  async claim(input: Parameters<DriveStorageOperationRepository["claim"]>[0]) {
    for (const record of this.records.values()) {
      if (input.operationId && record.lease.id !== input.operationId) continue;
      if (record.state === "cleanup" && record.availableAt > this.now()) continue;
      if (record.state === "committed") {
        record.lease = {
          id: record.lease.id,
          owner: input.owner,
          generation: record.lease.generation + 1,
        };
        return {
          lease: record.lease,
          state: "committed" as const,
          payload: record.payload,
          cleanupUntil: record.cleanupUntil,
        };
      }
      if (record.state !== "prepared" && record.state !== "cleanup") {
        continue;
      }
      if (record.state === "prepared") {
        record.cleanupUntil = new Date(this.now().getTime() + record.cleanupGraceMs);
      }
      record.state = "cleanup";
      record.lease = {
        id: record.lease.id,
        owner: input.owner,
        generation: record.lease.generation + 1,
      };
      return {
        lease: record.lease,
        state: "cleanup" as const,
        payload: record.payload,
        cleanupUntil: record.cleanupUntil,
      };
    }
    return null;
  }

  async complete(lease: DriveStorageOperationLease, state: DriveStorageOperation["state"]) {
    const record = this.fenced(lease, state);
    if (!record) return false;
    if (state === "cleanup" && record.cleanupUntil && this.now() < record.cleanupUntil) {
      return false;
    }
    record.state = "completed";
    return true;
  }

  async deferCleanup(lease: DriveStorageOperationLease, availableAt: Date) {
    const record = this.fenced(lease, "cleanup");
    if (!record) return false;
    record.lease = { ...record.lease, owner: "" };
    record.availableAt = availableAt;
    return true;
  }

  async retry(lease: DriveStorageOperationLease, _error: string, availableAt: Date) {
    const record = this.fenced(lease, "cleanup");
    if (!record) return false;
    record.lease = { ...record.lease, owner: "" };
    record.availableAt = this.now() < availableAt ? this.now() : availableAt;
    return true;
  }

  async isReferenced(path: string) {
    return this.references.has(path);
  }

  commit(lease: DriveStorageOperationLease): void {
    const record = this.fenced(lease, "prepared");
    if (!record) throw new Error("Drive storage operation lease was lost");
    record.state = "committed";
  }

  createCleanup(path: string): string {
    const id = `delete-${this.sequence++}`;
    this.records.set(id, {
      lease: { id, owner: "", generation: 0 },
      state: "cleanup",
      payload: { actions: [{ kind: "delete", destinationPath: path }] },
      cleanupGraceMs: 0,
      cleanupUntil: null,
      availableAt: this.now(),
    });
    return id;
  }

  private fenced(
    lease: DriveStorageOperationLease,
    state: MemoryRecord["state"],
  ): MemoryRecord | null {
    const record = this.records.get(lease.id);
    if (
      !record ||
      record.state !== state ||
      record.lease.owner !== lease.owner ||
      record.lease.generation !== lease.generation
    ) {
      return null;
    }
    return record;
  }
}

describe("Drive storage reconciliation", () => {
  it("persists failed upload cleanup across a worker restart", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const coordinator = new DriveStorageCoordinator(store, operations);
    const ref = parseObjectRef("drive/user/files/file/source.txt");
    store.failNextDelete = true;
    await expect(
      coordinator.putThenCommit(
        "upload-1",
        { ref, content: bytes("content"), contentType: "text/plain" },
        async () => {
          throw new Error("database failed");
        },
      ),
    ).rejects.toThrow("durable reconciliation is pending");
    expect(operations.records.get("upload-1")?.state).toBe("cleanup");
    const restarted = new DriveStorageReconciler(operations, store);
    await restarted.runOne();
    await restarted.runOne();
    expect(store.objects.has(ref)).toBe(false);
    expect(operations.records.get("upload-1")?.state).toBe("completed");
  });

  it("recovers a crash after object write and before database commit", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const ref = parseObjectRef("drive/user/files/orphan/source.txt");
    await operations.prepare({
      idempotencyKey: "upload-crash",
      owner: "dead-request",
      leaseDurationMs: 1,
      cleanupGraceMs: 0,
      payload: {
        actions: [{ kind: "put", destinationPath: ref, contentType: "text/plain" }],
      },
    });
    await store.put({ ref, content: bytes("content"), contentType: "text/plain" });
    await new DriveStorageReconciler(operations, store).runOne();
    expect(store.objects.has(ref)).toBe(false);
  });

  it("retries cleanup when an unreferenced object appears after the first pass", async () => {
    let now = new Date("2026-09-02T00:00:00.000Z");
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations(() => now);
    const delayed = parseObjectRef("drive/user/files/delayed/source.txt");
    const referenced = parseObjectRef("drive/user/files/referenced/source.txt");
    store.objects.set(referenced, bytes("referenced"));
    operations.references.add(referenced);
    await operations.prepare({
      idempotencyKey: "upload-delayed",
      owner: "dead-request",
      leaseDurationMs: 1,
      cleanupGraceMs: 60_000,
      payload: {
        actions: [
          { kind: "put", destinationPath: delayed, contentType: "text/plain" },
          { kind: "put", destinationPath: referenced, contentType: "text/plain" },
        ],
      },
    });
    const reconciler = new DriveStorageReconciler(operations, store, 30_000, 30_000, () => now);

    await expect(reconciler.runOne()).resolves.toBe(true);
    store.objects.set(delayed, bytes("late"));
    now = new Date(now.getTime() + 30_000);
    await expect(reconciler.runOne()).resolves.toBe(true);

    expect(store.objects.has(delayed)).toBe(false);
    expect(store.objects.has(referenced)).toBe(true);
    now = new Date(now.getTime() + 30_001);
    await expect(reconciler.runOne()).resolves.toBe(true);
    expect(operations.records.get("upload-delayed")?.state).toBe("completed");
  });

  it("cleans partial copies after a crash between object writes", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const source = parseObjectRef("drive/user/files/source/source.txt");
    const first = parseObjectRef("drive/user/files/first/source.txt");
    const second = parseObjectRef("drive/user/files/second/source.txt");
    store.objects.set(source, bytes("content"));
    await operations.prepare({
      idempotencyKey: "copy-crash",
      owner: "dead-request",
      leaseDurationMs: 1,
      cleanupGraceMs: 0,
      payload: {
        actions: [
          { kind: "copy", sourcePath: source, destinationPath: first },
          { kind: "copy", sourcePath: source, destinationPath: second },
        ],
      },
    });
    await store.copy({ sourceRef: source, destinationRef: first });
    await new DriveStorageReconciler(operations, store).runOne();
    expect(store.objects.has(first)).toBe(false);
    expect(store.objects.has(second)).toBe(false);
  });

  it("keeps an object after metadata and intent commit", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const ref = parseObjectRef("drive/user/files/committed/source.txt");
    const lease = await operations.prepare({
      idempotencyKey: "upload-committed",
      owner: "dead-request",
      leaseDurationMs: 1,
      cleanupGraceMs: 0,
      payload: {
        actions: [{ kind: "put", destinationPath: ref, contentType: "text/plain" }],
      },
    });
    await store.put({ ref, content: bytes("content"), contentType: "text/plain" });
    operations.references.add(ref);
    operations.commit(lease);
    await expect(new DriveStorageReconciler(operations, store).runOne()).resolves.toBe(true);
    expect(store.objects.has(ref)).toBe(true);
    expect(operations.records.get("upload-committed")?.state).toBe("completed");
  });

  it("rejects a stale request after a worker advances the fence", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const ref = parseObjectRef("drive/user/files/stale/source.txt");
    const staleLease = await operations.prepare({
      idempotencyKey: "upload-stale",
      owner: "stale-request",
      leaseDurationMs: 1,
      cleanupGraceMs: 0,
      payload: {
        actions: [{ kind: "put", destinationPath: ref, contentType: "text/plain" }],
      },
    });
    await store.put({ ref, content: bytes("content"), contentType: "text/plain" });
    const claimed = await operations.claim({
      owner: "worker",
      leaseDurationMs: 30_000,
      operationId: staleLease.id,
    });
    expect(claimed?.lease.generation).toBe(2);
    expect(() => operations.commit(staleLease)).toThrow("lease was lost");
  });

  it("never deletes an object that committed data references", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const ref = parseObjectRef("drive/user/files/reused/source.txt");
    store.objects.set(ref, bytes("content"));
    operations.references.add(ref);
    const operationId = operations.createCleanup(ref);
    await new DriveStorageReconciler(operations, store).runOne(operationId);
    expect(store.objects.has(ref)).toBe(true);
  });

  it("finishes delete cleanup after metadata committed and the process stopped", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const ref = parseObjectRef("drive/user/files/deferred-delete/source.txt");
    store.objects.set(ref, bytes("content"));
    operations.createCleanup(ref);
    await new DriveStorageReconciler(operations, store).runOne();
    expect(store.objects.has(ref)).toBe(false);
  });

  it("converges when the same cleanup runs more than once", async () => {
    const store = new MemoryObjectStore();
    const operations = new MemoryOperations();
    const ref = parseObjectRef("drive/user/files/deleted/source.txt");
    store.objects.set(ref, bytes("content"));
    const operationId = operations.createCleanup(ref);
    const reconciler = new DriveStorageReconciler(operations, store);
    await expect(reconciler.runOne(operationId)).resolves.toBe(true);
    await expect(reconciler.runOne(operationId)).resolves.toBe(false);
    expect(store.objects.has(ref)).toBe(false);
  });
});
