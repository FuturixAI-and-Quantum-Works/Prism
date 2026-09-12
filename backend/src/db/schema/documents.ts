import {
  boolean,
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
import {
  documentAiLabelEnum,
  documentChatRoleBadgeEnum,
  documentEmailStatusEnum,
  documentLifecycleStatusEnum,
  documentRoleEnum,
  shareRoleEnum,
} from "./enums.js";
import { users } from "./identity.js";
import { projects, projectSubfolders } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => projectSubfolders.id, {
      onDelete: "set null",
    }),
    filename: varchar("filename", { length: 500 }).notNull(),
    fileType: varchar("file_type", { length: 20 }),
    sizeBytes: integer("size_bytes"),
    pageCount: integer("page_count"),
    structureTree: jsonb("structure_tree"),
    status: varchar("status", { length: 50 }).default("processing"),
    lifecycleStatus: documentLifecycleStatusEnum("lifecycle_status").default("DRAFT").notNull(),
    currentVersionId: uuid("current_version_id").references(
      (): AnyPgColumn => documentVersions.id,
      { onDelete: "set null" },
    ),
    attached: boolean("attached").default(false).notNull(),
    isPrimary: boolean("is_primary").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("documents_project_idx").on(table.projectId),
    workspaceIdx: index("documents_workspace_idx").on(table.workspaceId),
    userIdx: index("documents_user_idx").on(table.userId),
    attachedIdx: index("documents_attached_idx").on(table.attached),
    isPrimaryIdx: index("documents_is_primary_idx").on(table.isPrimary),
    projectWorkspaceCheck: check(
      "documents_project_workspace_exclusive_chk",
      sql`${table.projectId} IS NULL OR ${table.workspaceId} IS NULL`,
    ),
  }),
);

export const documentContextFiles = pgTable(
  "document_context_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    contextDocumentId: uuid("context_document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_context_files_document_idx").on(table.documentId),
    contextIdx: index("document_context_files_context_idx").on(table.contextDocumentId),
    uniqueContext: uniqueIndex("document_context_files_unique_idx").on(
      table.documentId,
      table.contextDocumentId,
    ),
  }),
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    storagePath: varchar("storage_path", { length: 1000 }).notNull(),
    pdfStoragePath: varchar("pdf_storage_path", { length: 1000 }),
    source: varchar("source", { length: 50 }),
    versionNumber: integer("version_number"),
    displayName: varchar("display_name", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_versions_document_idx").on(table.documentId),
  }),
);

export const documentEdits = pgTable(
  "document_edits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => documentVersions.id, {
      onDelete: "cascade",
    }),
    changeId: varchar("change_id", { length: 100 }).notNull(),
    delWId: varchar("del_w_id", { length: 100 }),
    insWId: varchar("ins_w_id", { length: 100 }),
    deletedText: text("deleted_text"),
    insertedText: text("inserted_text"),
    contextBefore: text("context_before"),
    contextAfter: text("context_after"),
    reason: text("reason"),
    status: varchar("status", { length: 50 }).default("pending"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_edits_document_idx").on(table.documentId),
  }),
);

export const documentPlaceholderValues = pgTable(
  "document_placeholder_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    fieldKey: varchar("field_key", { length: 120 }).notNull(),
    value: text("value").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_placeholder_values_document_idx").on(table.documentId),
    fieldIdx: index("document_placeholder_values_field_idx").on(table.fieldKey),
    documentFieldIdx: uniqueIndex("document_placeholder_values_document_field_idx").on(
      table.documentId,
      table.fieldKey,
    ),
  }),
);

export const documentComments = pgTable(
  "document_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => documentVersions.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    parentCommentId: uuid("parent_comment_id").references((): AnyPgColumn => documentComments.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    anchorText: text("anchor_text"),
    anchorStart: integer("anchor_start"),
    anchorEnd: integer("anchor_end"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    resolved: boolean("resolved").default(false).notNull(),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_comments_document_idx").on(table.documentId),
    versionIdx: index("document_comments_version_idx").on(table.versionId),
    parentIdx: index("document_comments_parent_idx").on(table.parentCommentId),
    userIdx: index("document_comments_user_idx").on(table.userId),
  }),
);

export const documentActivity = pgTable(
  "document_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 80 }).notNull(),
    targetType: varchar("target_type", { length: 50 }),
    targetId: uuid("target_id"),
    targetName: varchar("target_name", { length: 500 }),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_activity_document_idx").on(table.documentId),
    userIdx: index("document_activity_user_idx").on(table.userId),
    actionIdx: index("document_activity_action_idx").on(table.action),
  }),
);

export const documentMembers = pgTable(
  "document_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    email: varchar("email", { length: 255 }),
    role: documentRoleEnum("role").notNull(),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_members_document_idx").on(table.documentId),
    userIdx: index("document_members_user_idx").on(table.userId),
    emailIdx: index("document_members_email_idx").on(table.email),
    uniqueDocumentUser: uniqueIndex("document_members_document_user_idx")
      .on(table.documentId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueDocumentEmail: uniqueIndex("document_members_document_email_idx")
      .on(table.documentId, table.email)
      .where(sql`${table.email} IS NOT NULL`),
  }),
);

export const documentChatMessages = pgTable(
  "document_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    userName: varchar("user_name", { length: 255 }),
    userEmail: varchar("user_email", { length: 255 }),
    roleBadge: documentChatRoleBadgeEnum("role_badge").notNull(),
    aiLabel: documentAiLabelEnum("ai_label"),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    emailNotification: jsonb("email_notification"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_chat_messages_document_idx").on(table.documentId),
    createdIdx: index("document_chat_messages_created_idx").on(table.createdAt),
  }),
);

export const documentStateTransitions = pgTable(
  "document_state_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    fromStatus: documentLifecycleStatusEnum("from_status"),
    toStatus: documentLifecycleStatusEnum("to_status").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_state_transitions_document_idx").on(table.documentId),
    createdIdx: index("document_state_transitions_created_idx").on(table.createdAt),
  }),
);

export const documentEmailEvents = pgTable(
  "document_email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    template: varchar("template", { length: 120 }).notNull(),
    triggerType: varchar("trigger_type", { length: 120 }).notNull(),
    status: documentEmailStatusEnum("status").default("pending").notNull(),
    resendMessageId: varchar("resend_message_id", { length: 255 }),
    error: text("error"),
    retryCount: integer("retry_count").default(0).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_email_events_document_idx").on(table.documentId),
    recipientIdx: index("document_email_events_recipient_idx").on(table.recipient),
    statusIdx: index("document_email_events_status_idx").on(table.status),
  }),
);

export const documentShares = pgTable(
  "document_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    email: varchar("email", { length: 255 }).notNull(),
    role: shareRoleEnum("role").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_shares_document_idx").on(table.documentId),
    userIdx: index("document_shares_user_idx").on(table.userId),
    emailIdx: index("document_shares_email_idx").on(table.email),
    uniqueDocumentUser: uniqueIndex("document_shares_document_user_idx")
      .on(table.documentId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueDocumentEmail: uniqueIndex("document_shares_document_email_idx").on(
      table.documentId,
      table.email,
    ),
  }),
);
