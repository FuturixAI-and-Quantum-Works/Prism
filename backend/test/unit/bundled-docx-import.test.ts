import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  analyzeDocxTemplate,
  checksumBuffer,
  DOCX_TEMPLATE_MIME,
  fillDocxTemplate,
} from "../../src/lib/docxTemplateAnalyzer.js";
import { closeStorage, configureStorage } from "../../src/lib/storage.js";
import {
  loadAccessibleTemplates,
  loadDocxTemplateSource,
  normalizeTemplateFields,
} from "../../src/lib/templateDocuments.js";
import {
  BUNDLED_DOCX_DIRECTORY,
  seedBundledDocxTemplates,
} from "../../src/scripts/seedBundledDocxTemplates.js";
import { seedTemplates } from "../../src/scripts/seedTemplates.js";

const { pglite, database } = await vi.hoisted(async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../src/db/schema/index.js");
  const pglite = new PGlite();
  return { pglite, database: drizzle(pglite, { schema }) };
});

vi.mock("../../src/db/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/db/index.js")>()),
  db: database,
}));

const readerId = "00000000-0000-4000-8000-000000000001";

describe("bundled DOCX import with SQL and local object storage", () => {
  let storageDirectory: string | undefined;

  beforeAll(async () => {
    const baseline = await readFile(
      new URL("../../drizzle/0000_prism_baseline.sql", import.meta.url),
      "utf8",
    );
    await pglite.exec(baseline.replaceAll("--> statement-breakpoint", ""));
    storageDirectory = await mkdtemp(path.join(os.tmpdir(), "prism-bundled-docx-"));
    configureStorage(
      { kind: "local", directory: storageDirectory, publicApiUrl: "http://localhost:3000" },
      "bundled-docx-test-only-signing-secret",
    );
  }, 15_000);

  afterAll(async () => {
    closeStorage();
    try {
      await pglite.close();
    } finally {
      if (storageDirectory) await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("imports 61 system templates idempotently with reusable original DOCX sources", async () => {
    await seedTemplates();
    await expect(seedBundledDocxTemplates()).resolves.toBe(54);
    const firstImport = await loadAccessibleTemplates(readerId);
    expect(firstImport).toHaveLength(61);

    await expect(seedBundledDocxTemplates()).resolves.toBe(54);
    const secondImport = await loadAccessibleTemplates(readerId);
    expect(secondImport).toHaveLength(61);
    expect(new Set(secondImport.map(({ stableKey }) => stableKey)).size).toBe(61);
    expect(new Map(secondImport.map(({ stableKey, id }) => [stableKey, id]))).toEqual(
      new Map(firstImport.map(({ stableKey, id }) => [stableKey, id])),
    );
    for (const template of secondImport) {
      expect(template.userId).toBeNull();
      expect(template.isCreatedByUser).toBe(false);
      expect(template.stableKey).toMatch(/^(core-|docx-futurixai-legal-)/);
      expect(template.contentHtml).toContain("<");
    }

    const core = secondImport.filter(({ stableKey }) => stableKey?.startsWith("core-"));
    expect(core).toHaveLength(7);
    expect(new Map(core.map((template) => [template.stableKey, template]))).toEqual(
      new Map(
        firstImport
          .filter(({ stableKey }) => stableKey?.startsWith("core-"))
          .map((template) => [template.stableKey, template]),
      ),
    );

    const bundled = secondImport.filter(
      ({ sourceMimeType }) => sourceMimeType === DOCX_TEMPLATE_MIME,
    );
    expect(bundled).toHaveLength(54);
    expect(new Set(bundled.map(({ sourceChecksum }) => sourceChecksum)).size).toBe(54);
    for (const template of bundled) {
      expect(template.sourceStoragePath).toMatch(/^templates\/system\/[a-f0-9]{16}\//);
      expect(template.sourceFilename).toBeTruthy();
      const original = await readFile(path.join(BUNDLED_DOCX_DIRECTORY, template.sourceFilename!));
      const stored = await loadDocxTemplateSource(template);
      expect(stored.equals(original), template.sourceFilename ?? template.name).toBe(true);
      expect(checksumBuffer(stored)).toBe(template.sourceChecksum);
    }

    const rent = bundled.find(({ name }) => name === "Rent Agreement");
    expect(rent).toBeDefined();
    if (!rent) throw new Error("The imported rent agreement is missing");
    const stored = await loadDocxTemplateSource(rent);
    const values = Object.fromEntries(
      normalizeTemplateFields(rent.fields).map(({ id }) => [id, `Prism acceptance & <${id}>`]),
    );
    const filled = await fillDocxTemplate(stored, values);
    const generated = await analyzeDocxTemplate(filled.bytes, "completed-rent-agreement.docx");
    expect(generated.fields).toEqual([]);
    expect(generated.previewHtml).toContain("Prism acceptance &amp; &lt;LICENSOR_NAME&gt;");
    expect(generated.metadata.document.tables).toBe(5);
    expect(filled.replacements.LICENSOR_NAME).toBeGreaterThan(0);
    expect(await loadDocxTemplateSource(rent)).toEqual(stored);
  }, 30_000);
});
