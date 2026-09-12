import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AI_MODEL_CATALOG, validateAiCatalog } from "../../src/scripts/seedAiCatalog.js";
import {
  CORE_TEMPLATES,
  TEMPLATE_SEED_PACKS,
  validateCoreTemplates,
} from "../../src/scripts/seedTemplates.js";
import {
  assertUniqueTemplateIds,
  templatePackSchema,
} from "../../src/scripts/templateSeedPacks.js";

describe("seed catalogs", () => {
  it("matches every supported AI model without credentials", () => {
    expect(() => validateAiCatalog()).not.toThrow();
    expect(new Set(AI_MODEL_CATALOG.map(({ id }) => id)).size).toBe(AI_MODEL_CATALOG.length);
    expect(new Set(AI_MODEL_CATALOG.map(({ provider }) => provider))).toEqual(
      new Set(["anthropic", "google", "openai"]),
    );
    expect(JSON.stringify(AI_MODEL_CATALOG)).not.toMatch(/api[-_]?key|secret|token/i);
  });

  it("loads schema-valid, honestly labeled seed packs", () => {
    expect(() => validateCoreTemplates()).not.toThrow();
    expect(TEMPLATE_SEED_PACKS.every((pack) => templatePackSchema.safeParse(pack).success)).toBe(
      true,
    );
    expect(
      templatePackSchema.safeParse({
        schemaVersion: 1,
        key: "invalid-pack",
        label: "",
        jurisdictionScope: { kind: "neutral", governingLawOptions: [] },
        templates: [],
      }).success,
    ).toBe(false);
    expect(
      TEMPLATE_SEED_PACKS.map(({ key, label, jurisdictionScope }) => ({
        key,
        label,
        kind: jurisdictionScope.kind,
      })),
    ).toEqual([
      {
        key: "core-neutral",
        label: "Core templates with selectable governing law",
        kind: "neutral",
      },
    ]);
  });

  it("preserves stable keys and HTML bodies", () => {
    expect(CORE_TEMPLATES).toHaveLength(7);
    expect(CORE_TEMPLATES.map(({ id }) => `core-${id}`)).toEqual([
      "core-nda",
      "core-employment",
      "core-service",
      "core-privacy",
      "core-partnership",
      "core-lease",
      "core-consulting",
    ]);
    expect(CORE_TEMPLATES.every(({ fields }) => fields.length > 0)).toBe(true);
    expect(CORE_TEMPLATES.every(({ templateContent }) => templateContent.startsWith("<div"))).toBe(
      true,
    );
  });

  it("rejects duplicate template stable keys", () => {
    expect(() => assertUniqueTemplateIds([CORE_TEMPLATES[0], CORE_TEMPLATES[0]])).toThrow(
      "Duplicate template stable key: nda",
    );
  });

  it("preserves the seeded template records", () => {
    const records = CORE_TEMPLATES.map((template) => ({
      stableKey: `core-${template.id}`,
      userId: null,
      name: template.name,
      category: template.category,
      description: template.description,
      contentHtml: template.templateContent.trim(),
      fields: template.fields,
      isCreatedByUser: false,
    }));

    expect(createHash("sha256").update(JSON.stringify(records)).digest("hex")).toBe(
      "d7d63b48663130c82d3abc9e82883a04e2c7e1071ad1bc307d0bd29be30d1369",
    );
  });
});
