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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  approvalRuleMatchTargetEnum,
  approvalStatusEnum,
  approvalSubjectTypeEnum,
} from "./enums.js";
import { users } from "./identity.js";

export const approvalRoles = pgTable(
  "approval_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 80 }).notNull().unique(),
    label: varchar("label", { length: 120 }).notNull(),
    description: text("description"),
    enabled: boolean("enabled").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    keyCheck: check("approval_roles_key_chk", sql`${table.key} ~ '^[a-z][a-z0-9_]{0,79}$'`),
    sortOrderCheck: check("approval_roles_sort_order_chk", sql`${table.sortOrder} >= 0`),
  }),
);

export const approvalApprovers = pgTable(
  "approval_approvers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: approvalSubjectTypeEnum("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    role: varchar("role", { length: 80 })
      .notNull()
      .references(() => approvalRoles.key, { onDelete: "restrict", onUpdate: "cascade" }),
    approverName: varchar("approver_name", { length: 255 }).notNull(),
    approverEmail: varchar("approver_email", { length: 255 }).notNull(),
    isRequired: boolean("is_required").default(false).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    subjectIdx: index("approval_approvers_subject_idx").on(table.subjectType, table.subjectId),
    roleIdx: index("approval_approvers_role_idx").on(table.role),
    uniqueSubjectRole: uniqueIndex("approval_approvers_subject_role_idx").on(
      table.subjectType,
      table.subjectId,
      table.role,
    ),
  }),
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: approvalSubjectTypeEnum("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    approverId: uuid("approver_id").references(() => approvalApprovers.id, {
      onDelete: "set null",
    }),
    role: varchar("role", { length: 80 })
      .notNull()
      .references(() => approvalRoles.key, { onDelete: "restrict", onUpdate: "cascade" }),
    approverName: varchar("approver_name", { length: 255 }).notNull(),
    approverEmail: varchar("approver_email", { length: 255 }).notNull(),
    status: approvalStatusEnum("status").default("pending").notNull(),
    token: varchar("token", { length: 128 }).notNull().unique(),
    decisionNote: text("decision_note"),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    subjectIdx: index("approval_requests_subject_idx").on(table.subjectType, table.subjectId),
    statusIdx: index("approval_requests_status_idx").on(table.status),
    tokenIdx: index("approval_requests_token_idx").on(table.token),
  }),
);

export const approvalRequestItems = pgTable(
  "approval_request_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => approvalRequests.id, { onDelete: "cascade" }),
    subjectType: approvalSubjectTypeEnum("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    role: varchar("role", { length: 80 })
      .notNull()
      .references(() => approvalRoles.key, { onDelete: "restrict", onUpdate: "cascade" }),
    itemType: varchar("item_type", { length: 50 }).notNull(),
    itemId: uuid("item_id"),
    title: varchar("title", { length: 500 }).notNull(),
    originalText: text("original_text"),
    newText: text("new_text"),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    requestIdx: index("approval_request_items_request_idx").on(table.requestId),
    subjectIdx: index("approval_request_items_subject_idx").on(table.subjectType, table.subjectId),
    roleIdx: index("approval_request_items_role_idx").on(table.role),
  }),
);

export const approvalPolicies = pgTable(
  "approval_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    subjectType: approvalSubjectTypeEnum("subject_type").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    defaultSubjectIdx: uniqueIndex("approval_policies_default_subject_idx")
      .on(table.subjectType)
      .where(sql`${table.isDefault}`),
    creatorIdx: index("approval_policies_creator_idx").on(table.createdByUserId),
  }),
);

export const approvalPolicyRules = pgTable(
  "approval_policy_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 120 }).notNull().unique(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => approvalPolicies.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 80 })
      .notNull()
      .references(() => approvalRoles.key, { onDelete: "restrict", onUpdate: "cascade" }),
    matchTarget: approvalRuleMatchTargetEnum("match_target").notNull(),
    pattern: text("pattern").notNull(),
    flags: varchar("flags", { length: 10 }).default("i").notNull(),
    description: text("description").notNull(),
    priority: integer("priority").default(0).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    policyIdx: index("approval_policy_rules_policy_idx").on(table.policyId),
    roleIdx: index("approval_policy_rules_role_idx").on(table.role),
    keyCheck: check(
      "approval_policy_rules_key_chk",
      sql`${table.key} ~ '^[a-z][a-z0-9_.-]{0,119}$'`,
    ),
    patternLengthCheck: check(
      "approval_policy_rules_pattern_length_chk",
      sql`char_length(${table.pattern}) BETWEEN 1 AND 2000`,
    ),
    flagsCheck: check("approval_policy_rules_flags_chk", sql`${table.flags} ~ '^[imsu]*$'`),
    priorityCheck: check("approval_policy_rules_priority_chk", sql`${table.priority} >= 0`),
  }),
);
