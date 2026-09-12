import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { ClaimedJob } from "../../src/jobs/types.js";
import {
  createTabularJobHandler,
  TabularFenceLostError,
  TabularWorkerInterruptedError,
} from "../../src/modules/tabular/tabular.generation.js";

function claim(attemptNumber: number): ClaimedJob {
  return {
    queue: "job",
    id: randomUUID(),
    kind: "tabular.generate",
    payload: { runId: randomUUID() },
    attemptId: randomUUID(),
    attemptNumber,
    maxAttempts: 3,
    workerId: "worker-1",
    lockedUntil: new Date(Date.now() + 10_000),
  };
}

describe("tabular job handler", () => {
  it("retries transient failures without publishing terminal state", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failActiveRun: vi.fn(),
      failRun: vi.fn(),
    };
    const handler = createTabularJobHandler({
      generation: {
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
    expect(repository.failActiveRun).not.toHaveBeenCalled();
  });

  it("marks the run failed after the final attempt", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failActiveRun: vi.fn(),
      failRun: vi.fn(),
    };
    const handler = createTabularJobHandler({
      generation: {
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
    expect(repository.failActiveRun).toHaveBeenCalledWith(
      finalClaim.payload.runId,
      "provider unavailable",
    );
  });

  it("keeps cancellation authoritative", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => true),
      failActiveRun: vi.fn(),
      failRun: vi.fn(),
    };
    const handler = createTabularJobHandler({
      generation: {
        execute: async () => {
          throw new Error("late provider failure");
        },
      },
      repository,
    });
    await expect(handler(claim(3), new AbortController().signal)).resolves.toEqual({
      kind: "failed",
      error: "Tabular run cancelled",
    });
    expect(repository.failActiveRun).not.toHaveBeenCalled();
  });

  it("converges when completed work is claimed again", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failActiveRun: vi.fn(),
      failRun: vi.fn(),
    };
    const execute = vi.fn(async () => undefined);
    const handler = createTabularJobHandler({ generation: { execute }, repository });
    const job = claim(2);
    await expect(handler(job, new AbortController().signal)).resolves.toEqual({
      kind: "succeeded",
    });
    expect(execute).toHaveBeenCalledWith(job.payload.runId, expect.any(AbortSignal));
    expect(repository.failActiveRun).not.toHaveBeenCalled();
  });

  it("terminalizes a current-epoch fence loss without retrying", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failActiveRun: vi.fn(),
      failRun: vi.fn(async () => true),
    };
    const handler = createTabularJobHandler({
      generation: {
        execute: async () => {
          throw new TabularFenceLostError(4);
        },
      },
      repository,
    });
    const job = claim(1);
    await expect(handler(job, new AbortController().signal)).resolves.toEqual({
      kind: "failed",
      error: "Tabular run lost ownership of a target cell",
    });
    expect(repository.failRun).toHaveBeenCalledWith(
      job.payload.runId,
      4,
      "Tabular run lost ownership of a target cell",
    );
    expect(repository.failActiveRun).not.toHaveBeenCalled();
  });

  it("retries a worker interruption without treating it as user cancellation", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failActiveRun: vi.fn(),
      failRun: vi.fn(),
    };
    const job = claim(1);
    const handler = createTabularJobHandler({
      generation: {
        execute: async () => {
          throw new TabularWorkerInterruptedError(job.payload.runId, 7);
        },
      },
      repository,
    });
    await expect(handler(job, AbortSignal.abort())).resolves.toEqual({
      kind: "retry",
      error: "Tabular worker interrupted",
    });
    expect(repository.failRun).not.toHaveBeenCalled();
  });

  it("fails only the interrupted epoch on the final attempt", async () => {
    const repository = {
      isRunCancelled: vi.fn(async () => false),
      failActiveRun: vi.fn(),
      failRun: vi.fn(async () => false),
    };
    const job = claim(3);
    const handler = createTabularJobHandler({
      generation: {
        execute: async () => {
          throw new TabularWorkerInterruptedError(job.payload.runId, 8);
        },
      },
      repository,
    });
    await expect(handler(job, AbortSignal.abort())).resolves.toEqual({
      kind: "failed",
      error: "Tabular worker interrupted",
    });
    expect(repository.failRun).toHaveBeenCalledWith(
      job.payload.runId,
      8,
      "Tabular worker interrupted",
    );
    expect(repository.failActiveRun).not.toHaveBeenCalled();
  });
});
