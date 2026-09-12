import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkHandlers } from "../../src/jobs/handlers.js";
import type { ClaimedJob, JobPayload } from "../../src/jobs/types.js";
import { ObjectNotFoundError, type ObjectStore } from "../../src/storage/types.js";

const documentId = "00000000-0000-4000-8000-000000000001";
const operationId = "00000000-0000-4000-8000-000000000002";
const firstPath = "documents/user/document/source.docx";
const secondPath = "converted-pdfs/user/document.pdf";

function claim(payload: JobPayload): ClaimedJob {
  return {
    queue: "job",
    id: randomUUID(),
    kind: "document.artifact.cleanup",
    payload,
    attemptId: randomUUID(),
    attemptNumber: 1,
    maxAttempts: 5,
    workerId: "test-worker",
    lockedUntil: new Date(Date.now() + 60_000),
  };
}

function objectStore(): ObjectStore {
  return {
    put: vi.fn(async () => undefined),
    get: vi.fn(async () => new ArrayBuffer(0)),
    delete: vi.fn(async () => undefined),
    copy: vi.fn(async () => undefined),
    signRead: vi.fn(async () => "https://example.com/object"),
    health: vi.fn(async () => ({ kind: "healthy" as const })),
    close: vi.fn(),
  };
}

function cleanupClaim(paths: readonly string[] = [firstPath, secondPath]) {
  return claim({ operationId, documentId, paths });
}

describe("document.artifact.cleanup worker", () => {
  const signal = new AbortController().signal;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects malformed cleanup payloads", async () => {
    const store = objectStore();
    const references = {
      isArtifactPathReferenced: vi.fn(async () => false),
    };
    const handler = createWorkHandlers(store, references).jobs["document.artifact.cleanup"];

    await expect(handler?.(claim({ documentId, paths: [""] }), signal)).resolves.toEqual({
      kind: "failed",
      error: "Invalid document artifact cleanup payload",
    });
    expect(store.delete).not.toHaveBeenCalled();
  });

  it("skips referenced paths before deletion", async () => {
    const store = objectStore();
    const references = {
      isArtifactPathReferenced: vi.fn(async () => true),
    };
    const handler = createWorkHandlers(store, references).jobs["document.artifact.cleanup"];

    await expect(handler?.(cleanupClaim([firstPath]), signal)).resolves.toEqual({
      kind: "succeeded",
    });
    expect(references.isArtifactPathReferenced).toHaveBeenCalledWith(firstPath);
    expect(store.delete).not.toHaveBeenCalled();
  });

  it("deletes every unreferenced path", async () => {
    const store = objectStore();
    const references = {
      isArtifactPathReferenced: vi.fn(async () => false),
    };
    const handler = createWorkHandlers(store, references).jobs["document.artifact.cleanup"];

    await expect(handler?.(cleanupClaim(), signal)).resolves.toEqual({
      kind: "succeeded",
    });
    expect(store.delete).toHaveBeenCalledTimes(2);
    expect(store.delete).toHaveBeenNthCalledWith(1, firstPath);
    expect(store.delete).toHaveBeenNthCalledWith(2, secondPath);
  });

  it("treats a missing object as successful cleanup", async () => {
    const store = objectStore();
    vi.mocked(store.delete).mockRejectedValue(new ObjectNotFoundError(firstPath));
    const references = {
      isArtifactPathReferenced: vi.fn(async () => false),
    };
    const handler = createWorkHandlers(store, references).jobs["document.artifact.cleanup"];

    await expect(handler?.(cleanupClaim([firstPath]), signal)).resolves.toEqual({
      kind: "succeeded",
    });
  });

  it("retries deletion failures without exposing object paths", async () => {
    const store = objectStore();
    vi.mocked(store.delete).mockRejectedValue(new Error(`delete failed for ${firstPath}`));
    const references = {
      isArtifactPathReferenced: vi.fn(async () => false),
    };
    const handler = createWorkHandlers(store, references).jobs["document.artifact.cleanup"];

    const outcome = await handler?.(cleanupClaim([firstPath]), signal);

    expect(outcome).toEqual({
      kind: "retry",
      error: "Document artifact cleanup failed for 1 object",
    });
    expect(JSON.stringify(outcome)).not.toContain(firstPath);
  });
});
