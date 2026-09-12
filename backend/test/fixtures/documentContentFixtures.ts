import JSZip from "jszip";
import * as XLSX from "xlsx";

function pdfObject(id: number, body: string): string {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

export function textFixture(): Buffer {
  return Buffer.from("Plain text fixture\nSecond line", "utf8");
}

export function htmlFixture(): Buffer {
  return Buffer.from(
    "<html><body><h1>HTML fixture</h1><p>Shared extraction &amp; decoding.</p></body></html>",
    "utf8",
  );
}

export function pdfFixture(): Buffer {
  const stream = "BT\n/F1 12 Tf\n72 720 Td\n(PDF fixture) Tj\nET";
  const objects = [
    pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    pdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    pdfObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    ),
    pdfObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    pdfObject(5, `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`),
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}

type DocxFixtureOptions = Readonly<{
  documentPath?: string;
  documentXml?: string;
  files?: Readonly<Record<string, string | Uint8Array>>;
}>;

export function docxFixture(options: DocxFixtureOptions = {}): Promise<Buffer> {
  const zip = new JSZip();
  const documentPath = options.documentPath ?? "word/document.xml";
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    documentPath,
    options.documentXml ??
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Agreement </w:t></w:r><w:del w:id="7"><w:r><w:delText>old</w:delText></w:r></w:del><w:ins w:id="8"><w:r><w:t>current</w:t></w:r></w:ins><w:r><w:t> terms</w:t></w:r></w:p><w:sectPr/></w:body></w:document>',
  );
  for (const [path, content] of Object.entries(options.files ?? {})) zip.file(path, content);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export function spreadsheetFixture(): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Clause", "Owner"],
      ["Termination", "Legal"],
    ]),
    "Review",
  );
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}
