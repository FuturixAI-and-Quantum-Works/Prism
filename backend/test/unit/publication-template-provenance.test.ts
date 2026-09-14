import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { contentForLegacyBranding } from "../../../scripts/publication-template-provenance.mjs";

const repositoryName = ["legal", "CloneBE"].join("");
const sourcePrefix = `https://github.com/FuturixAI-and-Quantum-Works/${repositoryName}/blob/e7be6ac7480a5611e2f204382d20014cb8327861/backend/Templates/`;
const provenancePath = "docs/template-provenance.json";
const grantPath = "docs/template-license.md";
const templatePath = "backend/data/seed-packs/docx/v1/futurixai-legal/Example_Template.docx";
const templateBytes = Buffer.from("Rights-cleared template fixture");
const approvedEntry = {
  path: templatePath,
  source: `${sourcePrefix}Example_Template.docx`,
  author: "FuturixAI-and-Quantum-Works",
  license: "AGPL-3.0-only",
  redistributionGrant: grantPath,
  attribution: "FuturixAI-and-Quantum-Works. Licensed under AGPL-3.0-only.",
  sha256: createHash("sha256").update(templateBytes).digest("hex"),
};

describe("publication template provenance", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "prism-publication-test-"));
    mkdirSync(dirname(join(root, templatePath)), { recursive: true });
    mkdirSync(join(root, "docs"));
    writeFileSync(join(root, templatePath), templateBytes);
    writeFileSync(join(root, grantPath), "Owner-confirmed AGPL-3.0-only redistribution grant.");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const serialize = (entry: unknown = approvedEntry) =>
    JSON.stringify({ schemaVersion: 1, docx: [entry] }, null, 2);

  function scan(content = serialize(), path = provenancePath) {
    return contentForLegacyBranding(root, path, content, sourcePrefix);
  }

  it("allows a verified direct historical source without changing its attribution", () => {
    const original = serialize();
    const checked = scan(original);
    expect(checked).not.toContain(repositoryName);
    expect(checked).toContain(approvedEntry.attribution);
    expect(checked).toContain(approvedEntry.author);
    expect(original).toContain(approvedEntry.source);
    expect(scan(`${original}\n`)).toBe(checked);
  });

  it.each(["README.md", "docs/other.json", "features/templates/README.md"])(
    "does not exempt a historical source in %s",
    (path) => {
      const content = serialize();
      expect(scan(content, path)).toBe(content);
    },
  );

  it.each(["author", "attribution", "description", "redistributionGrant"])(
    "keeps historical branding in %s visible",
    (field) => {
      expect(scan(serialize({ ...approvedEntry, [field]: approvedEntry.source }))).toContain(
        repositoryName,
      );
    },
  );

  it("does not exempt source values outside the direct template entries", () => {
    for (const metadata of [
      { source: approvedEntry.source },
      { metadata: { source: approvedEntry.source } },
      { attribution: approvedEntry.source },
    ]) {
      const content = JSON.stringify({ schemaVersion: 1, docx: [approvedEntry], ...metadata });
      expect(scan(content)).toContain(repositoryName);
    }
    expect(
      scan(serialize({ ...approvedEntry, metadata: { source: approvedEntry.source } })),
    ).toContain(repositoryName);
  });

  it("keeps other legacy terms in the same entry visible", () => {
    for (const term of ["legal" + "be", "legal" + "ity", "zero" + "desk"]) {
      expect(scan(serialize({ ...approvedEntry, description: term }))).toContain(term);
    }
  });

  it.each([
    ["path", "backend/data/seed-packs/docx/v1/futurixai-legal/Other_Template.docx"],
    ["path", "backend/data/seed-packs/docx/v1/futurixai-legal/nested/Example_Template.docx"],
    ["path", "backend/data/seed-packs/docx/v1/futurixai-legal/../Example_Template.docx"],
    ["path", "backend/data/seed-packs/docx/v1/futurixai-legal/nested%2FExample_Template.docx"],
    ["path", "backend/data/seed-packs/docx/v1/futurixai-legal/nested\\Example_Template.docx"],
    ["path", "backend/Templates/Example_Template.docx"],
    ["author", "Another author"],
    ["license", "MIT"],
    ["redistributionGrant", "docs/other-license.md"],
    ["attribution", " "],
    ["sha256", "not-a-checksum"],
    ["sha256", "0".repeat(64)],
  ])("does not exempt invalid %s metadata: %s", (field, value) => {
    expect(scan(serialize({ ...approvedEntry, [field]: value }))).toContain(repositoryName);
  });

  it.each(Object.keys(approvedEntry))("requires the %s provenance field", (field) => {
    const entry = { ...approvedEntry } as Record<string, string>;
    delete entry[field];
    const content = serialize(entry);
    expect(scan(content)).toBe(content);
  });

  it.each([
    `${approvedEntry.source}?raw=1`,
    `${approvedEntry.source}#fragment`,
    `prefix:${approvedEntry.source}`,
    `${approvedEntry.source}/suffix`,
    approvedEntry.source.replace("github.com/", "github.com.evil.example/"),
    approvedEntry.source.replace("github.com/", "github.com@evil.example/"),
    approvedEntry.source.replace("https://", "http://"),
    approvedEntry.source.replace("e7be6ac7480a5611e2f204382d20014cb8327861", "main"),
    approvedEntry.source.replace("e7be6ac7480a5611e2f204382d20014cb8327861", "0".repeat(40)),
    approvedEntry.source.replace("/backend/Templates/", "/backend%2FTemplates/"),
    approvedEntry.source.replace("/backend/Templates/", "/backend/./Templates/"),
    approvedEntry.source.replace("Example_Template", "%45xample_Template"),
    approvedEntry.source.replace("Example_Template", "Other_Template"),
  ])("does not exempt a noncanonical source URL: %s", (source) => {
    expect(scan(serialize({ ...approvedEntry, source }))).toContain(repositoryName);
  });

  it("fails closed on duplicate or escaped JSON keys", () => {
    const entry = JSON.stringify(approvedEntry);
    const sourceField = `"source":${JSON.stringify(approvedEntry.source)}`;
    const duplicateSource = entry.replace(sourceField, `${sourceField},${sourceField}`);
    const escapedSource = entry.replace('"source"', '"sour\\u0063e"');
    const shadowedDocx = `{"docx":[{"source":${JSON.stringify(approvedEntry.source)}}],"schemaVersion":1,"docx":[${entry}]}`;
    for (const content of [
      `{"schemaVersion":1,"docx":[${duplicateSource}]}`,
      `{"schemaVersion":1,"docx":[${escapedSource}]}`,
      shadowedDocx,
    ]) {
      expect(scan(content)).toContain(repositoryName);
    }
  });

  it("fails closed on malformed JSON or a different provenance schema", () => {
    for (const content of [
      serialize().slice(0, -1),
      JSON.stringify({ schemaVersion: 2, docx: [approvedEntry] }),
      JSON.stringify({ schemaVersion: 1, docx: approvedEntry }),
    ]) {
      expect(scan(content)).toContain(repositoryName);
    }
  });

  it("requires the redistributed bytes and the grant file to exist", () => {
    rmSync(join(root, templatePath));
    expect(scan()).toContain(repositoryName);
    writeFileSync(join(root, templatePath), templateBytes);
    rmSync(join(root, grantPath));
    expect(scan()).toContain(repositoryName);
  });

  it("rejects modified bytes even when the provenance SHA-256 is well formed", () => {
    writeFileSync(join(root, templatePath), "Modified content");
    expect(scan()).toContain(repositoryName);
  });

  it("requires an exact destination filename even if a newline-suffixed file exists", () => {
    const path = `${templatePath}\n`;
    writeFileSync(join(root, path), templateBytes);
    expect(scan(serialize({ ...approvedEntry, path }))).toContain(repositoryName);
  });
});
