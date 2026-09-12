import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { extractPreviewSummaryText } from "../../src/lib/previewSummary.js";
import { createInitialDocxBuffer } from "../../src/modules/documents/documents.docx.js";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes.buffer;
}

test("extracts worksheet names and cell values from an XLSX workbook", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Clause", "Status", "Owner"],
      ["Data retention requirements for customer records", "Approved", "Legal Operations"],
      ["Incident notification within seventy-two hours", "Pending", "Security Counsel"],
    ]),
    "Contract Review",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Jurisdiction", "Governing law"],
      ["European Union", "General Data Protection Regulation"],
    ]),
    "Jurisdictions",
  );

  const bytes: Buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });
  const result = await extractPreviewSummaryText({
    bytes: toArrayBuffer(bytes),
    filename: "contract-review.xlsx",
  });

  assert.ok(result.text);
  assert.match(result.text, /Sheet: Contract Review/);
  assert.match(
    result.text,
    /Incident notification within seventy-two hours,Pending,Security Counsel/,
  );
  assert.match(result.text, /Sheet: Jurisdictions/);
  assert.match(result.text, /European Union,General Data Protection Regulation/);
});

test("generates a DOCX package with document content and relationships", async () => {
  const buffer = await createInitialDocxBuffer("service-agreement.docx", {
    kind: "html",
    value: "<h1>Service Agreement</h1><p>Document format integration text.</p>",
  });
  const archive = await JSZip.loadAsync(buffer);

  assert.ok(archive.file("[Content_Types].xml"));
  assert.ok(archive.file("_rels/.rels"));
  assert.ok(archive.file("word/document.xml"));
  assert.ok(archive.file("word/styles.xml"));

  const documentXml = await archive.file("word/document.xml")?.async("string");
  assert.ok(documentXml);
  assert.match(documentXml, /Service Agreement/);
  assert.match(documentXml, /Document format integration text\./);
});
