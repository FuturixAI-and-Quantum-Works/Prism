import type { AppConfig } from "../config.js";
import type { QueueRepository } from "./types.js";

function bucketKey(prefix: string, now: Date, intervalMs: number): string {
  return `${prefix}:${Math.floor(now.getTime() / intervalMs)}`;
}

export function createWorkerScheduler(
  repository: QueueRepository,
  config: AppConfig["worker"],
): (now: Date) => Promise<void> {
  return async (now) => {
    await Promise.all([
      repository.enqueueJob({
        kind: "health.check",
        payload: {},
        idempotencyKey: bucketKey("health-check", now, config.healthCheckIntervalMs),
      }),
      repository.enqueueJob({
        kind: "health.cleanup",
        payload: { retentionDays: config.healthRetentionDays },
        idempotencyKey: bucketKey("health-cleanup", now, config.healthCleanupIntervalMs),
      }),
      repository.enqueueJob({
        kind: "drive.storage.reconcile",
        payload: {},
        idempotencyKey: bucketKey("drive-storage-reconcile", now, 30_000),
        maxAttempts: 5,
      }),
    ]);
  };
}
