import {
  boolean,
  check,
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
import { users } from "./identity.js";

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stableKey: varchar("stable_key", { length: 100 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    promptMd: text("prompt_md"),
    columnsConfig: jsonb("columns_config"),
    practice: varchar("practice", { length: 255 }),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("workflows_user_idx").on(table.userId),
    stableKeyUnique: uniqueIndex("workflows_stable_key_unique_idx").on(table.stableKey),
    ownershipCheck: check(
      "workflows_ownership_chk",
      sql`(${table.isSystem} AND ${table.userId} IS NULL AND ${table.stableKey} IS NOT NULL)
        OR (NOT ${table.isSystem} AND ${table.userId} IS NOT NULL AND ${table.stableKey} IS NULL)`,
    ),
  }),
);

export const workflowShares = pgTable(
  "workflow_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    sharedByUserId: uuid("shared_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sharedWithEmail: varchar("shared_with_email", { length: 255 }).notNull(),
    allowEdit: boolean("allow_edit").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    workflowIdx: index("workflow_shares_workflow_idx").on(table.workflowId),
    uniqueShare: uniqueIndex("workflow_shares_unique_idx").on(
      table.workflowId,
      table.sharedWithEmail,
    ),
  }),
);

export const hiddenWorkflows = pgTable(
  "hidden_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueHidden: uniqueIndex("hidden_workflows_unique_idx").on(table.userId, table.workflowId),
  }),
);
