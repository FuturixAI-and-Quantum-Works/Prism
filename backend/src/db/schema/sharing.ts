import { check, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { shareInvitationStatusEnum, shareResourceTypeEnum, shareRoleEnum } from "./enums.js";
import { documents } from "./documents.js";
import { users } from "./identity.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const shareInvitations = pgTable(
  "share_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    resourceType: shareResourceTypeEnum("resource_type").notNull(),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    email: varchar("email", { length: 255 }).notNull(),
    role: shareRoleEnum("role").notNull(),
    status: shareInvitationStatusEnum("status").default("pending").notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("share_invitations_token_idx").on(table.tokenHash),
    documentIdx: index("share_invitations_document_idx").on(table.documentId),
    projectIdx: index("share_invitations_project_idx").on(table.projectId),
    workspaceIdx: index("share_invitations_workspace_idx").on(table.workspaceId),
    emailIdx: index("share_invitations_email_idx").on(table.email),
    statusIdx: index("share_invitations_status_idx").on(table.status),
    resourceCheck: check(
      "share_invitations_one_resource_chk",
      sql`(
        ${table.resourceType} = 'document'
        AND ${table.documentId} IS NOT NULL
        AND ${table.projectId} IS NULL
        AND ${table.workspaceId} IS NULL
      ) OR (
        ${table.resourceType} = 'project'
        AND ${table.documentId} IS NULL
        AND ${table.projectId} IS NOT NULL
        AND ${table.workspaceId} IS NULL
      ) OR (
        ${table.resourceType} = 'workspace'
        AND ${table.documentId} IS NULL
        AND ${table.projectId} IS NULL
        AND ${table.workspaceId} IS NOT NULL
      )`,
    ),
  }),
);
