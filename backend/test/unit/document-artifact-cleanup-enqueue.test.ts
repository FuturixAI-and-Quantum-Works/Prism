import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueDocumentArtifactCleanup } from "../../src/jobs/enqueue.js";

const queue = vi.hoisted(() => ({
  enqueueJob: vi.fn(async () => "job-id"),
}));

vi.mock("../../src/jobs/repository.js", () => ({
  getQueueRepository: () => queue,
}));

describe("enqueueDocumentArtifactCleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T00:00:00.000Z"));
    queue.enqueueJob.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses an operation-unique key and delayed retryable job", async () => {
    await expect(
      enqueueDocumentArtifactCleanup({
        operationId: "00000000-0000-4000-8000-000000000001",
        documentId: "00000000-0000-4000-8000-000000000002",
        paths: ["documents/user/document/source.docx"],
        delayMs: 5_000,
      }),
    ).resolves.toBe("job-id");

    expect(queue.enqueueJob).toHaveBeenCalledWith({
      kind: "document.artifact.cleanup",
      payload: {
        operationId: "00000000-0000-4000-8000-000000000001",
        documentId: "00000000-0000-4000-8000-000000000002",
        paths: ["documents/user/document/source.docx"],
      },
      idempotencyKey: "document-artifact-cleanup:00000000-0000-4000-8000-000000000001",
      maxAttempts: 5,
      availableAt: new Date("2026-09-03T00:00:05.000Z"),
    });
  });
});
