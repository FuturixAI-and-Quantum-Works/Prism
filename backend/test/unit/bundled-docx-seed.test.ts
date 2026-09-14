import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  analyzeDocxTemplate,
  checksumBuffer,
  DOCX_TEMPLATE_MIME,
  fillDocxTemplate,
} from "../../src/lib/docxTemplateAnalyzer.js";
import {
  BUNDLED_DOCX_DIRECTORY,
  BUNDLED_DOCX_IMPORT,
  validateBundledDocxTemplates,
} from "../../src/scripts/seedBundledDocxTemplates.js";
import { loadDocxTemplatePack } from "../../src/scripts/seedDocxTemplates.js";
import { CORE_TEMPLATES } from "../../src/scripts/seedTemplates.js";

describe("bundled DOCX templates", () => {
  let templates: Awaited<ReturnType<typeof loadDocxTemplatePack>>;

  beforeAll(async () => {
    templates = await loadDocxTemplatePack(BUNDLED_DOCX_DIRECTORY, BUNDLED_DOCX_IMPORT);
  });

  it("adds 54 distinct templates without replacing the seven core templates", () => {
    expect(templates).toHaveLength(54);
    expect(CORE_TEMPLATES).toHaveLength(7);
    expect(new Set(templates.map(({ sourceChecksum }) => sourceChecksum)).size).toBe(54);
    expect(
      new Set([
        ...CORE_TEMPLATES.map(({ id }) => `core-${id}`),
        ...templates.map(({ stableKey }) => stableKey),
      ]).size,
    ).toBe(61);

    expect(templates.map(({ stableKey }) => stableKey)).toContain(
      "docx-futurixai-legal-01-rent-agreement-template",
    );
    expect(templates.map(({ stableKey }) => stableKey)).toContain(
      "docx-futurixai-legal-legal-notice-cheque-bounce-sec138-ni-act-template",
    );
    for (const template of templates) {
      expect(template.stableKey).toMatch(/^docx-futurixai-legal-[a-z0-9-]+$/);
      expect(template.stableKey.length).toBeLessThanOrEqual(120);
      expect(template).toMatchObject({
        userId: null,
        category: "FuturixAI Legal Templates",
        isCreatedByUser: false,
        sourceMimeType: DOCX_TEMPLATE_MIME,
      });
      expect(template.description).toMatch(/^FuturixAI-owned DOCX template/);
    }
  });

  it("validates the complete bundled pack without a database or object store", async () => {
    await expect(validateBundledDocxTemplates()).resolves.toBe(54);
  });

  it("preserves the default operator import identity", async () => {
    const operatorTemplates = await loadDocxTemplatePack(BUNDLED_DOCX_DIRECTORY);
    expect(operatorTemplates).toHaveLength(54);
    expect(operatorTemplates[0]).toMatchObject({
      stableKey: "docx-operator-01-rent-agreement-template",
      name: "Rent Agreement",
      category: "Operator DOCX Templates",
    });
    expect(operatorTemplates[0].description).toMatch(/^Operator-supplied DOCX template/);
  });

  it("discovers guided fields and previews in every bundled document", () => {
    for (const template of templates) {
      expect(template.fields.length, template.sourceFilename).toBeGreaterThan(0);
      expect(template.contentHtml, template.sourceFilename).toContain("<p");
      expect(template.sourceMetadata.placeholders.splitAcrossXml, template.sourceFilename).toBe(0);
      expect(template.sourceMetadata.document.paragraphs).toBeGreaterThan(0);
    }

    const rent = templates.find(({ sourceFilename }) =>
      sourceFilename.startsWith("01_Rent_Agreement"),
    );
    expect(rent?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "LICENSOR_NAME",
          placeholder: "{{LICENSOR_NAME}}",
          required: true,
        }),
        expect.objectContaining({ id: "STAMP_CERTIFICATE_DATE", type: "date" }),
        expect.objectContaining({ id: "LICENSOR_ADDRESS", type: "address" }),
      ]),
    );
    expect(rent?.sourceMetadata.placeholders).toMatchObject({ unique: 113, occurrences: 123 });
    expect(rent?.sourceMetadata.document.tables).toBe(5);
  });

  it("fills every bundled document while preserving its structure and source bytes", async () => {
    for (const template of templates) {
      const sourcePath = path.join(BUNDLED_DOCX_DIRECTORY, template.sourceFilename);
      const source = await readFile(sourcePath);
      const values = Object.fromEntries(
        template.fields.map(({ id }) => [id, `Prism test & <${id}>`]),
      );
      const filled = await fillDocxTemplate(source, values);
      const generated = await analyzeDocxTemplate(filled.bytes, template.sourceFilename);

      expect(generated.fields, template.sourceFilename).toEqual([]);
      expect(generated.metadata.document, template.sourceFilename).toEqual(
        template.sourceMetadata.document,
      );
      for (const field of template.fields) {
        expect(filled.replacements[field.id], `${template.sourceFilename}: ${field.id}`).toBe(
          field.occurrences,
        );
      }
      expect(checksumBuffer(await readFile(sourcePath))).toBe(template.sourceChecksum);
    }
  }, 30_000);
});
