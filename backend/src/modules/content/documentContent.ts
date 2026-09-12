import { createRequire } from "node:module";
import path from "node:path";
import JSZip from "jszip";
import mammoth from "mammoth";
import { XMLValidator } from "fast-xml-parser";
import * as XLSX from "xlsx";

export type DocumentFormat = "pdf" | "docx" | "text" | "html" | "spreadsheet";

export type DocumentContentLimits = Readonly<{
  maxInputBytes: number;
  maxOutputChars: number;
  maxPdfPages: number;
  maxSpreadsheetSheets: number;
  maxDocxEntries: number;
  maxDocxUncompressedBytes: number;
  maxDocxXmlBytes: number;
}>;

export type DocumentStructureItem = Readonly<{
  id: string;
  title: string;
  level: number;
  page_number: number | null;
  children: readonly DocumentStructureItem[];
}>;

export type DocumentTextResult = Readonly<{
  output: "text";
  format: DocumentFormat;
  text: string;
  truncated: boolean;
}>;

export type DocumentHtmlResult = Readonly<{
  output: "html";
  format: "docx" | "html";
  html: string;
  messages: readonly Readonly<{ type: string; message: string }>[];
}>;

export type DocumentMetadataResult = Readonly<{
  output: "metadata";
  format: DocumentFormat;
  pageCount: number | null;
  structureTree: readonly DocumentStructureItem[] | null;
}>;

export type DocxPackage = Readonly<{
  paths: readonly string[];
  documentPath: "word/document.xml";
  normalizedPaths: boolean;
  has(path: string): boolean;
  readBytes(path: string): Promise<Buffer>;
  readXml(path: string): Promise<string>;
  writeXml(path: string, xml: string): void;
  toBuffer(): Promise<Buffer>;
}>;

export type DocxPackageRequest = Readonly<{
  bytes: ArrayBuffer | Uint8Array;
  signal?: AbortSignal;
  limits?: Partial<DocumentContentLimits>;
}>;

type SharedRequest = DocxPackageRequest &
  Readonly<{
    filename?: string;
    fileType?: string | null;
    mimeType?: string | null;
  }>;

type TextRequest = SharedRequest & Readonly<{ output: "text" }>;
type HtmlRequest = SharedRequest & Readonly<{ output: "html" }>;
type MetadataRequest = SharedRequest & Readonly<{ output: "metadata" }>;
export type DocumentContentRequest = TextRequest | HtmlRequest | MetadataRequest;

export type DocumentContentErrorCode =
  "aborted" | "input-limit" | "malformed-input" | "unsupported-format";

export class DocumentContentError extends Error {
  constructor(
    readonly code: DocumentContentErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DocumentContentError";
  }
}

export const DEFAULT_DOCUMENT_CONTENT_LIMITS: DocumentContentLimits = Object.freeze({
  maxInputBytes: 100 * 1024 * 1024,
  maxOutputChars: 2_000_000,
  maxPdfPages: 1_000,
  maxSpreadsheetSheets: 100,
  maxDocxEntries: 10_000,
  maxDocxUncompressedBytes: 200 * 1024 * 1024,
  maxDocxXmlBytes: 20 * 1024 * 1024,
});

const require = createRequire(import.meta.url);
const standardFontDataUrl = (() => {
  try {
    return (
      path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") +
      path.sep
    );
  } catch {
    return undefined;
  }
})();

function limitsFor(overrides?: Partial<DocumentContentLimits>): DocumentContentLimits {
  return { ...DEFAULT_DOCUMENT_CONTENT_LIMITS, ...overrides };
}

function abortError(): DocumentContentError {
  return new DocumentContentError("aborted", "Document content decoding was aborted");
}

export function assertDocumentContentActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

async function waitFor<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  assertDocumentContentActive(signal);
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function bytesFor(request: SharedRequest, limits: DocumentContentLimits): Buffer {
  const bytes = Buffer.isBuffer(request.bytes)
    ? request.bytes
    : request.bytes instanceof Uint8Array
      ? Buffer.from(request.bytes.buffer, request.bytes.byteOffset, request.bytes.byteLength)
      : Buffer.from(request.bytes);
  if (bytes.byteLength > limits.maxInputBytes) {
    throw new DocumentContentError(
      "input-limit",
      `Document content exceeds the ${limits.maxInputBytes}-byte input limit`,
    );
  }
  return bytes;
}

function normalizeType(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/^\./, "");
}

export function resolveDocumentFormat(
  input: Pick<SharedRequest, "filename" | "fileType" | "mimeType">,
): DocumentFormat {
  const extension = normalizeType(input.filename ? path.extname(input.filename) : "");
  const fileType = normalizeType(input.fileType);
  const mimeType = normalizeType(input.mimeType);
  const candidates = new Set([extension, fileType, mimeType]);
  if (candidates.has("pdf") || candidates.has("application/pdf")) return "pdf";
  if (
    candidates.has("docx") ||
    candidates.has("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  ) {
    return "docx";
  }
  if (
    candidates.has("xlsx") ||
    candidates.has("xls") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel")
  ) {
    return "spreadsheet";
  }
  if (candidates.has("html") || candidates.has("htm") || mimeType.includes("html")) return "html";
  if (
    candidates.has("txt") ||
    candidates.has("md") ||
    candidates.has("markdown") ||
    candidates.has("csv") ||
    mimeType.startsWith("text/")
  ) {
    return "text";
  }
  throw new DocumentContentError("unsupported-format", "Unsupported document content format");
}

function boundedText(
  text: string,
  maxOutputChars: number,
): Pick<DocumentTextResult, "text" | "truncated"> {
  const normalized = text.replaceAll(String.fromCharCode(0), "").trim();
  return normalized.length > maxOutputChars
    ? { text: normalized.slice(0, maxOutputChars), truncated: true }
    : { text: normalized, truncated: false };
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");
}

async function loadPdf(bytes: Buffer, signal: AbortSignal | undefined) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  assertDocumentContentActive(signal);
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl,
  });
  const abort = () => {
    void task.destroy();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    return await waitFor(task.promise, signal);
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

async function pdfText(
  bytes: Buffer,
  limits: DocumentContentLimits,
  signal?: AbortSignal,
): Promise<string> {
  const pdf = await loadPdf(bytes, signal);
  try {
    if (pdf.numPages > limits.maxPdfPages) {
      throw new DocumentContentError(
        "input-limit",
        `PDF exceeds the ${limits.maxPdfPages}-page limit`,
      );
    }
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      assertDocumentContentActive(signal);
      const page = await waitFor(pdf.getPage(pageNumber), signal);
      const content = await waitFor(page.getTextContent(), signal);
      const text = content.items
        .flatMap((item) => ("str" in item && typeof item.str === "string" ? [item.str] : []))
        .join(" ")
        .trim();
      pages.push(`[Page ${pageNumber}]\n${text}`);
    }
    return pages.join("\n\n");
  } finally {
    await pdf.destroy();
  }
}

function safeDocxPath(rawPath: string): string {
  const normalized = rawPath.replaceAll("\\", "/");
  const withoutTrailingSlash = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  const segments = withoutTrailingSlash.split("/");
  if (
    !withoutTrailingSlash ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.includes(String.fromCharCode(0)) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new DocumentContentError("malformed-input", "DOCX package contains an unsafe path");
  }
  return segments.join("/");
}

function originalZipPath(entry: { name: string }): string {
  const descriptor = Object.getOwnPropertyDescriptor(entry, "unsafeOriginalName");
  return typeof descriptor?.value === "string" ? descriptor.value : entry.name;
}

function validateXml(xml: string, path: string): void {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new DocumentContentError(
      "malformed-input",
      `DOCX XML part ${path} contains a prohibited declaration`,
    );
  }
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new DocumentContentError("malformed-input", `DOCX XML part ${path} is invalid`);
  }
}

async function openDocxPackage(
  bytes: Buffer,
  limits: DocumentContentLimits,
  signal?: AbortSignal,
): Promise<{ package: DocxPackage; dispose: () => void }> {
  const source = await waitFor(JSZip.loadAsync(bytes), signal);
  const sourceEntries = Object.values(source.files);
  if (sourceEntries.length > limits.maxDocxEntries) {
    throw new DocumentContentError(
      "input-limit",
      `DOCX package exceeds the ${limits.maxDocxEntries}-entry limit`,
    );
  }

  let archive: JSZip | undefined = new JSZip();
  let expandedBytes = 0;
  let normalizedPaths = false;
  const paths: string[] = [];
  const seen = new Set<string>();
  const entryKinds = new Map<string, "directory" | "file">();
  const assertActive = () => assertDocumentContentActive(signal);
  for (const entry of sourceEntries) {
    assertActive();
    const rawPath = originalZipPath(entry);
    const normalizedPath = safeDocxPath(rawPath);
    const kind = entry.dir ? "directory" : "file";
    if (entryKinds.has(normalizedPath)) {
      throw new DocumentContentError(
        "malformed-input",
        `DOCX package contains colliding path ${normalizedPath}`,
      );
    }
    entryKinds.set(normalizedPath, kind);
    if (entry.dir) continue;
    normalizedPaths ||= rawPath !== normalizedPath;
    if (seen.has(normalizedPath)) {
      throw new DocumentContentError(
        "malformed-input",
        `DOCX package contains duplicate path ${normalizedPath}`,
      );
    }
    seen.add(normalizedPath);
    const content = await waitFor(entry.async("nodebuffer", assertActive), signal);
    expandedBytes += content.byteLength;
    if (expandedBytes > limits.maxDocxUncompressedBytes) {
      throw new DocumentContentError(
        "input-limit",
        `DOCX package exceeds the ${limits.maxDocxUncompressedBytes}-byte expanded limit`,
      );
    }
    archive.file(normalizedPath, content);
    paths.push(normalizedPath);
  }

  const documentPath = "word/document.xml" as const;
  if (!seen.has(documentPath)) {
    throw new DocumentContentError(
      "malformed-input",
      "DOCX package does not contain word/document.xml",
    );
  }

  let dirty = normalizedPaths;
  const activeArchive = (): JSZip => {
    assertDocumentContentActive(signal);
    if (!archive) {
      throw new DocumentContentError("malformed-input", "DOCX package is no longer active");
    }
    return archive;
  };
  const entryFor = (requestedPath: string) => {
    const normalizedPath = safeDocxPath(requestedPath);
    const entry = activeArchive().file(normalizedPath);
    if (!entry) {
      throw new DocumentContentError(
        "malformed-input",
        `DOCX package does not contain ${normalizedPath}`,
      );
    }
    return { entry, normalizedPath };
  };
  const docx: DocxPackage = Object.freeze({
    paths: Object.freeze(paths),
    documentPath,
    normalizedPaths,
    has(requestedPath) {
      return activeArchive().file(safeDocxPath(requestedPath)) !== null;
    },
    async readBytes(requestedPath) {
      const { entry } = entryFor(requestedPath);
      return waitFor(entry.async("nodebuffer", assertActive), signal);
    },
    async readXml(requestedPath) {
      const { entry, normalizedPath } = entryFor(requestedPath);
      const xml = await waitFor(entry.async("string", assertActive), signal);
      if (Buffer.byteLength(xml) > limits.maxDocxXmlBytes) {
        throw new DocumentContentError(
          "input-limit",
          `DOCX XML part exceeds the ${limits.maxDocxXmlBytes}-byte limit`,
        );
      }
      validateXml(xml, normalizedPath);
      return xml;
    },
    writeXml(requestedPath, xml) {
      const { normalizedPath } = entryFor(requestedPath);
      if (Buffer.byteLength(xml) > limits.maxDocxXmlBytes) {
        throw new DocumentContentError(
          "input-limit",
          `DOCX XML part exceeds the ${limits.maxDocxXmlBytes}-byte limit`,
        );
      }
      validateXml(xml, normalizedPath);
      activeArchive().file(normalizedPath, xml);
      dirty = true;
    },
    async toBuffer() {
      if (!dirty) return bytes;
      return waitFor(
        activeArchive().generateAsync({ type: "nodebuffer", compression: "DEFLATE" }, assertActive),
        signal,
      );
    },
  });
  await docx.readXml(documentPath);
  return {
    package: docx,
    dispose() {
      archive = undefined;
    },
  };
}

export async function withDocxPackage<T>(
  request: DocxPackageRequest,
  use: (docx: DocxPackage) => T | Promise<T>,
): Promise<T> {
  assertDocumentContentActive(request.signal);
  const limits = limitsFor(request.limits);
  const bytes = bytesFor(request, limits);
  let opened: Awaited<ReturnType<typeof openDocxPackage>> | undefined;
  try {
    opened = await openDocxPackage(bytes, limits, request.signal);
    return await use(opened.package);
  } catch (error) {
    if (error instanceof DocumentContentError) throw error;
    throw new DocumentContentError("malformed-input", "Could not decode DOCX package", {
      cause: error,
    });
  } finally {
    opened?.dispose();
  }
}

export async function normalizeDocxZipPaths(
  bytes: Buffer,
  options?: Readonly<{ signal?: AbortSignal; limits?: Partial<DocumentContentLimits> }>,
): Promise<Buffer> {
  return withDocxPackage({ bytes, signal: options?.signal, limits: options?.limits }, (docx) =>
    docx.toBuffer(),
  );
}

function spreadsheetText(
  bytes: Buffer,
  limits: DocumentContentLimits,
  signal?: AbortSignal,
): string {
  assertDocumentContentActive(signal);
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true, dense: false });
  const chunks: string[] = [];
  for (const sheetName of workbook.SheetNames.slice(0, limits.maxSpreadsheetSheets)) {
    assertDocumentContentActive(signal);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
    if (csv) chunks.push(`Sheet: ${sheetName}\n${csv}`);
  }
  return chunks.join("\n\n");
}

async function textOutput(
  format: DocumentFormat,
  bytes: Buffer,
  limits: DocumentContentLimits,
  signal?: AbortSignal,
): Promise<DocumentTextResult> {
  let text: string;
  switch (format) {
    case "pdf":
      text = await pdfText(bytes, limits, signal);
      break;
    case "docx": {
      const result = await withDocxPackage({ bytes, signal, limits }, async (docx) =>
        waitFor(mammoth.extractRawText({ buffer: await docx.toBuffer() }), signal),
      );
      text = result.value;
      break;
    }
    case "spreadsheet":
      text = spreadsheetText(bytes, limits, signal);
      break;
    case "html":
      text = htmlToText(bytes.toString("utf8"));
      break;
    case "text":
      text = bytes.toString("utf8");
      break;
    default: {
      const exhaustive: never = format;
      throw new DocumentContentError("unsupported-format", `Unsupported format ${exhaustive}`);
    }
  }
  return { output: "text", format, ...boundedText(text, limits.maxOutputChars) };
}

async function htmlOutput(
  format: DocumentFormat,
  bytes: Buffer,
  limits: DocumentContentLimits,
  signal?: AbortSignal,
): Promise<DocumentHtmlResult> {
  if (format === "html") {
    return {
      output: "html",
      format,
      html: boundedText(bytes.toString("utf8"), limits.maxOutputChars).text,
      messages: [],
    };
  }
  if (format !== "docx") {
    throw new DocumentContentError(
      "unsupported-format",
      `HTML output is not available for ${format}`,
    );
  }
  const result = await withDocxPackage({ bytes, signal, limits }, async (docx) =>
    waitFor(mammoth.convertToHtml({ buffer: await docx.toBuffer() }), signal),
  );
  return {
    output: "html",
    format,
    html: boundedText(result.value, limits.maxOutputChars).text,
    messages: result.messages.map(({ type, message }) => ({ type, message })),
  };
}

async function metadataOutput(
  format: DocumentFormat,
  bytes: Buffer,
  limits: DocumentContentLimits,
  signal?: AbortSignal,
): Promise<DocumentMetadataResult> {
  if (format === "pdf") {
    const pdf = await loadPdf(bytes, signal);
    try {
      if (pdf.numPages > limits.maxPdfPages) {
        throw new DocumentContentError(
          "input-limit",
          `PDF exceeds the ${limits.maxPdfPages}-page limit`,
        );
      }
      if (pdf.numPages <= 5) {
        return { output: "metadata", format, pageCount: pdf.numPages, structureTree: null };
      }
      const outline = await waitFor(pdf.getOutline(), signal);
      const structureTree: DocumentStructureItem[] = outline?.length
        ? outline.map((item, index) => ({
            id: `h1-${index}`,
            title: item.title || `Item ${index + 1}`,
            level: 1,
            page_number: null,
            children: [],
          }))
        : Array.from({ length: pdf.numPages }, (_, index) => ({
            id: `page-${index + 1}`,
            title: `Page ${index + 1}`,
            level: 1,
            page_number: index + 1,
            children: [],
          }));
      return { output: "metadata", format, pageCount: pdf.numPages, structureTree };
    } finally {
      await pdf.destroy();
    }
  }
  const extracted = await textOutput(format, bytes, limits, signal);
  const structureTree = extracted.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((title, index) => ({
      id: `h1-${index}`,
      title: title.slice(0, 100),
      level: 1,
      page_number: null,
      children: [],
    }));
  return {
    output: "metadata",
    format,
    pageCount: null,
    structureTree: structureTree.length > 0 ? structureTree : null,
  };
}

export function decodeDocumentContent(request: TextRequest): Promise<DocumentTextResult>;
export function decodeDocumentContent(request: HtmlRequest): Promise<DocumentHtmlResult>;
export function decodeDocumentContent(request: MetadataRequest): Promise<DocumentMetadataResult>;
export async function decodeDocumentContent(
  request: DocumentContentRequest,
): Promise<DocumentTextResult | DocumentHtmlResult | DocumentMetadataResult> {
  assertDocumentContentActive(request.signal);
  const limits = limitsFor(request.limits);
  const bytes = bytesFor(request, limits);
  const format = resolveDocumentFormat(request);
  try {
    switch (request.output) {
      case "text":
        return await textOutput(format, bytes, limits, request.signal);
      case "html":
        return await htmlOutput(format, bytes, limits, request.signal);
      case "metadata":
        return await metadataOutput(format, bytes, limits, request.signal);
      default: {
        const exhaustive: never = request;
        return exhaustive;
      }
    }
  } catch (error) {
    if (error instanceof DocumentContentError) throw error;
    throw new DocumentContentError("malformed-input", `Could not decode ${format} content`, {
      cause: error,
    });
  }
}
