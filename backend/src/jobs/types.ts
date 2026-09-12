export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type JobPayload = Readonly<Record<string, JsonValue>>;

export type EnqueueJobInput = Readonly<{
  kind: string;
  payload: JobPayload;
  idempotencyKey: string;
  actorUserId?: string | null;
  priority?: number;
  maxAttempts?: number;
  availableAt?: Date;
}>;

export type EnqueueOutboxInput = Readonly<{
  topic: string;
  aggregateType: string;
  aggregateId?: string | null;
  payload: JobPayload;
  idempotencyKey: string;
  maxAttempts?: number;
  availableAt?: Date;
}>;

export type ClaimedJob = Readonly<{
  queue: "job";
  id: string;
  kind: string;
  payload: JobPayload;
  attemptId: string;
  attemptNumber: number;
  maxAttempts: number;
  workerId: string;
  lockedUntil: Date;
}>;

export type ClaimedOutboxEvent = Readonly<{
  queue: "outbox";
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string | null;
  payload: JobPayload;
  attemptNumber: number;
  maxAttempts: number;
  workerId: string;
  lockedUntil: Date;
}>;

export type WorkClaim = ClaimedJob | ClaimedOutboxEvent;

export type WorkOutcome =
  | Readonly<{ kind: "succeeded" }>
  | Readonly<{ kind: "retry"; error: string; retryAfterMs?: number }>
  | Readonly<{ kind: "failed"; error: string }>;

export type WorkHandler<Claim extends WorkClaim = WorkClaim> = (
  claim: Claim,
  signal: AbortSignal,
) => Promise<WorkOutcome>;

export type WorkHandlers = Readonly<{
  jobs: Readonly<Record<string, WorkHandler<ClaimedJob>>>;
  outbox: Readonly<Record<string, WorkHandler<ClaimedOutboxEvent>>>;
}>;

export interface QueueRepository {
  enqueueJob(input: EnqueueJobInput): Promise<string>;
  enqueueOutbox(input: EnqueueOutboxInput): Promise<string>;
  claimJob(workerId: string, leaseDurationMs: number, now?: Date): Promise<ClaimedJob | null>;
  claimOutbox(
    workerId: string,
    leaseDurationMs: number,
    now?: Date,
  ): Promise<ClaimedOutboxEvent | null>;
  renew(claim: WorkClaim, leaseDurationMs: number, now?: Date): Promise<boolean>;
  complete(claim: WorkClaim, now?: Date): Promise<boolean>;
  fail(
    claim: WorkClaim,
    outcome: Exclude<WorkOutcome, { kind: "succeeded" }>,
    now?: Date,
  ): Promise<boolean>;
  cancelJob(jobId: string, now?: Date): Promise<boolean>;
  recoverStaleLeases(now?: Date): Promise<number>;
}
