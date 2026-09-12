import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  accessRequestStatusEnum,
  attentionItemSourceTypeEnum,
  attentionItemStatusEnum,
  documentChangeRequestStatusEnum,
  notificationIconTypeEnum,
} from "./enums.js";
import { documents, documentVersions } from "./documents.js";
import { users } from "./identity.js";
import { workspaces } from "./workspaces.js";

export const attentionItems = pgTable(
  "attention_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: attentionItemSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id"),
    secondarySourceId: uuid("secondary_source_id"),
    severity: varchar("severity", { length: 20 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    metadata: jsonb("metadata"),
    status: attentionItemStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => ({
    userIdx: index("attention_items_user_idx").on(table.userId),
    userStatusIdx: index("attention_items_user_status_idx").on(table.userId, table.status),
    sourceIdx: index("attention_items_source_idx").on(table.sourceType, table.sourceId),
    createdIdx: index("attention_items_created_idx").on(table.createdAt),
  }),
);

export const userActivity = pgTable(
  "user_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 80 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: uuid("resource_id"),
    resourceName: varchar("resource_name", { length: 500 }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorName: varchar("actor_name", { length: 255 }),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("user_activity_user_idx").on(table.userId),
    userCreatedIdx: index("user_activity_user_created_idx").on(table.userId, table.createdAt),
    resourceIdx: index("user_activity_resource_idx").on(table.resourceType, table.resourceId),
  }),
);

export const documentChangeRequests = pgTable(
  "document_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => documentVersions.id, {
      onDelete: "set null",
    }),
    changeType: varchar("change_type", { length: 50 }).notNull(),
    changeSummary: text("change_summary"),
    changeDetails: jsonb("change_details"),
    status: documentChangeRequestStatusEnum("status").default("pending").notNull(),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_change_requests_document_idx").on(table.documentId),
    requesterIdx: index("document_change_requests_requester_idx").on(table.requestedByUserId),
    statusIdx: index("document_change_requests_status_idx").on(table.status),
    createdIdx: index("document_change_requests_created_idx").on(table.createdAt),
  }),
);

export const accessRequests = pgTable(
  "access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestedRole: varchar("requested_role", { length: 20 }).notNull().default("viewer"),
    message: text("message"),
    status: accessRequestStatusEnum("status").default("pending").notNull(),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("access_requests_workspace_idx").on(table.workspaceId),
    requesterIdx: index("access_requests_requester_idx").on(table.requestedByUserId),
    statusIdx: index("access_requests_status_idx").on(table.status),
    createdIdx: index("access_requests_created_idx").on(table.createdAt),
    uniquePendingRequest: uniqueIndex("access_requests_workspace_requester_pending_idx")
      .on(table.workspaceId, table.requestedByUserId)
      .where(sql`${table.status} = 'pending'`),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    icon: notificationIconTypeEnum("icon").default("system").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    read: boolean("read").default(false).notNull(),
    onEmail: boolean("on_email").default(false).notNull(),
    emailSentAt: timestamp("email_sent_at"),
    link: text("link"),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: uuid("resource_id"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("notifications_user_id_idx").on(table.userId),
    userReadIdx: index("notifications_user_read_idx").on(table.userId, table.read),
    createdIdx: index("notifications_created_at_idx").on(table.createdAt),
    resourceIdx: index("notifications_resource_idx").on(table.resourceType, table.resourceId),
  }),
);
