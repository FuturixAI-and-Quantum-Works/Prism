import HTMLtoDOCX from "@turbodocx/html-to-docx";
import { Document, Packer, Paragraph, TextRun } from "docx";

async function createBlankDocxBuffer(filename: string): Promise<Buffer> {
  const title = filename.replace(/\.[^.]+$/, "") || "Untitled Document";
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true })],
            spacing: { after: 240 },
          }),
          new Paragraph({ text: "" }),
        ],
      },
    ],
  });
  return Packer.toBuffer(document);
}

async function createPlainTextDocx(filename: string, text: string): Promise<Buffer> {
  const title = filename.replace(/\.[^.]+$/, "") || "Untitled Document";
  const paragraphs = text
    .split("\n")
    .filter((line) => line.trim())
    .map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line.trim() })],
          spacing: { after: 200 },
        }),
    );
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
            spacing: { after: 400 },
          }),
          ...paragraphs,
        ],
      },
    ],
  });
  return Packer.toBuffer(document);
}

async function outputBuffer(output: unknown): Promise<Buffer | null> {
  if (Buffer.isBuffer(output)) return output;
  if (output instanceof ArrayBuffer) return Buffer.from(output);
  if (ArrayBuffer.isView(output)) {
    return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
  }
  if (
    output &&
    typeof output === "object" &&
    "arrayBuffer" in output &&
    typeof output.arrayBuffer === "function"
  ) {
    return Buffer.from(await output.arrayBuffer());
  }
  return null;
}

export class DocxConversionError extends Error {
  constructor(options: ErrorOptions) {
    super("HTML to DOCX conversion failed", options);
    this.name = "DocxConversionError";
  }
}

export type InitialDocxContent =
  Readonly<{ kind: "html"; value: string }> | Readonly<{ kind: "plain-text"; value: string }>;

export async function createInitialDocxBuffer(
  filename: string,
  content?: InitialDocxContent,
): Promise<Buffer> {
  if (!content?.value.trim()) return createBlankDocxBuffer(filename);
  if (content.kind === "plain-text") return createPlainTextDocx(filename, content.value);
  const title = filename.replace(/\.[^.]+$/, "") || "Untitled Document";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${title}</title></head>
<body>${content.value}</body>
</html>`;
  try {
    const output = await HTMLtoDOCX(html, null, {
      title,
      creator: "Prism",
      font: "Calibri",
      fontSize: 22,
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });
    const buffer = await outputBuffer(output);
    if (!buffer) throw new Error("Document conversion returned no bytes");
    return buffer;
  } catch (error) {
    throw new DocxConversionError({ cause: error });
  }
}
