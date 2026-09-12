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
import { aiModelTaskEnum } from "./enums.js";
import { users } from "./identity.js";

export type AiModelCapabilities = {
  input: {
    text: boolean;
    image: boolean;
    pdf: boolean;
  };
  output: {
    text: boolean;
    structured: boolean;
    toolCalls: boolean;
  };
  contextWindowTokens?: number;
  maxOutputTokens?: number;
};

export type AiModelTask = "main" | "title" | "tabular";

export const aiProviderConnections = pgTable(
  "ai_provider_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    credentialVersion: integer("credential_version").notNull(),
    credentialKeyId: varchar("credential_key_id", { length: 80 }).notNull(),
    encryptedCredential: text("encrypted_credential").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    baseUrl: text("base_url"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userNameIdx: uniqueIndex("ai_provider_connections_user_name_idx").on(table.userId, table.name),
    userProviderIdx: index("ai_provider_connections_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
  }),
);

export const aiProviderModels = pgTable(
  "ai_provider_models",
  {
    id: varchar("id", { length: 150 }).primaryKey(),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerModelId: varchar("provider_model_id", { length: 150 }).notNull(),
    connectionId: uuid("connection_id").references(() => aiProviderConnections.id, {
      onDelete: "cascade",
    }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 150 }).notNull(),
    capabilities: jsonb("capabilities").$type<AiModelCapabilities>().notNull(),
    tasks: jsonb("tasks").$type<AiModelTask[]>().notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    providerIdx: index("ai_provider_models_provider_idx").on(table.provider),
    connectionIdx: index("ai_provider_models_connection_idx").on(table.connectionId),
    ownerIdx: index("ai_provider_models_owner_idx").on(table.ownerUserId),
  }),
);

export const userAiPreferences = pgTable(
  "user_ai_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    task: aiModelTaskEnum("task").notNull(),
    connectionId: varchar("connection_id", { length: 150 }).notNull(),
    modelId: varchar("model_id", { length: 150 })
      .notNull()
      .references(() => aiProviderModels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userTaskIdx: uniqueIndex("user_ai_preferences_user_task_idx").on(table.userId, table.task),
    connectionIdx: index("user_ai_preferences_connection_idx").on(table.connectionId),
    modelIdx: index("user_ai_preferences_model_idx").on(table.modelId),
  }),
);
