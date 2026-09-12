import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { ClaimedJob } from "../../src/jobs/types.js";
import { createComplianceJobHandler } from "../../src/modules/compliance/compliance.composition.js";

function claim(attemptNumber: number): ClaimedJob {
  return {
    queue: "job",
    id: randomUUID(),
    kind: "compliance.run",
    payload: {
      runId: randomUUID(),
      reviewId: randomUUID(),
      userId: randomUUID(),
      requestedModel: null,
    },
    attemptId: randomUUID(),
    attemptNumber,
    maxAttempts: 3,
    workerId: "worker-1",
    lockedUntil: new Date(Date.now() + 10_000),
  };
}

describe("compliance job handler", () => {
  it("retries transient orchestration failures without publishing terminal state", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failReviewRun: vi.fn(),
    };
    const handler = createComplianceJobHandler({
      analysis: {
        execute: async () => {
          throw new Error("provider unavailable");
        },
      },
      repository,
    });

    await expect(handler(claim(1), new AbortController().signal)).resolves.toEqual({
      kind: "retry",
      error: "provider unavailable",
    });
    expect(repository.failReviewRun).not.toHaveBeenCalled();
  });

  it("publishes durable failed state after the final attempt", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failReviewRun: vi.fn(async () => true),
    };
    const handler = createComplianceJobHandler({
      analysis: {
        execute: async () => {
          throw new Error("provider unavailable");
        },
      },
      repository,
    });
    const finalClaim = claim(3);

    await expect(handler(finalClaim, new AbortController().signal)).resolves.toEqual({
      kind: "failed",
      error: "provider unavailable",
    });
    expect(repository.failReviewRun).toHaveBeenCalledWith(
      finalClaim.payload.runId,
      finalClaim.payload.reviewId,
      "provider unavailable",
    );
  });
});
