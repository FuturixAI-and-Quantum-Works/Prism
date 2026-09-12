import {
  bigint,
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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./identity.js";
import { DEFAULT_DRIVE_STORAGE_LIMIT_BYTES } from "./shared.js";

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    storageAllocatedBytes: bigint("storage_allocated_bytes", {
      mode: "bigint",
    })
      .default(DEFAULT_DRIVE_STORAGE_LIMIT_BYTES)
      .notNull(),
    storageUsedBytes: bigint("storage_used_bytes", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("workspaces_owner_idx").on(table.ownerId),
  }),
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("viewer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("workspace_members_workspace_idx").on(table.workspaceId),
    userIdx: index("workspace_members_user_idx").on(table.userId),
    uniqueMember: uniqueIndex("workspace_members_unique_idx").on(table.workspaceId, table.userId),
  }),
);

export const driveFolders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    parentFolderId: uuid("parent_folder_id").references((): AnyPgColumn => driveFolders.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("folders_user_idx").on(table.userId),
    workspaceIdx: index("folders_workspace_idx").on(table.workspaceId),
    parentIdx: index("folders_parent_idx").on(table.parentFolderId),
    userParentIdx: index("folders_user_parent_idx").on(table.userId, table.parentFolderId),
    workspaceParentIdx: index("folders_workspace_parent_idx").on(
      table.workspaceId,
      table.parentFolderId,
    ),
  }),
);

export const driveFiles = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    folderId: uuid("folder_id").references(() => driveFolders.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    storagePath: varchar("storage_path", { length: 1000 }).notNull().unique(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    extension: varchar("extension", { length: 32 }),
    checksum: varchar("checksum", { length: 128 }),
    version: integer("version").default(1).notNull(),
    isPrimary: boolean("is_primary").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("files_user_idx").on(table.userId),
    workspaceIdx: index("files_workspace_idx").on(table.workspaceId),
    isPrimaryIdx: index("files_is_primary_idx").on(table.isPrimary),
    folderIdx: index("files_folder_idx").on(table.folderId),
    userFolderIdx: index("files_user_folder_idx").on(table.userId, table.folderId),
    workspaceFolderIdx: index("files_workspace_folder_idx").on(table.workspaceId, table.folderId),
    nameIdx: index("files_name_idx").on(table.name),
  }),
);

export const fileVersions = pgTable(
  "file_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => driveFiles.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    storagePath: varchar("storage_path", { length: 1000 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    checksum: varchar("checksum", { length: 128 }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fileIdx: index("file_versions_file_idx").on(table.fileId),
    uniqueVersion: uniqueIndex("file_versions_unique_idx").on(table.fileId, table.versionNumber),
  }),
);

export const fileActivity = pgTable(
  "file_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id").references(() => driveFiles.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 50 }).notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fileIdx: index("file_activity_file_idx").on(table.fileId),
    userIdx: index("file_activity_user_idx").on(table.userId),
    actionIdx: index("file_activity_action_idx").on(table.action),
  }),
);

export const workspaceActivity = pgTable(
  "workspace_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 50 }).notNull(),
    targetType: varchar("target_type", { length: 50 }),
    targetId: uuid("target_id"),
    targetName: varchar("target_name", { length: 500 }),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("workspace_activity_workspace_idx").on(table.workspaceId),
    userIdx: index("workspace_activity_user_idx").on(table.userId),
    actionIdx: index("workspace_activity_action_idx").on(table.action),
  }),
);
