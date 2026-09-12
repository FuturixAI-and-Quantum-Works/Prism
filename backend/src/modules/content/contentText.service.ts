import { loadActiveVersion } from "../../lib/documentVersions.js";
import { downloadFile } from "../../lib/storage.js";
import { assertDocumentContentActive, decodeDocumentContent } from "./documentContent.js";

export type ContentTextSource =
  | Readonly<{ kind: "document"; id: string; fileType: string | null }>
  | Readonly<{ kind: "stored-file"; storagePath: string; fileType: string | null }>;

export type ContentReadResult =
  | Readonly<{ kind: "text"; text: string }>
  | Readonly<{ kind: "inline-pdf"; bytes: ArrayBuffer; mimeType: "application/pdf" }>;

export interface ContentTextService {
  extract(source: ContentTextSource, options?: ContentReadOptions): Promise<string>;
  read(source: ContentTextSource, options?: ContentReadOptions): Promise<ContentReadResult>;
}

export type ContentReadOptions = Readonly<{ signal?: AbortSignal }>;

function hasUsableExtractedText(text: string): boolean {
  const normalized = text
    .replace(/^\s*(?:\[Page\s+\d+\]|#{1,6}\s*Page\s+\d+)\s*$/gim, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length >= 80 && (normalized.match(/[A-Za-z0-9]/g) ?? []).length >= 40;
}

export function createContentTextService(): ContentTextService {
  const load = async (source: ContentTextSource, signal?: AbortSignal) => {
    assertDocumentContentActive(signal);
    const storagePath =
      source.kind === "document"
        ? (await loadActiveVersion(source.id))?.storage_path
        : source.storagePath;
    if (!storagePath) throw new Error("Content source has no active storage version");
    const bytes = await downloadFile(storagePath);
    assertDocumentContentActive(signal);
    if (!bytes || bytes.byteLength === 0) throw new Error("Content source bytes are unavailable");
    return bytes;
  };
  const extract = async (source: ContentTextSource, options?: ContentReadOptions) => {
    const bytes = await load(source, options?.signal);
    return (
      await decodeDocumentContent({
        bytes,
        fileType: source.fileType ?? "txt",
        output: "text",
        signal: options?.signal,
      })
    ).text;
  };
  const read = async (
    source: ContentTextSource,
    options?: ContentReadOptions,
  ): Promise<ContentReadResult> => {
    const bytes = await load(source, options?.signal);
    const decoded = await decodeDocumentContent({
      bytes,
      fileType: source.fileType ?? "txt",
      output: "text",
      signal: options?.signal,
    });
    if (decoded.format === "pdf" && !hasUsableExtractedText(decoded.text)) {
      return { kind: "inline-pdf", bytes, mimeType: "application/pdf" };
    }
    if (!decoded.text) throw new Error("Content source contains no extractable text");
    return { kind: "text", text: decoded.text };
  };
  return {
    read,
    extract,
  };
}
