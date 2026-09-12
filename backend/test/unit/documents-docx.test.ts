import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

const convertHtml = vi.hoisted(() => vi.fn());

vi.mock("@turbodocx/html-to-docx", () => ({
  default: convertHtml,
}));

import {
  createInitialDocxBuffer,
  DocxConversionError,
} from "../../src/modules/documents/documents.docx.js";

describe("initial DOCX generation", () => {
  beforeEach(() => {
    convertHtml.mockReset();
  });

  it("surfaces HTML converter failures without producing a plain-text document", async () => {
    const cause = new Error("converter unavailable");
    convertHtml.mockRejectedValue(cause);

    await expect(
      createInitialDocxBuffer("agreement.docx", {
        kind: "html",
        value: "<p><strong>Material term</strong></p>",
      }),
    ).rejects.toEqual(new DocxConversionError({ cause }));
  });

  it("generates plain text only when the caller selects that content kind", async () => {
    const buffer = await createInitialDocxBuffer("agreement.docx", {
      kind: "plain-text",
      value: "Material term",
    });
    const archive = await JSZip.loadAsync(buffer);
    const documentXml = await archive.file("word/document.xml")?.async("string");

    expect(convertHtml).not.toHaveBeenCalled();
    expect(documentXml).toContain("Material term");
  });
});
