import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { healthCheckStatusEnum } from "./enums.js";

export const serviceHealthChecks = pgTable(
  "service_health_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceName: varchar("service_name", { length: 100 }).notNull(),
    status: healthCheckStatusEnum("status").notNull(),
    responseTimeMs: integer("response_time_ms"),
    errorMessage: text("error_message"),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    serviceNameIdx: index("service_health_checks_service_name_idx").on(table.serviceName),
    checkedAtIdx: index("service_health_checks_checked_at_idx").on(table.checkedAt),
    serviceCheckedIdx: index("service_health_checks_service_checked_idx").on(
      table.serviceName,
      table.checkedAt,
    ),
  }),
);
