import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const backendRoot = path.resolve(import.meta.dirname, "../..");
const drizzleDirectory = path.join(backendRoot, "drizzle");

describe("canonical database baseline", () => {
  it("contains one migration, one snapshot, and one journal entry", async () => {
    const [migrationFiles, metadataFiles, journalSource] = await Promise.all([
      readdir(drizzleDirectory),
      readdir(path.join(drizzleDirectory, "meta")),
      readFile(path.join(drizzleDirectory, "meta/_journal.json"), "utf8"),
    ]);
    const journal = JSON.parse(journalSource) as {
      entries: Array<{ idx: number; tag: string }>;
    };

    expect(migrationFiles.filter((file) => file.endsWith(".sql"))).toEqual([
      "0000_prism_baseline.sql",
    ]);
    expect(metadataFiles.filter((file) => file.endsWith("_snapshot.json"))).toEqual([
      "0000_snapshot.json",
    ]);
    expect(journal.entries).toEqual([
      expect.objectContaining({ idx: 0, tag: "0000_prism_baseline" }),
    ]);
  });

  it("contains the complete data-free schema", async () => {
    const sql = await readFile(path.join(drizzleDirectory, "0000_prism_baseline.sql"), "utf8");
    const tables = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);

    expect(tables).toHaveLength(73);
    expect(new Set(tables).size).toBe(73);
    expect(tables).toEqual(
      expect.arrayContaining([
        "users",
        "accounts",
        "sessions",
        "verifications",
        "rate_limits",
        "user_profiles",
        "approval_roles",
        "approval_policies",
        "approval_policy_rules",
        "ai_provider_models",
        "jobs",
        "job_attempts",
        "outbox_events",
        "compliance_runs",
        "compliance_run_events",
        "tabular_review_sources",
        "tabular_review_shares",
        "tabular_runs",
        "tabular_run_events",
        "workflows",
      ]),
    );
    expect(sql).toContain("documents_current_version_id_document_versions_id_fk");
    expect(sql).toContain("workflows_ownership_chk");
    expect(sql).toContain("templates_ownership_chk");
    expect(sql).toContain("tabular_review_shares_review_email_idx");
    expect(sql).not.toMatch(/"shared_with" jsonb/);
    expect(sql).not.toMatch(/CREATE TYPE "approval_role"/);
    expect(sql).not.toMatch(/CREATE TABLE "rulebook/);
    expect(sql).not.toContain('CREATE TABLE "user_api_keys"');
    expect(sql).not.toMatch(/\bINSERT\s+INTO\b/i);
  });
});
