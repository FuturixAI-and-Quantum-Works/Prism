import { describe, expect, it } from "vitest";
import {
  DocumentContentError,
  decodeDocumentContent,
  normalizeDocxZipPaths,
  withDocxPackage,
} from "../../src/modules/content/documentContent.js";
import { applyTrackedEdits } from "../../src/lib/docxTrackedChanges.js";
import { resolveTrackedChange } from "../../src/lib/docxTrackedChangeResolution.js";
import {
  analyzeDocxTemplate,
  fillDocxTemplate,
  renderDocxPreviewHtml,
} from "../../src/lib/docxTemplateAnalyzer.js";
import {
  extractDocxBodyText,
  extractTrackedChangeIds,
} from "../../src/lib/docxTrackedChangesXml.js";
import { extractDocumentMetadata } from "../../src/modules/documents/documents.metadata.js";
import {
  docxFixture,
  htmlFixture,
  pdfFixture,
  spreadsheetFixture,
  textFixture,
} from "../fixtures/documentContentFixtures.js";

describe("document content decoding", () => {
  it.each([
    {
      filename: "fixture.txt",
      bytes: textFixture,
      expected: "Plain text fixture",
    },
    {
      filename: "fixture.html",
      bytes: htmlFixture,
      expected: "Shared extraction & decoding.",
    },
    {
      filename: "fixture.pdf",
      bytes: pdfFixture,
      expected: "[Page 1]\nPDF fixture",
    },
    {
      filename: "fixture.xlsx",
      bytes: spreadsheetFixture,
      expected: "Sheet: Review\nClause,Owner\nTermination,Legal",
    },
  ])("extracts text from $filename", async ({ filename, bytes, expected }) => {
    const result = await decodeDocumentContent({
      bytes: bytes(),
      filename,
      output: "text",
    });

    expect(result.text).toContain(expected);
  });

  it("extracts DOCX text and HTML through explicit modes", async () => {
    const bytes = await docxFixture();
    const text = await decodeDocumentContent({
      bytes,
      filename: "fixture.docx",
      output: "text",
    });
    const html = await decodeDocumentContent({
      bytes,
      filename: "fixture.docx",
      output: "html",
    });

    expect(text.text).toContain("Agreement current terms");
    expect(html.html).toContain("Agreement");
  });

  it("rejects malformed structured input", async () => {
    await expect(
      decodeDocumentContent({
        bytes: Buffer.from("not a docx"),
        filename: "broken.docx",
        output: "text",
      }),
    ).rejects.toMatchObject<DocumentContentError>({
      name: "DocumentContentError",
      code: "malformed-input",
    });
  });

  it("rejects unsafe package paths and malformed document XML", async () => {
    const unsafe = await docxFixture({ documentPath: "../word/document.xml" });
    await expect(
      withDocxPackage({ bytes: unsafe }, async () => undefined),
    ).rejects.toMatchObject<DocumentContentError>({
      code: "malformed-input",
    });

    const colliding = await docxFixture({
      files: { "word\\document.xml": "<document />" },
    });
    await expect(
      withDocxPackage({ bytes: colliding }, async () => undefined),
    ).rejects.toMatchObject<DocumentContentError>({
      code: "malformed-input",
    });

    const malformedXml = await docxFixture({
      documentXml: "<w:document><w:body></w:document>",
    });
    await expect(
      decodeDocumentContent({
        bytes: malformedXml,
        filename: "malformed.docx",
        output: "text",
      }),
    ).rejects.toMatchObject<DocumentContentError>({
      code: "malformed-input",
    });

    const declaredEntity = await docxFixture({
      documentXml:
        '<?xml version="1.0"?><!DOCTYPE w:document [<!ENTITY value "unsafe">]><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>&value;</w:t></w:r></w:p></w:body></w:document>',
    });
    await expect(
      withDocxPackage({ bytes: declaredEntity }, async () => undefined),
    ).rejects.toMatchObject<DocumentContentError>({
      code: "malformed-input",
    });
  });

  it("bounds, cancels, and cleans up package access", async () => {
    const bytes = await docxFixture();
    await expect(
      withDocxPackage({ bytes, limits: { maxDocxXmlBytes: 16 } }, async () => undefined),
    ).rejects.toMatchObject<DocumentContentError>({
      code: "input-limit",
    });

    const controller = new AbortController();
    controller.abort();
    await expect(
      withDocxPackage({ bytes, signal: controller.signal }, async () => undefined),
    ).rejects.toMatchObject<DocumentContentError>({
      code: "aborted",
    });

    let readAfterCleanup: (() => Promise<string>) | undefined;
    await withDocxPackage({ bytes }, (docx) => {
      readAfterCleanup = () => docx.readXml(docx.documentPath);
    });
    await expect(readAfterCleanup?.()).rejects.toMatchObject<DocumentContentError>({
      code: "malformed-input",
    });
  });

  it("normalizes backslash package paths for lookup and output", async () => {
    const source = await docxFixture({ documentPath: "word\\document.xml" });
    await withDocxPackage({ bytes: source }, async (docx) => {
      expect(docx.normalizedPaths).toBe(true);
      await expect(docx.readXml("word/document.xml")).resolves.toContain("Agreement");
    });

    const normalized = await normalizeDocxZipPaths(source);
    await withDocxPackage({ bytes: normalized }, (docx) => {
      expect(docx.normalizedPaths).toBe(false);
      expect(docx.has("word/document.xml")).toBe(true);
    });
  });

  it("rejects input above the configured byte limit", async () => {
    await expect(
      decodeDocumentContent({
        bytes: textFixture(),
        filename: "fixture.txt",
        output: "text",
        limits: { maxInputBytes: 4 },
      }),
    ).rejects.toMatchObject<DocumentContentError>({
      name: "DocumentContentError",
      code: "input-limit",
    });
  });

  it("honors an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      decodeDocumentContent({
        bytes: pdfFixture(),
        filename: "fixture.pdf",
        output: "text",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject<DocumentContentError>({
      name: "DocumentContentError",
      code: "aborted",
    });
  });

  it("returns PDF and DOCX metadata", async () => {
    const pdf = await extractDocumentMetadata(pdfFixture(), "pdf");
    const docx = await extractDocumentMetadata(await docxFixture(), "docx");

    expect(pdf.pageCount).toBe(1);
    expect(docx.pageCount).toBeNull();
    expect(docx.structureTree?.[0]).toMatchObject({ title: "Agreement current terms" });
  });
});

describe("DOCX package consumers", () => {
  it("preserves relationships and media while filling template fields", async () => {
    const relationshipXml =
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>';
    const media = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const source = await docxFixture({
      documentXml:
        '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{CLIENT_NAME}}</w:t></w:r></w:p></w:body></w:document>',
      files: {
        "word/header1.xml":
          '<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>{{REFERENCE_NO}}</w:t></w:r></w:p></w:hdr>',
        "word/_rels/document.xml.rels": relationshipXml,
        "word/media/image1.png": media,
      },
    });

    const analysis = await analyzeDocxTemplate(source, "fixture.docx");
    expect(analysis.fields.map((field) => field.id)).toEqual(["CLIENT_NAME", "REFERENCE_NO"]);
    expect(analysis.metadata.placeholders).toMatchObject({
      unique: 2,
      occurrences: 2,
    });
    await expect(renderDocxPreviewHtml(source)).resolves.toContain("{{CLIENT_NAME}}");

    const filled = await fillDocxTemplate(source, {
      CLIENT_NAME: "Futurix",
      REFERENCE_NO: "42",
    });
    await withDocxPackage({ bytes: filled.bytes }, async (docx) => {
      await expect(docx.readXml("word/_rels/document.xml.rels")).resolves.toBe(relationshipXml);
      await expect(docx.readBytes("word/media/image1.png")).resolves.toEqual(Buffer.from(media));
      await expect(docx.readXml("word/document.xml")).resolves.toContain("Futurix");
      await expect(docx.readXml("word/header1.xml")).resolves.toContain("42");
    });
    expect(filled.replacements).toEqual({ CLIENT_NAME: 1, REFERENCE_NO: 1 });
  });
});

describe("tracked DOCX extraction", () => {
  it("keeps accepted-view text and emits tracked edits", async () => {
    const source = await docxFixture();
    expect(await extractDocxBodyText(source)).toBe("Agreement current terms");
    expect(await extractTrackedChangeIds(source)).toEqual([
      { kind: "del", w_id: "7" },
      { kind: "ins", w_id: "8" },
    ]);

    const edited = await applyTrackedEdits(source, [
      {
        find: "current",
        replace: "updated",
        context_before: "Agreement ",
        context_after: " terms",
      },
    ]);

    expect(edited.errors).toEqual([]);
    expect(edited.changes).toHaveLength(1);
    expect(await extractDocxBodyText(edited.bytes)).toBe("Agreement updated terms");
    expect(await extractTrackedChangeIds(edited.bytes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "del" }),
        expect.objectContaining({ kind: "ins" }),
      ]),
    );

    const rejected = await resolveTrackedChange(source, ["8"], "reject");
    expect(rejected.found).toBe(true);
    expect(await extractDocxBodyText(rejected.bytes)).toBe("Agreement  terms");

    const accepted = await resolveTrackedChange(source, ["7", "8"], "accept");
    expect(accepted.found).toBe(true);
    expect(await extractDocxBodyText(accepted.bytes)).toBe("Agreement current terms");
  });
});
