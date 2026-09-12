import {
  boolean,
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
import { ragScopeTypeEnum, ragSourceStatusEnum, ragSourceTypeEnum } from "./enums.js";
import { users } from "./identity.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const ragCollections = pgTable(
  "rag_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: ragScopeTypeEnum("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    collectionName: varchar("collection_name", { length: 255 }).notNull().unique(),
    displayName: varchar("display_name", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    scopeIdx: uniqueIndex("rag_collections_scope_idx").on(table.scopeType, table.scopeId),
    ownerIdx: index("rag_collections_owner_idx").on(table.ownerUserId),
  }),
);

export const ragSourceIndexEntries = pgTable(
  "rag_source_index_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id").references(() => ragCollections.id, {
      onDelete: "cascade",
    }),
    scopeType: ragScopeTypeEnum("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    sourceType: ragSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    versionId: uuid("version_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    filename: varchar("filename", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    storagePath: varchar("storage_path", { length: 1000 }).notNull(),
    checksum: varchar("checksum", { length: 128 }),
    status: ragSourceStatusEnum("status").default("pending").notNull(),
    lastError: text("last_error"),
    lastErrorCode: varchar("last_error_code", { length: 80 }),
    lastErrorCategory: varchar("last_error_category", { length: 80 }),
    lastErrorDetails: jsonb("last_error_details"),
    retryable: boolean("retryable").default(false).notNull(),
    retryAfterSeconds: integer("retry_after_seconds"),
    indexedAt: timestamp("indexed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    collectionIdx: index("rag_source_index_entries_collection_idx").on(table.collectionId),
    scopeIdx: index("rag_source_index_entries_scope_idx").on(table.scopeType, table.scopeId),
    sourceIdx: index("rag_source_index_entries_source_idx").on(table.sourceType, table.sourceId),
    projectIdx: index("rag_source_index_entries_project_idx").on(table.projectId),
    workspaceIdx: index("rag_source_index_entries_workspace_idx").on(table.workspaceId),
    statusIdx: index("rag_source_index_entries_status_idx").on(table.status),
    uniqueSourceVersion: uniqueIndex("rag_source_index_entries_source_version_idx").on(
      table.sourceType,
      table.sourceId,
      table.versionId,
    ),
  }),
);
