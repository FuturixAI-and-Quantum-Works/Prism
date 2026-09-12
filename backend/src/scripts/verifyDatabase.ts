import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { accounts, rateLimits, sessions, users, verifications } from "../db/schema/index.js";

const backendRoot = path.resolve(import.meta.dirname, "../..");
const repositoryRoot = path.resolve(backendRoot, "..");
const baselineDirectory = path.join(backendRoot, "drizzle");
const baselinePath = path.join(baselineDirectory, "0000_prism_baseline.sql");
const expectedAuthTables = {
  users,
  accounts,
  sessions,
  verifications,
  rateLimits,
} satisfies Record<string, PgTable>;

function run(command: string, args: string[], cwd = backendRoot): void {
  execFileSync(command, args, {
    cwd,
    env: {
      ...process.env,
      AUTH_OTP_SECRET: "2f6a94b86a843fa19ab17cc2f0552d2792c57649a7e76e3fd8181bf696bb5ab7",
      BETTER_AUTH_SECRET: "a141f0758946d062bdc96bb7bccbdf1ba2bc1f2e52f460ba214f5c34a363e84f",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/prism",
      NODE_ENV: "test",
    },
    stdio: "inherit",
  });
}

function normalizedStatements(sql: string): string[] {
  return sql
    .replaceAll("--> statement-breakpoint", "")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function compatibleSqlType(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value
      .replace(/^character varying(?:\(\d+\))?$/, "text")
      .replace(/^varchar(?:\(\d+\))?$/, "text");
  return normalize(left) === normalize(right);
}

async function verifyBetterAuthSchema(outputPath: string): Promise<void> {
  run(
    "npm",
    [
      "run",
      "generate:auth-schema",
      "--",
      "--config",
      "backend/src/auth/schema.ts",
      "--output",
      outputPath,
      "--yes",
    ],
    repositoryRoot,
  );

  const generated: unknown = await import(pathToFileURL(outputPath).href);
  assert(generated && typeof generated === "object", "Better Auth generated an invalid module");
  for (const [exportName, applicationTable] of Object.entries(expectedAuthTables)) {
    const generatedTable: unknown = Reflect.get(generated, exportName);
    assert(is(generatedTable, PgTable), `Better Auth did not generate ${exportName}`);
    const expected = getTableConfig(applicationTable);
    const actual = getTableConfig(generatedTable);
    assert.equal(actual.name, expected.name, `Better Auth table name mismatch for ${exportName}`);

    const expectedColumns = new Map(expected.columns.map((column) => [column.name, column]));
    for (const column of actual.columns) {
      const applicationColumn = expectedColumns.get(column.name);
      assert(applicationColumn, `Application schema is missing ${actual.name}.${column.name}`);
      assert.equal(
        applicationColumn.notNull,
        column.notNull,
        `Nullability mismatch for ${actual.name}.${column.name}`,
      );
      assert(
        compatibleSqlType(applicationColumn.getSQLType(), column.getSQLType()),
        `Type mismatch for ${actual.name}.${column.name}`,
      );
    }
  }
}

async function verifyBaselineInPGlite(sql: string): Promise<number> {
  const database = new PGlite();
  try {
    await database.exec(sql.replaceAll("--> statement-breakpoint", ""));
    const result = await database.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    assert.equal(result.rows.length, 73, "Baseline table count changed");
    assert(result.rows.some(({ table_name }) => table_name === "users"));
    assert(result.rows.some(({ table_name }) => table_name === "approval_policies"));
    assert(result.rows.some(({ table_name }) => table_name === "ai_provider_models"));
    assert(result.rows.some(({ table_name }) => table_name === "jobs"));
    assert(result.rows.some(({ table_name }) => table_name === "outbox_events"));
    assert(result.rows.some(({ table_name }) => table_name === "compliance_runs"));
    assert(result.rows.some(({ table_name }) => table_name === "compliance_run_events"));
    assert(result.rows.some(({ table_name }) => table_name === "tabular_review_shares"));
    const retiredColumns = await database.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name
       from information_schema.columns
       where table_name in ('projects', 'tabular_reviews')
         and column_name = 'shared_with'`,
    );
    assert.deepEqual(retiredColumns.rows, []);
    const emailStatuses = await database.query<{ enumlabel: string; typname: string }>(
      `select type.typname, value.enumlabel
       from pg_type type
       join pg_enum value on type.oid = value.enumtypid
       where type.typname in ('auth_email_status', 'document_email_status')
       order by type.typname, value.enumsortorder`,
    );
    assert.deepEqual(emailStatuses.rows, [
      { typname: "auth_email_status", enumlabel: "pending" },
      { typname: "auth_email_status", enumlabel: "sent" },
      { typname: "auth_email_status", enumlabel: "failed" },
      { typname: "auth_email_status", enumlabel: "suppressed" },
      { typname: "document_email_status", enumlabel: "pending" },
      { typname: "document_email_status", enumlabel: "sent" },
      { typname: "document_email_status", enumlabel: "failed" },
      { typname: "document_email_status", enumlabel: "suppressed" },
    ]);
    return result.rows.length;
  } finally {
    await database.close();
  }
}

async function main(): Promise<void> {
  const temporaryRoot = await mkdtemp(path.join(backendRoot, ".db-verify-"));
  try {
    run(path.join(repositoryRoot, "node_modules", ".bin", "drizzle-kit"), [
      "check",
      "--config",
      "drizzle.config.ts",
    ]);

    const generatedDirectory = path.join(temporaryRoot, "drizzle");
    const temporaryConfig = path.join(temporaryRoot, "drizzle.config.ts");
    await writeFile(
      temporaryConfig,
      [
        'import { defineConfig } from "drizzle-kit";',
        "export default defineConfig({",
        `  schema: ${JSON.stringify(path.join(backendRoot, "src/db/schema/index.ts"))},`,
        `  out: ${JSON.stringify(generatedDirectory)},`,
        '  dialect: "postgresql",',
        "});",
        "",
      ].join("\n"),
    );
    run(path.join(repositoryRoot, "node_modules", ".bin", "drizzle-kit"), [
      "generate",
      "--config",
      temporaryConfig,
    ]);

    const generatedFiles = await readdir(generatedDirectory);
    const generatedSqlFile = generatedFiles.find((filename) => filename.endsWith(".sql"));
    assert(generatedSqlFile, "Drizzle did not generate a baseline SQL file");
    const [checkedInSql, generatedSql] = await Promise.all([
      readFile(baselinePath, "utf8"),
      readFile(path.join(generatedDirectory, generatedSqlFile), "utf8"),
    ]);
    assert.deepEqual(
      normalizedStatements(generatedSql),
      normalizedStatements(checkedInSql),
      "Checked-in baseline differs from the current schema",
    );

    await verifyBetterAuthSchema(path.join(temporaryRoot, "better-auth-schema.ts"));
    const tableCount = await verifyBaselineInPGlite(checkedInSql);
    console.info(`Database baseline verified with ${tableCount} tables.`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error("Database verification failed.", error);
  process.exitCode = 1;
});
