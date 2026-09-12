import { z } from "zod";
import type {
  ClaimedJob,
  ClaimedOutboxEvent,
  EnqueueJobInput,
  EnqueueOutboxInput,
  JobPayload,
  JsonValue,
  QueueRepository,
  WorkClaim,
  WorkOutcome,
} from "./types.js";

type SqlValue = string | number | boolean | null;
type Query = (text: string, values?: SqlValue[]) => Promise<readonly Record<string, unknown>[]>;

const identifierSchema = z.string().uuid();
const positiveIntegerSchema = z.coerce.number().int().positive();
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);
const payloadSchema = z.record(z.string(), jsonValueSchema);
const dateSchema = z.union([z.date(), z.string(), z.number()]).transform((value, context) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    context.addIssue({ code: "custom", message: "Invalid database timestamp" });
    return z.NEVER;
  }
  return date;
});

const claimedJobSchema = z
  .object({
    id: identifierSchema,
    kind: z.string().min(1),
    payload: payloadSchema,
    attempt_id: identifierSchema,
    attempt_number: positiveIntegerSchema,
    max_attempts: positiveIntegerSchema,
    worker_id: z.string().min(1),
    locked_until: dateSchema,
  })
  .transform((row): ClaimedJob => ({
    queue: "job",
    id: row.id,
    kind: row.kind,
    payload: row.payload,
    attemptId: row.attempt_id,
    attemptNumber: row.attempt_number,
    maxAttempts: row.max_attempts,
    workerId: row.worker_id,
    lockedUntil: row.locked_until,
  }));

const claimedOutboxSchema = z
  .object({
    id: identifierSchema,
    topic: z.string().min(1),
    aggregate_type: z.string().min(1),
    aggregate_id: identifierSchema.nullable(),
    payload: payloadSchema,
    attempts: positiveIntegerSchema,
    max_attempts: positiveIntegerSchema,
    worker_id: z.string().min(1),
    locked_until: dateSchema,
  })
  .transform((row): ClaimedOutboxEvent => ({
    queue: "outbox",
    id: row.id,
    topic: row.topic,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
    attemptNumber: row.attempts,
    maxAttempts: row.max_attempts,
    workerId: row.worker_id,
    lockedUntil: row.locked_until,
  }));

function requiredText(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return resolved;
}

function nonnegativeInteger(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 0) {
    throw new Error(`${name} must be a nonnegative integer`);
  }
  return resolved;
}

function jsonPayload(payload: JobPayload): string {
  return JSON.stringify(payload);
}

function iso(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
}

export function retryDelayMs(attemptNumber: number): number {
  const exponent = Math.max(0, Math.min(attemptNumber - 1, 8));
  return Math.min(5 * 60_000, 1_000 * 2 ** exponent);
}

export class PostgresQueueRepository implements QueueRepository {
  constructor(private readonly query: Query) {}

  async enqueueJob(input: EnqueueJobInput): Promise<string> {
    const kind = requiredText(input.kind, "job kind");
    const idempotencyKey = requiredText(input.idempotencyKey, "job idempotency key");
    const values: SqlValue[] = [
      kind,
      jsonPayload(input.payload),
      idempotencyKey,
      input.actorUserId ?? null,
      nonnegativeInteger(input.priority, 0, "job priority"),
      positiveInteger(input.maxAttempts, 3, "job max attempts"),
      iso(input.availableAt ?? new Date()),
    ];
    const inserted = await this.query(
      `
        INSERT INTO jobs (
          kind, payload, idempotency_key, actor_user_id, priority, max_attempts, available_at
        )
        VALUES ($1, $2::jsonb, $3, $4::uuid, $5, $6, $7::timestamp)
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `,
      values,
    );
    if (inserted[0]) return identifierSchema.parse(inserted[0].id);
    const existing = await this.query(
      `
        SELECT id
        FROM jobs
        WHERE
          idempotency_key = $3
          AND kind = $1
          AND payload = $2::jsonb
          AND actor_user_id IS NOT DISTINCT FROM $4::uuid
          AND priority = $5
          AND max_attempts = $6
        LIMIT 1
      `,
      values.slice(0, 6),
    );
    if (!existing[0])
      throw new Error(`Job idempotency key conflicts with different work: ${idempotencyKey}`);
    return identifierSchema.parse(existing[0].id);
  }

  async enqueueOutbox(input: EnqueueOutboxInput): Promise<string> {
    const topic = requiredText(input.topic, "outbox topic");
    const aggregateType = requiredText(input.aggregateType, "outbox aggregate type");
    const idempotencyKey = requiredText(input.idempotencyKey, "outbox idempotency key");
    const values: SqlValue[] = [
      topic,
      aggregateType,
      input.aggregateId ?? null,
      jsonPayload(input.payload),
      idempotencyKey,
      positiveInteger(input.maxAttempts, 3, "outbox max attempts"),
      iso(input.availableAt ?? new Date()),
    ];
    const inserted = await this.query(
      `
        INSERT INTO outbox_events (
          topic, aggregate_type, aggregate_id, payload, idempotency_key, max_attempts, available_at
        )
        VALUES ($1, $2, $3::uuid, $4::jsonb, $5, $6, $7::timestamp)
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `,
      values,
    );
    if (inserted[0]) return identifierSchema.parse(inserted[0].id);
    const existing = await this.query(
      `
        SELECT id
        FROM outbox_events
        WHERE
          idempotency_key = $5
          AND topic = $1
          AND aggregate_type = $2
          AND aggregate_id IS NOT DISTINCT FROM $3::uuid
          AND payload = $4::jsonb
          AND max_attempts = $6
        LIMIT 1
      `,
      values.slice(0, 6),
    );
    if (!existing[0]) {
      throw new Error(`Outbox idempotency key conflicts with different work: ${idempotencyKey}`);
    }
    return identifierSchema.parse(existing[0].id);
  }

  async claimJob(
    workerId: string,
    leaseDurationMs: number,
    now = new Date(),
  ): Promise<ClaimedJob | null> {
    const lockedUntil = new Date(now.getTime() + positiveInteger(leaseDurationMs, 1, "lease"));
    const rows = await this.query(
      `
        WITH candidate AS (
          SELECT
            job.id,
            (
              SELECT count(*)::integer
              FROM job_attempts
              WHERE job_attempts.job_id = job.id
            ) AS attempts
          FROM jobs AS job
          WHERE (
            (job.status = 'queued' AND job.available_at <= $1::timestamp)
            OR (
              job.status = 'running'
              AND job.locked_until IS NOT NULL
              AND job.locked_until <= $1::timestamp
            )
          )
          AND (
            SELECT count(*)
            FROM job_attempts
            WHERE job_attempts.job_id = job.id
          ) < job.max_attempts
          ORDER BY job.priority DESC, job.available_at ASC, job.created_at ASC, job.id ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        ),
        stale_attempt AS (
          UPDATE job_attempts AS attempt
          SET
            status = 'failed',
            finished_at = $1::timestamp,
            error_code = 'lease_expired',
            error_message = 'Worker lease expired'
          FROM candidate
          WHERE attempt.job_id = candidate.id AND attempt.status = 'running'
          RETURNING attempt.id
        ),
        claimed AS (
          UPDATE jobs AS job
          SET
            status = 'running',
            locked_by = $2,
            locked_until = $3::timestamp,
            updated_at = $1::timestamp
          FROM candidate
          WHERE job.id = candidate.id
          RETURNING job.*, candidate.attempts + 1 AS attempt_number
        ),
        attempt AS (
          INSERT INTO job_attempts (job_id, attempt_number, status, worker_id, started_at)
          SELECT id, attempt_number, 'running', $2, $1::timestamp
          FROM claimed
          RETURNING id, job_id
        )
        SELECT
          claimed.id,
          claimed.kind,
          claimed.payload,
          attempt.id AS attempt_id,
          claimed.attempt_number,
          claimed.max_attempts,
          claimed.locked_by AS worker_id,
          claimed.locked_until
        FROM claimed
        JOIN attempt ON attempt.job_id = claimed.id
      `,
      [iso(now), requiredText(workerId, "worker id"), iso(lockedUntil)],
    );
    return rows[0] ? claimedJobSchema.parse(rows[0]) : null;
  }

  async claimOutbox(
    workerId: string,
    leaseDurationMs: number,
    now = new Date(),
  ): Promise<ClaimedOutboxEvent | null> {
    const lockedUntil = new Date(now.getTime() + positiveInteger(leaseDurationMs, 1, "lease"));
    const rows = await this.query(
      `
        WITH candidate AS (
          SELECT event.id
          FROM outbox_events AS event
          WHERE (
            (event.status = 'pending' AND event.available_at <= $1::timestamp)
            OR (
              event.status = 'processing'
              AND event.locked_until IS NOT NULL
              AND event.locked_until <= $1::timestamp
            )
          )
          AND event.attempts < event.max_attempts
          ORDER BY event.available_at ASC, event.created_at ASC, event.id ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        ),
        claimed AS (
          UPDATE outbox_events AS event
          SET
            status = 'processing',
            attempts = event.attempts + 1,
            locked_by = $2,
            locked_until = $3::timestamp,
            updated_at = $1::timestamp
          FROM candidate
          WHERE event.id = candidate.id
          RETURNING event.*
        )
        SELECT
          id,
          topic,
          aggregate_type,
          aggregate_id,
          payload,
          attempts,
          max_attempts,
          locked_by AS worker_id,
          locked_until
        FROM claimed
      `,
      [iso(now), requiredText(workerId, "worker id"), iso(lockedUntil)],
    );
    return rows[0] ? claimedOutboxSchema.parse(rows[0]) : null;
  }

  async renew(claim: WorkClaim, leaseDurationMs: number, now = new Date()): Promise<boolean> {
    const lockedUntil = new Date(now.getTime() + positiveInteger(leaseDurationMs, 1, "lease"));
    const rows =
      claim.queue === "job"
        ? await this.query(
            `
              UPDATE jobs
              SET locked_until = $5::timestamp, updated_at = $4::timestamp
              WHERE
                id = $1::uuid
                AND status = 'running'
                AND locked_by = $2
                AND locked_until > $4::timestamp
                AND EXISTS (
                  SELECT 1
                  FROM job_attempts
                  WHERE
                    id = $3::uuid
                    AND job_id = $1::uuid
                    AND status = 'running'
                )
              RETURNING id
            `,
            [claim.id, claim.workerId, claim.attemptId, iso(now), iso(lockedUntil)],
          )
        : await this.query(
            `
              UPDATE outbox_events
              SET locked_until = $4::timestamp, updated_at = $3::timestamp
              WHERE
                id = $1::uuid
                AND status = 'processing'
                AND locked_by = $2
                AND locked_until > $3::timestamp
              RETURNING id
            `,
            [claim.id, claim.workerId, iso(now), iso(lockedUntil)],
          );
    return rows.length === 1;
  }

  async complete(claim: WorkClaim, now = new Date()): Promise<boolean> {
    const rows =
      claim.queue === "job"
        ? await this.query(
            `
              WITH finished_attempt AS (
                UPDATE job_attempts
                SET status = 'succeeded', finished_at = $4::timestamp
                WHERE
                  id = $3::uuid
                  AND job_id = $1::uuid
                  AND worker_id = $2
                  AND status = 'running'
                  AND EXISTS (
                    SELECT 1
                    FROM jobs
                    WHERE
                      id = $1::uuid
                      AND status = 'running'
                      AND locked_by = $2
                      AND locked_until > $4::timestamp
                  )
                RETURNING job_id
              )
              UPDATE jobs
              SET
                status = 'succeeded',
                completed_at = $4::timestamp,
                locked_by = NULL,
                locked_until = NULL,
                last_error = NULL,
                updated_at = $4::timestamp
              WHERE
                id = $1::uuid
                AND status = 'running'
                AND locked_by = $2
                AND locked_until > $4::timestamp
                AND EXISTS (SELECT 1 FROM finished_attempt)
              RETURNING id
            `,
            [claim.id, claim.workerId, claim.attemptId, iso(now)],
          )
        : await this.query(
            `
              UPDATE outbox_events
              SET
                status = 'published',
                published_at = $3::timestamp,
                locked_by = NULL,
                locked_until = NULL,
                last_error = NULL,
                updated_at = $3::timestamp
              WHERE
                id = $1::uuid
                AND status = 'processing'
                AND locked_by = $2
                AND locked_until > $3::timestamp
              RETURNING id
            `,
            [claim.id, claim.workerId, iso(now)],
          );
    return rows.length === 1;
  }

  async fail(
    claim: WorkClaim,
    outcome: Exclude<WorkOutcome, { kind: "succeeded" }>,
    now = new Date(),
  ): Promise<boolean> {
    const retry = outcome.kind === "retry" && claim.attemptNumber < claim.maxAttempts;
    const requestedDelay =
      outcome.kind === "retry" ? (outcome.retryAfterMs ?? retryDelayMs(claim.attemptNumber)) : 0;
    const boundedDelay = Math.max(0, Math.min(requestedDelay, 5 * 60_000));
    const availableAt = new Date(now.getTime() + boundedDelay);
    const rows =
      claim.queue === "job"
        ? await this.query(
            `
              WITH finished_attempt AS (
                UPDATE job_attempts
                SET
                  status = 'failed',
                  finished_at = $4::timestamp,
                  error_code = $5,
                  error_message = $6
                WHERE
                  id = $3::uuid
                  AND job_id = $1::uuid
                  AND worker_id = $2
                  AND status = 'running'
                  AND EXISTS (
                    SELECT 1
                    FROM jobs
                    WHERE
                      id = $1::uuid
                      AND status = 'running'
                      AND locked_by = $2
                      AND locked_until > $4::timestamp
                  )
                RETURNING job_id
              )
              UPDATE jobs
              SET
                status = $7::job_status,
                available_at = $8::timestamp,
                locked_by = NULL,
                locked_until = NULL,
                last_error = $6,
                updated_at = $4::timestamp
              WHERE
                id = $1::uuid
                AND status = 'running'
                AND locked_by = $2
                AND locked_until > $4::timestamp
                AND EXISTS (SELECT 1 FROM finished_attempt)
              RETURNING id
            `,
            [
              claim.id,
              claim.workerId,
              claim.attemptId,
              iso(now),
              outcome.kind === "retry" ? "retryable" : "permanent",
              outcome.error,
              retry ? "queued" : "failed",
              iso(availableAt),
            ],
          )
        : await this.query(
            `
              UPDATE outbox_events
              SET
                status = $4::outbox_status,
                available_at = $5::timestamp,
                locked_by = NULL,
                locked_until = NULL,
                last_error = $3,
                updated_at = $6::timestamp
              WHERE
                id = $1::uuid
                AND status = 'processing'
                AND locked_by = $2
                AND locked_until > $6::timestamp
              RETURNING id
            `,
            [
              claim.id,
              claim.workerId,
              outcome.error,
              retry ? "pending" : "failed",
              iso(availableAt),
              iso(now),
            ],
          );
    return rows.length === 1;
  }

  async cancelJob(jobId: string, now = new Date()): Promise<boolean> {
    const rows = await this.query(
      `
        WITH cancelled_job AS (
          UPDATE jobs
          SET
            status = 'cancelled',
            cancelled_at = $2::timestamp,
            locked_by = NULL,
            locked_until = NULL,
            updated_at = $2::timestamp
          WHERE id = $1::uuid AND status IN ('queued', 'running')
          RETURNING id
        ),
        cancelled_attempt AS (
          UPDATE job_attempts
          SET
            status = 'failed',
            finished_at = $2::timestamp,
            error_code = 'cancelled',
            error_message = 'Job was cancelled'
          WHERE job_id IN (SELECT id FROM cancelled_job) AND status = 'running'
          RETURNING id
        )
        SELECT id FROM cancelled_job
      `,
      [identifierSchema.parse(jobId), iso(now)],
    );
    return rows.length === 1;
  }

  async recoverStaleLeases(now = new Date()): Promise<number> {
    const jobRows = await this.query(
      `
        WITH expired AS (
          SELECT
            job.id,
            (
              SELECT count(*)::integer
              FROM job_attempts
              WHERE job_attempts.job_id = job.id
            ) AS attempts,
            job.max_attempts
          FROM jobs AS job
          WHERE
            job.status = 'running'
            AND job.locked_until IS NOT NULL
            AND job.locked_until <= $1::timestamp
          FOR UPDATE SKIP LOCKED
          LIMIT 100
        ),
        failed_attempt AS (
          UPDATE job_attempts AS attempt
          SET
            status = 'failed',
            finished_at = $1::timestamp,
            error_code = 'lease_expired',
            error_message = 'Worker lease expired'
          FROM expired
          WHERE attempt.job_id = expired.id AND attempt.status = 'running'
          RETURNING attempt.id
        ),
        recovered AS (
          UPDATE jobs AS job
          SET
            status = CASE
              WHEN expired.attempts >= expired.max_attempts THEN 'failed'::job_status
              ELSE 'queued'::job_status
            END,
            available_at = $1::timestamp,
            locked_by = NULL,
            locked_until = NULL,
            last_error = 'Worker lease expired',
            updated_at = $1::timestamp
          FROM expired
          WHERE job.id = expired.id
          RETURNING job.id
        )
        SELECT count(*)::integer AS count FROM recovered
      `,
      [iso(now)],
    );
    const outboxRows = await this.query(
      `
        WITH expired AS (
          SELECT id, attempts, max_attempts
          FROM outbox_events
          WHERE
            status = 'processing'
            AND locked_until IS NOT NULL
            AND locked_until <= $1::timestamp
          FOR UPDATE SKIP LOCKED
          LIMIT 100
        ),
        recovered AS (
          UPDATE outbox_events AS event
          SET
            status = CASE
              WHEN expired.attempts >= expired.max_attempts THEN 'failed'::outbox_status
              ELSE 'pending'::outbox_status
            END,
            available_at = $1::timestamp,
            locked_by = NULL,
            locked_until = NULL,
            last_error = 'Worker lease expired',
            updated_at = $1::timestamp
          FROM expired
          WHERE event.id = expired.id
          RETURNING event.id
        )
        SELECT count(*)::integer AS count FROM recovered
      `,
      [iso(now)],
    );
    return (
      z.coerce
        .number()
        .int()
        .nonnegative()
        .parse(jobRows[0]?.count ?? 0) +
      z.coerce
        .number()
        .int()
        .nonnegative()
        .parse(outboxRows[0]?.count ?? 0)
    );
  }
}

let installedRepository: QueueRepository | undefined;

export function installQueueRepository(repository: QueueRepository): void {
  if (installedRepository && installedRepository !== repository) {
    throw new Error("Queue repository is already installed");
  }
  installedRepository = repository;
}

export function getQueueRepository(): QueueRepository {
  if (!installedRepository) throw new Error("Queue repository has not been installed");
  return installedRepository;
}
