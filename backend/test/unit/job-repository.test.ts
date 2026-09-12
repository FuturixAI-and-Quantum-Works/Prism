import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PostgresQueueRepository, retryDelayMs } from "../../src/jobs/repository.js";
import { createWorkerScheduler } from "../../src/jobs/scheduling.js";

const schema = `
  CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
  CREATE TYPE job_attempt_status AS ENUM ('running', 'succeeded', 'failed');
  CREATE TYPE outbox_status AS ENUM ('pending', 'processing', 'published', 'failed');
  CREATE TABLE jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind varchar(120) NOT NULL,
    status job_status DEFAULT 'queued' NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    idempotency_key varchar(255) UNIQUE,
    actor_user_id uuid,
    priority integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    available_at timestamp DEFAULT now() NOT NULL,
    locked_by varchar(255),
    locked_until timestamp,
    completed_at timestamp,
    cancelled_at timestamp,
    last_error text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE job_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    attempt_number integer NOT NULL,
    status job_attempt_status NOT NULL,
    worker_id varchar(255) NOT NULL,
    started_at timestamp DEFAULT now() NOT NULL,
    finished_at timestamp,
    error_code varchar(120),
    error_message text,
    error_details jsonb,
    UNIQUE(job_id, attempt_number)
  );
  CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic varchar(120) NOT NULL,
    aggregate_type varchar(120) NOT NULL,
    aggregate_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status outbox_status DEFAULT 'pending' NOT NULL,
    idempotency_key varchar(255) UNIQUE NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 10 NOT NULL,
    available_at timestamp DEFAULT now() NOT NULL,
    locked_by varchar(255),
    locked_until timestamp,
    published_at timestamp,
    last_error text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
`;

describe("PostgresQueueRepository", () => {
  let database: PGlite;
  let repository: PostgresQueueRepository;

  beforeEach(async () => {
    database = new PGlite();
    await database.exec(schema);
    repository = new PostgresQueueRepository(async (text, values) => {
      const result = await database.query<Record<string, unknown>>(text, values);
      return result.rows;
    });
  });

  afterEach(async () => {
    await database.close();
  });

  it("deduplicates enqueue and grants one exclusive claim", async () => {
    const first = await repository.enqueueJob({
      kind: "probe",
      payload: { value: 1 },
      idempotencyKey: "probe:one",
    });
    const duplicate = await repository.enqueueJob({
      kind: "probe",
      payload: { value: 1 },
      idempotencyKey: "probe:one",
    });

    expect(duplicate).toBe(first);
    const claims = await Promise.all([
      repository.claimJob("worker-a", 1_000),
      repository.claimJob("worker-b", 1_000),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await expect(database.query("SELECT id FROM jobs")).resolves.toMatchObject({
      rows: [{ id: first }],
    });
    await expect(
      repository.enqueueJob({
        kind: "probe",
        payload: { value: 2 },
        idempotencyKey: "probe:one",
      }),
    ).rejects.toThrow(/conflicts with different work/);
    await expect(
      repository.enqueueJob({
        kind: "probe",
        payload: { value: 1 },
        idempotencyKey: "probe:one",
        maxAttempts: 4,
      }),
    ).rejects.toThrow(/conflicts with different work/);
  });

  it("backs off retries and stops at max attempts", async () => {
    const start = new Date("2026-09-01T10:00:00.000Z");
    await repository.enqueueJob({
      kind: "probe",
      payload: {},
      idempotencyKey: "probe:retry",
      maxAttempts: 2,
      availableAt: start,
    });
    const first = await repository.claimJob("worker-a", 1_000, start);
    expect(first?.attemptNumber).toBe(1);
    if (!first) throw new Error("Expected first claim");

    await repository.fail(first, { kind: "retry", error: "temporary" }, start);
    await expect(
      repository.claimJob("worker-b", 1_000, new Date(start.getTime() + retryDelayMs(1) - 1)),
    ).resolves.toBeNull();
    const second = await repository.claimJob(
      "worker-b",
      1_000,
      new Date(start.getTime() + retryDelayMs(1)),
    );
    expect(second?.attemptNumber).toBe(2);
    if (!second) throw new Error("Expected second claim");

    await repository.fail(second, { kind: "retry", error: "still failing" }, start);
    const result = await database.query<{ status: string; last_error: string }>(
      "SELECT status, last_error FROM jobs WHERE id = $1",
      [second.id],
    );
    expect(result.rows).toEqual([{ status: "failed", last_error: "still failing" }]);
  });

  it("recovers a stale lease and closes the abandoned attempt", async () => {
    const start = new Date("2026-09-01T10:00:00.000Z");
    await repository.enqueueJob({
      kind: "probe",
      payload: {},
      idempotencyKey: "probe:stale",
      availableAt: start,
    });
    const first = await repository.claimJob("worker-a", 100, start);
    expect(first).not.toBeNull();

    await expect(repository.recoverStaleLeases(new Date(start.getTime() + 101))).resolves.toBe(1);
    const second = await repository.claimJob("worker-b", 100, new Date(start.getTime() + 101));
    expect(second?.attemptNumber).toBe(2);
    const attempts = await database.query<{ status: string }>(
      "SELECT status FROM job_attempts ORDER BY attempt_number",
    );
    expect(attempts.rows.map((row) => row.status)).toEqual(["failed", "running"]);
  });

  it("rejects an outcome after its lease expires", async () => {
    const start = new Date("2026-09-01T10:00:00.000Z");
    await repository.enqueueJob({
      kind: "probe",
      payload: {},
      idempotencyKey: "probe:expired-outcome",
      availableAt: start,
    });
    const claim = await repository.claimJob("worker-a", 100, start);
    if (!claim) throw new Error("Expected claim");

    await expect(repository.complete(claim, new Date(start.getTime() + 101))).resolves.toBe(false);
    const result = await database.query<{ job_status: string; attempt_status: string }>(
      `
        SELECT jobs.status AS job_status, job_attempts.status AS attempt_status
        FROM jobs
        JOIN job_attempts ON job_attempts.job_id = jobs.id
        WHERE jobs.id = $1
      `,
      [claim.id],
    );
    expect(result.rows[0]).toEqual({ job_status: "running", attempt_status: "running" });
  });

  it("cancels work without allowing a late completion", async () => {
    const id = await repository.enqueueJob({
      kind: "probe",
      payload: {},
      idempotencyKey: "probe:cancel",
    });
    const claim = await repository.claimJob("worker-a", 1_000);
    if (!claim) throw new Error("Expected claim");

    await expect(repository.cancelJob(id)).resolves.toBe(true);
    await expect(repository.complete(claim)).resolves.toBe(false);
    const result = await database.query<{ status: string }>(
      "SELECT status FROM jobs WHERE id = $1",
      [id],
    );
    expect(result.rows[0]?.status).toBe("cancelled");
  });

  it("deduplicates and completes outbox delivery", async () => {
    const input = {
      topic: "email.template",
      aggregateType: "probe",
      payload: { recipient: "person@example.com" },
      idempotencyKey: "email:probe",
    } as const;
    const first = await repository.enqueueOutbox(input);
    await expect(repository.enqueueOutbox(input)).resolves.toBe(first);
    const claim = await repository.claimOutbox("worker-a", 1_000);
    if (!claim) throw new Error("Expected outbox claim");

    await expect(repository.complete(claim)).resolves.toBe(true);
    await expect(repository.claimOutbox("worker-b", 1_000)).resolves.toBeNull();
  });

  it("recovers stale outbox leases and fails exhausted delivery", async () => {
    const start = new Date("2026-09-01T10:00:00.000Z");
    await repository.enqueueOutbox({
      topic: "email.template",
      aggregateType: "probe",
      payload: {},
      idempotencyKey: "email:stale",
      maxAttempts: 1,
      availableAt: start,
    });
    await repository.claimOutbox("worker-a", 100, start);

    await expect(repository.recoverStaleLeases(new Date(start.getTime() + 101))).resolves.toBe(1);
    const result = await database.query<{ status: string }>(
      "SELECT status FROM outbox_events WHERE idempotency_key = 'email:stale'",
    );
    expect(result.rows[0]?.status).toBe("failed");
  });

  it("materializes one durable maintenance job per schedule window", async () => {
    const schedule = createWorkerScheduler(repository, {
      concurrency: 1,
      pollIntervalMs: 10,
      leaseDurationMs: 1_000,
      shutdownTimeoutMs: 1_000,
      healthCheckUrl: "https://api.example.com/health",
      healthCheckIntervalMs: 60_000,
      healthCleanupIntervalMs: 3_600_000,
      healthRetentionDays: 120,
    });
    const now = new Date("2026-09-01T10:00:00.000Z");

    await schedule(now);
    await schedule(new Date(now.getTime() + 1));

    const result = await database.query<{ kind: string }>("SELECT kind FROM jobs ORDER BY kind");
    expect(result.rows.map(({ kind }) => kind)).toEqual([
      "drive.storage.reconcile",
      "health.check",
      "health.cleanup",
    ]);
  });
});
