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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { shareRoleEnum } from "./enums.js";
import { documents } from "./documents.js";
import { users } from "./identity.js";
import { projects } from "./projects.js";
import { workflows } from "./workflows.js";
import { jobs } from "./operations.js";

export const tabularReviews = pgTable(
  "tabular_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    workflowId: uuid("workflow_id").references(() => workflows.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 500 }),
    columnsConfig: jsonb("columns_config"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("tabular_reviews_user_idx").on(table.userId),
    projectIdx: index("tabular_reviews_project_idx").on(table.projectId),
    workflowIdx: index("tabular_reviews_workflow_idx").on(table.workflowId),
  }),
);

export const tabularReviewShares = pgTable(
  "tabular_review_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => tabularReviews.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: shareRoleEnum("role").notNull(),
    sharedByUserId: uuid("shared_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdx: index("tabular_review_shares_review_idx").on(table.reviewId),
    userIdx: index("tabular_review_shares_user_idx").on(table.userId),
    emailIdx: index("tabular_review_shares_email_idx").on(table.email),
    uniqueReviewUser: uniqueIndex("tabular_review_shares_review_user_idx")
      .on(table.reviewId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueReviewEmail: uniqueIndex("tabular_review_shares_review_email_idx").on(
      table.reviewId,
      table.email,
    ),
  }),
);

export const tabularCells = pgTable(
  "tabular_cells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => tabularReviews.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    columnIndex: integer("column_index").notNull(),
    content: jsonb("content"),
    status: varchar("status", { length: 50 }).default("pending"),
    activeRunId: uuid("active_run_id").references((): AnyPgColumn => tabularRuns.id, {
      onDelete: "set null",
    }),
    activeRunEpoch: integer("active_run_epoch"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdx: index("tabular_cells_review_idx").on(table.reviewId),
    documentIdx: index("tabular_cells_document_idx").on(table.documentId),
    reviewDocumentColumnIdx: uniqueIndex("tabular_cells_review_document_column_idx").on(
      table.reviewId,
      table.documentId,
      table.columnIndex,
    ),
  }),
);

export const tabularReviewSources = pgTable(
  "tabular_review_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => tabularReviews.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdx: index("tabular_review_sources_review_idx").on(table.reviewId),
    uniqueMembership: uniqueIndex("tabular_review_sources_unique_idx").on(
      table.reviewId,
      table.documentId,
    ),
    uniqueOrder: uniqueIndex("tabular_review_sources_order_idx").on(
      table.reviewId,
      table.sortOrder,
    ),
  }),
);

export const tabularRuns = pgTable(
  "tabular_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => tabularReviews.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    operation: varchar("operation", { length: 30 }).notNull(),
    request: jsonb("request").$type<Record<string, unknown>>().notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 20 }).default("queued").notNull(),
    error: text("error"),
    executionEpoch: integer("execution_epoch").default(0).notNull(),
    nextSequence: integer("next_sequence").default(1).notNull(),
    usedModelCalls: integer("used_model_calls").default(0).notNull(),
    usedOutputTokens: integer("used_output_tokens").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex("tabular_runs_idempotency_idx").on(
      table.reviewId,
      table.userId,
      table.operation,
      table.idempotencyKey,
    ),
    reviewCreatedIdx: index("tabular_runs_review_created_idx").on(table.reviewId, table.createdAt),
    activeReviewIdx: uniqueIndex("tabular_runs_active_review_idx")
      .on(table.reviewId)
      .where(sql`${table.status} IN ('queued', 'running')`),
    jobIdx: uniqueIndex("tabular_runs_job_idx").on(table.jobId),
    statusCheck: check(
      "tabular_runs_status_chk",
      sql`${table.status} IN ('queued', 'running', 'completed', 'failed', 'cancelled')`,
    ),
    operationCheck: check(
      "tabular_runs_operation_chk",
      sql`${table.operation} IN ('generate', 'regenerate-cell')`,
    ),
  }),
);

export const tabularRunEvents = pgTable(
  "tabular_run_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => tabularRuns.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    eventKey: varchar("event_key", { length: 255 }).notNull(),
    event: jsonb("event").$type<Record<string, unknown>>().notNull(),
    errorKind: varchar("error_kind", { length: 40 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runEventKeyIdx: uniqueIndex("tabular_run_events_run_event_key_idx").on(
      table.runId,
      table.eventKey,
    ),
    runSequenceIdx: uniqueIndex("tabular_run_events_run_sequence_idx").on(
      table.runId,
      table.sequence,
    ),
    errorKindCheck: check(
      "tabular_run_events_error_kind_chk",
      sql`${table.errorKind} IS NULL OR ${table.errorKind} IN ('extraction', 'unsupported-inline-pdf', 'missing-model-result')`,
    ),
  }),
);

export const tabularReviewChats = pgTable(
  "tabular_review_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => tabularReviews.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdx: index("tabular_review_chats_review_idx").on(table.reviewId),
  }),
);

export const tabularReviewChatMessages = pgTable(
  "tabular_review_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => tabularReviewChats.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull(),
    content: text("content"),
    annotations: jsonb("annotations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    chatIdx: index("tabular_review_chat_messages_chat_idx").on(table.chatId),
  }),
);
