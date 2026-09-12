import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { DatabaseConfig } from "../config.js";
import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;

export type DatabaseLifecycle = Readonly<{
  database: Database;
  pool: Pool;
  close: () => Promise<void>;
}>;

let binding: DatabaseLifecycle | undefined;

function currentDatabase(): Database {
  if (!binding) throw new Error("Database has not been bound");
  return binding.database;
}

export function createDatabase(config: DatabaseConfig): DatabaseLifecycle {
  const pool = new Pool({
    connectionString: config.url,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    idleTimeoutMillis: config.idleTimeoutMs,
    query_timeout: config.queryTimeoutMs,
    statement_timeout: config.statementTimeoutMs,
  });
  const database = drizzle(pool, { schema });
  let closePromise: Promise<void> | undefined;
  return {
    database,
    pool,
    close() {
      closePromise ??= pool.end();
      return closePromise;
    },
  };
}

export function bindDatabase(database: DatabaseLifecycle): void {
  if (binding && binding !== database) throw new Error("Database is already bound");
  binding = database;
}

export const db: Database = new Proxy(Object.create(null), {
  get(_target, property) {
    const value = Reflect.get(currentDatabase(), property);
    return typeof value === "function" ? value.bind(currentDatabase()) : value;
  },
});

export * from "./schema/index.js";
