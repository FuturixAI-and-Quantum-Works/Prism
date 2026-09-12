import {
  bigint,
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
import { authEmailStatusEnum } from "./enums.js";
import { DEFAULT_DRIVE_STORAGE_LIMIT_BYTES } from "./shared.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    issuer: text("issuer").notNull(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    accountIdentityIdx: uniqueIndex("accounts_issuer_account_id_idx").on(
      table.issuer,
      table.accountId,
    ),
    userIdx: index("accounts_user_idx").on(table.userId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
  }),
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    identifierIdx: index("verifications_identifier_idx").on(table.identifier),
  }),
);

export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").default(0).notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 255 }),
    country: varchar("country", { length: 100 }),
    jurisdiction: varchar("jurisdiction", { length: 255 }),
    organization: varchar("organization", { length: 255 }),
    professionalRole: varchar("professional_role", { length: 100 }),
    role: varchar("role", { length: 20 }).default("viewer").notNull(),
    onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
    storageLimitBytes: bigint("storage_limit_bytes", { mode: "bigint" })
      .default(DEFAULT_DRIVE_STORAGE_LIMIT_BYTES)
      .notNull(),
    storageUsedBytes: bigint("storage_used_bytes", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    messageCreditsUsed: integer("message_credits_used").default(0).notNull(),
    creditsResetDate: timestamp("credits_reset_date"),
    tier: varchar("tier", { length: 50 }).default("Free").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    roleCheck: check(
      "user_profiles_role_check",
      sql`${table.role} in ('admin', 'editor', 'viewer')`,
    ),
    storageUsedCheck: check(
      "user_profiles_storage_used_check",
      sql`${table.storageUsedBytes} >= 0`,
    ),
    storageLimitCheck: check(
      "user_profiles_storage_limit_check",
      sql`${table.storageLimitBytes} >= 0`,
    ),
    creditsUsedCheck: check(
      "user_profiles_message_credits_used_check",
      sql`${table.messageCreditsUsed} >= 0`,
    ),
  }),
);

export const authEmailEvents = pgTable(
  "auth_email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    template: varchar("template", { length: 120 }).notNull(),
    triggerType: varchar("trigger_type", { length: 120 }).notNull(),
    status: authEmailStatusEnum("status").default("pending").notNull(),
    resendMessageId: varchar("resend_message_id", { length: 255 }),
    error: text("error"),
    retryCount: integer("retry_count").default(0).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    recipientIdx: index("auth_email_events_recipient_idx").on(table.recipient),
    statusIdx: index("auth_email_events_status_idx").on(table.status),
    createdIdx: index("auth_email_events_created_idx").on(table.createdAt),
  }),
);
