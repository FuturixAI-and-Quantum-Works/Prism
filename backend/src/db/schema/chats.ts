import { index, jsonb, pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { users } from "./identity.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const chatSessions = pgTable(
  "chat_sessions",
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
    title: varchar("title", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("chat_sessions_user_idx").on(table.userId),
    projectIdx: index("chat_sessions_project_idx").on(table.projectId),
    workspaceIdx: index("chat_sessions_workspace_idx").on(table.workspaceId),
    updatedAtIdx: index("chat_sessions_updated_at_idx").on(table.updatedAt),
  }),
);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => chatSessions.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("chats_user_idx").on(table.userId),
    projectIdx: index("chats_project_idx").on(table.projectId),
    workspaceIdx: index("chats_workspace_idx").on(table.workspaceId),
    sessionIdx: index("chats_session_idx").on(table.sessionId),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull(),
    content: text("content"),
    files: jsonb("files"),
    workflow: jsonb("workflow"),
    annotations: jsonb("annotations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    chatIdx: index("chat_messages_chat_idx").on(table.chatId),
  }),
);

export const chatInterviewState = pgTable("chat_interview_state", {
  chatId: uuid("chat_id")
    .primaryKey()
    .references(() => chats.id, { onDelete: "cascade" }),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
