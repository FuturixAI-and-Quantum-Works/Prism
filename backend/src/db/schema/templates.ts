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

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stableKey: varchar("stable_key", { length: 120 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description"),
    contentHtml: text("content_html").notNull(),
    fields: jsonb("fields"),
    sourceFilename: varchar("source_filename", { length: 500 }),
    sourceStoragePath: varchar("source_storage_path", { length: 1000 }),
    sourceMimeType: varchar("source_mime_type", { length: 255 }),
    sourceChecksum: varchar("source_checksum", { length: 128 }),
    sourceMetadata: jsonb("source_metadata"),
    isCreatedByUser: boolean("is_created_by_user").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    stableKeyIdx: uniqueIndex("templates_stable_key_idx").on(table.stableKey),
    userIdx: index("templates_user_idx").on(table.userId),
    categoryIdx: index("templates_category_idx").on(table.category),
    sourceFilenameIdx: index("templates_source_filename_idx").on(table.sourceFilename),
    isCreatedByUserIdx: index("templates_is_created_by_user_idx").on(table.isCreatedByUser),
    ownershipCheck: check(
      "templates_ownership_chk",
      sql`(${table.isCreatedByUser} AND ${table.userId} IS NOT NULL AND ${table.stableKey} IS NULL)
        OR (NOT ${table.isCreatedByUser} AND ${table.userId} IS NULL AND ${table.stableKey} IS NOT NULL)`,
    ),
  }),
);
