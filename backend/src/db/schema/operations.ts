import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jobAttemptStatusEnum, jobStatusEnum, outboxStatusEnum } from "./enums.js";
import { users } from "./identity.js";

export type JobPayload = Record<string, unknown>;
export type OutboxPayload = Record<string, unknown>;
export type DriveStorageOperationPayload = {
  actions: readonly (
    | {
        kind: "put";
        destinationPath: string;
        contentType: string;
      }
    | {
        kind: "copy";
        sourcePath: string;
        destinationPath: string;
      }
    | {
        kind: "delete";
        destinationPath: string;
      }
  )[];
};

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: varchar("kind", { length: 120 }).notNull(),
    status: jobStatusEnum("status").default("queued").notNull(),
    payload: jsonb("payload")
      .$type<JobPayload>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    priority: integer("priority").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    availableAt: timestamp("available_at").defaultNow().notNull(),
    lockedBy: varchar("locked_by", { length: 255 }),
    lockedUntil: timestamp("locked_until"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex("jobs_idempotency_idx").on(table.idempotencyKey),
    claimIdx: index("jobs_claim_idx").on(table.status, table.availableAt, table.priority),
    actorIdx: index("jobs_actor_idx").on(table.actorUserId),
    maxAttemptsCheck: check("jobs_max_attempts_chk", sql`${table.maxAttempts} > 0`),
    priorityCheck: check("jobs_priority_chk", sql`${table.priority} >= 0`),
    terminalTimeCheck: check(
      "jobs_terminal_time_chk",
      sql`(${table.status} = 'succeeded' AND ${table.completedAt} IS NOT NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'cancelled' AND ${table.cancelledAt} IS NOT NULL AND ${table.completedAt} IS NULL)
        OR (${table.status} IN ('queued', 'running', 'failed') AND ${table.completedAt} IS NULL AND ${table.cancelledAt} IS NULL)`,
    ),
  }),
);

export const jobAttempts = pgTable(
  "job_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    status: jobAttemptStatusEnum("status").notNull(),
    workerId: varchar("worker_id", { length: 255 }).notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    errorCode: varchar("error_code", { length: 120 }),
    errorMessage: text("error_message"),
    errorDetails: jsonb("error_details").$type<Record<string, unknown>>(),
  },
  (table) => ({
    jobAttemptIdx: uniqueIndex("job_attempts_job_attempt_idx").on(table.jobId, table.attemptNumber),
    statusIdx: index("job_attempts_status_idx").on(table.status),
    attemptNumberCheck: check("job_attempts_attempt_number_chk", sql`${table.attemptNumber} > 0`),
    finishCheck: check(
      "job_attempts_finish_chk",
      sql`(${table.status} = 'running' AND ${table.finishedAt} IS NULL)
        OR (${table.status} IN ('succeeded', 'failed') AND ${table.finishedAt} IS NOT NULL)`,
    ),
  }),
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topic: varchar("topic", { length: 120 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 120 }).notNull(),
    aggregateId: uuid("aggregate_id"),
    payload: jsonb("payload")
      .$type<OutboxPayload>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    status: outboxStatusEnum("status").default("pending").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(10).notNull(),
    availableAt: timestamp("available_at").defaultNow().notNull(),
    lockedBy: varchar("locked_by", { length: 255 }),
    lockedUntil: timestamp("locked_until"),
    publishedAt: timestamp("published_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex("outbox_events_idempotency_idx").on(table.idempotencyKey),
    dispatchIdx: index("outbox_events_dispatch_idx").on(table.status, table.availableAt),
    attemptsCheck: check(
      "outbox_events_attempts_chk",
      sql`${table.attempts} >= 0 AND ${table.maxAttempts} > 0 AND ${table.attempts} <= ${table.maxAttempts}`,
    ),
    publicationCheck: check(
      "outbox_events_publication_chk",
      sql`(${table.status} = 'published' AND ${table.publishedAt} IS NOT NULL)
        OR (${table.status} <> 'published' AND ${table.publishedAt} IS NULL)`,
    ),
  }),
);

export const driveStorageOperations = pgTable(
  "drive_storage_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    state: varchar("state", { length: 32 }).default("prepared").notNull(),
    payload: jsonb("payload").$type<DriveStorageOperationPayload>().notNull(),
    leaseGeneration: integer("lease_generation").default(0).notNull(),
    lockedBy: varchar("locked_by", { length: 255 }),
    lockedUntil: timestamp("locked_until"),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at").defaultNow().notNull(),
    cleanupGraceMs: integer("cleanup_grace_ms").default(0).notNull(),
    cleanupUntil: timestamp("cleanup_until"),
    completedAt: timestamp("completed_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex("drive_storage_operations_idempotency_idx").on(
      table.idempotencyKey,
    ),
    claimIdx: index("drive_storage_operations_claim_idx").on(table.state, table.availableAt),
    stateCheck: check(
      "drive_storage_operations_state_chk",
      sql`${table.state} IN ('prepared', 'cleanup', 'committed', 'completed')`,
    ),
    attemptsCheck: check(
      "drive_storage_operations_attempts_chk",
      sql`${table.attempts} >= 0 AND ${table.leaseGeneration} >= 0 AND ${table.cleanupGraceMs} >= 0`,
    ),
    completionCheck: check(
      "drive_storage_operations_completion_chk",
      sql`(${table.state} = 'completed' AND ${table.completedAt} IS NOT NULL)
        OR (${table.state} <> 'completed' AND ${table.completedAt} IS NULL)`,
    ),
  }),
);
