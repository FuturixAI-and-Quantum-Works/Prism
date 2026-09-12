import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { complianceReviewStatusEnum, complianceRuleStatusEnum } from "./enums.js";
import { documents } from "./documents.js";
import { users } from "./identity.js";
import { jobs } from "./operations.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const complianceReviews = pgTable(
  "compliance_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    primaryDocumentId: uuid("primary_document_id").references(() => documents.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 255 }),
    status: complianceReviewStatusEnum("status").default("pending").notNull(),
    complianceScore: integer("compliance_score"),
    results: jsonb("results"),
    aiInsights: jsonb("ai_insights"),
    ragCollectionName: varchar("rag_collection_name", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("compliance_reviews_user_idx").on(table.userId),
    projectIdx: index("compliance_reviews_project_idx").on(table.projectId),
    workspaceIdx: index("compliance_reviews_workspace_idx").on(table.workspaceId),
    primaryDocIdx: index("compliance_reviews_primary_doc_idx").on(table.primaryDocumentId),
    statusIdx: index("compliance_reviews_status_idx").on(table.status),
  }),
);

export const complianceReviewSupportingDocs = pgTable(
  "compliance_review_supporting_docs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => complianceReviews.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdx: index("compliance_review_supporting_docs_review_idx").on(table.reviewId),
    documentIdx: index("compliance_review_supporting_docs_document_idx").on(table.documentId),
    uniqueDoc: uniqueIndex("compliance_review_supporting_docs_unique_idx").on(
      table.reviewId,
      table.documentId,
    ),
  }),
);

export const complianceReviewRules = pgTable(
  "compliance_review_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => complianceReviews.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    status: complianceRuleStatusEnum("status").default("pending").notNull(),
    result: jsonb("result"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdx: index("compliance_review_rules_review_idx").on(table.reviewId),
    statusIdx: index("compliance_review_rules_status_idx").on(table.status),
  }),
);

export const complianceReviewQuestions = pgTable(
  "compliance_review_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => complianceReviews.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    status: complianceRuleStatusEnum("status").default("pending").notNull(),
    result: jsonb("result"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    reviewIdx: index("compliance_review_questions_review_idx").on(table.reviewId),
    statusIdx: index("compliance_review_questions_status_idx").on(table.status),
  }),
);

export const complianceRuns = pgTable(
  "compliance_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => complianceReviews.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).default("queued").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex("compliance_runs_idempotency_idx").on(
      table.reviewId,
      table.userId,
      table.idempotencyKey,
    ),
    reviewCreatedIdx: index("compliance_runs_review_created_idx").on(
      table.reviewId,
      table.createdAt,
    ),
    jobIdx: uniqueIndex("compliance_runs_job_idx").on(table.jobId),
    statusCheck: check(
      "compliance_runs_status_chk",
      sql`${table.status} IN ('queued', 'running', 'completed', 'failed', 'cancelled')`,
    ),
  }),
);

export const complianceRunEvents = pgTable(
  "compliance_run_events",
  {
    sequence: serial("sequence").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => complianceRuns.id, { onDelete: "cascade" }),
    eventKey: varchar("event_key", { length: 255 }).notNull(),
    event: jsonb("event").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runEventKeyIdx: uniqueIndex("compliance_run_events_run_event_key_idx").on(
      table.runId,
      table.eventKey,
    ),
  }),
);
