import { randomUUID } from "node:crypto";
import type {
  ClaimedJob,
  ClaimedOutboxEvent,
  QueueRepository,
  WorkClaim,
  WorkHandlers,
  WorkOutcome,
} from "./types.js";

type WorkerLogger = Readonly<{
  info: (message: string, details?: Record<string, unknown>) => void;
  warn: (message: string, details?: Record<string, unknown>) => void;
  error: (message: string, details?: Record<string, unknown>) => void;
}>;

type WorkerOptions = Readonly<{
  repository: QueueRepository;
  handlers: WorkHandlers;
  workerId: string;
  concurrency: number;
  pollIntervalMs: number;
  leaseDurationMs: number;
  shutdownTimeoutMs: number;
  schedule?: (now: Date) => Promise<void>;
  logger?: WorkerLogger;
}>;

export type QueueWorker = Readonly<{
  done: Promise<void>;
  stop: () => Promise<void>;
}>;

const defaultLogger: WorkerLogger = {
  info: (message, details) => console.info(message, details ?? ""),
  warn: (message, details) => console.warn(message, details ?? ""),
  error: (message, details) => console.error(message, details ?? ""),
};

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function maintainLease(
  repository: QueueRepository,
  claim: WorkClaim,
  leaseDurationMs: number,
  signal: AbortSignal,
  logger: WorkerLogger,
  onLeaseLost: () => void,
): Promise<void> {
  const intervalMs = Math.max(1, Math.floor(leaseDurationMs / 2));
  while (!signal.aborted) {
    await wait(intervalMs, signal);
    if (signal.aborted) return;
    try {
      if (!(await repository.renew(claim, leaseDurationMs))) {
        logger.warn("Worker lost a lease", { queue: claim.queue, id: claim.id });
        onLeaseLost();
        return;
      }
    } catch (error) {
      logger.error("Worker lease renewal failed", {
        queue: claim.queue,
        id: claim.id,
        error: errorMessage(error),
      });
      onLeaseLost();
      return;
    }
  }
}

async function runClaim(
  repository: QueueRepository,
  handlers: WorkHandlers,
  claim: WorkClaim,
  leaseDurationMs: number,
  activeControllers: Set<AbortController>,
  logger: WorkerLogger,
): Promise<void> {
  const heartbeatController = new AbortController();
  const claimController = new AbortController();
  activeControllers.add(claimController);
  const heartbeat = maintainLease(
    repository,
    claim,
    leaseDurationMs,
    heartbeatController.signal,
    logger,
    () => claimController.abort(),
  );
  let outcome: WorkOutcome;
  try {
    if (claim.queue === "job") {
      const handler = handlers.jobs[claim.kind];
      outcome = handler
        ? await handler(claim, claimController.signal)
        : { kind: "failed", error: `No handler is registered for ${claim.kind}` };
    } else {
      const handler = handlers.outbox[claim.topic];
      outcome = handler
        ? await handler(claim, claimController.signal)
        : { kind: "failed", error: `No handler is registered for ${claim.topic}` };
    }
  } catch (error) {
    outcome = { kind: "retry", error: errorMessage(error) };
  } finally {
    heartbeatController.abort();
    await heartbeat;
    activeControllers.delete(claimController);
  }

  const recorded =
    outcome.kind === "succeeded"
      ? await repository.complete(claim)
      : await repository.fail(claim, outcome);
  if (!recorded) {
    logger.warn("Worker outcome was ignored after ownership changed", {
      queue: claim.queue,
      id: claim.id,
      outcome: outcome.kind,
    });
  }
}

async function claimNext(
  repository: QueueRepository,
  workerId: string,
  leaseDurationMs: number,
  lane: "jobs" | "outbox" | "shared",
  preferOutbox: boolean,
): Promise<ClaimedJob | ClaimedOutboxEvent | null> {
  const claimOwner = `${workerId}:${randomUUID()}`;
  if (lane === "jobs") return repository.claimJob(claimOwner, leaseDurationMs);
  if (lane === "outbox") return repository.claimOutbox(claimOwner, leaseDurationMs);
  if (preferOutbox) {
    return (
      (await repository.claimOutbox(claimOwner, leaseDurationMs)) ??
      (await repository.claimJob(claimOwner, leaseDurationMs))
    );
  }
  return (
    (await repository.claimJob(claimOwner, leaseDurationMs)) ??
    (await repository.claimOutbox(claimOwner, leaseDurationMs))
  );
}

export function startQueueWorker(options: WorkerOptions): QueueWorker {
  if (!Number.isInteger(options.concurrency) || options.concurrency <= 0) {
    throw new Error("Worker concurrency must be a positive integer");
  }
  if (!Number.isInteger(options.pollIntervalMs) || options.pollIntervalMs <= 0) {
    throw new Error("Worker poll interval must be a positive integer");
  }
  if (!Number.isInteger(options.leaseDurationMs) || options.leaseDurationMs <= 0) {
    throw new Error("Worker lease duration must be a positive integer");
  }
  const logger = options.logger ?? defaultLogger;
  const controller = new AbortController();
  const activeControllers = new Set<AbortController>();

  const maintenance = (async () => {
    while (!controller.signal.aborted) {
      try {
        await options.repository.recoverStaleLeases();
        await options.schedule?.(new Date());
      } catch (error) {
        logger.error("Worker maintenance failed", { error: errorMessage(error) });
      }
      await wait(options.pollIntervalMs, controller.signal);
    }
  })();

  const lanes = Array.from({ length: options.concurrency }, (_, lane) =>
    (async () => {
      const laneWorkerId = `${options.workerId}:${lane}`;
      const laneKind = options.concurrency === 1 ? "shared" : lane === 0 ? "outbox" : "jobs";
      let preferOutbox = lane % 2 === 1;
      while (!controller.signal.aborted) {
        try {
          const claim = await claimNext(
            options.repository,
            laneWorkerId,
            options.leaseDurationMs,
            laneKind,
            preferOutbox,
          );
          preferOutbox = !preferOutbox;
          if (claim) {
            await runClaim(
              options.repository,
              options.handlers,
              claim,
              options.leaseDurationMs,
              activeControllers,
              logger,
            );
            continue;
          }
        } catch (error) {
          logger.error("Worker loop failed", { error: errorMessage(error) });
        }
        await wait(options.pollIntervalMs, controller.signal);
      }
    })(),
  );
  const done = Promise.all([maintenance, ...lanes]).then(() => undefined);
  let stopPromise: Promise<void> | undefined;

  return {
    done,
    stop() {
      stopPromise ??= (async () => {
        controller.abort();
        let timeout: NodeJS.Timeout | undefined;
        try {
          await Promise.race([
            done,
            new Promise<never>((_resolve, reject) => {
              timeout = setTimeout(() => {
                for (const activeController of activeControllers) activeController.abort();
                reject(new Error("Worker shutdown timed out"));
              }, options.shutdownTimeoutMs);
            }),
          ]);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      })();
      return stopPromise;
    },
  };
}
