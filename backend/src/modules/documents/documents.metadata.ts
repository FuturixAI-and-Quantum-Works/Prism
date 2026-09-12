import { decodeDocumentContent, DocumentContentError } from "../content/documentContent.js";

export type DocumentMetadata = Readonly<{
  pageCount: number | null;
  structureTree: readonly unknown[] | null;
}>;

export async function extractDocumentMetadata(
  buffer: Buffer,
  fileType: string,
  signal?: AbortSignal,
): Promise<DocumentMetadata> {
  try {
    const result = await decodeDocumentContent({
      bytes: buffer,
      fileType,
      output: "metadata",
      signal,
    });
    return {
      pageCount: result.pageCount,
      structureTree: result.structureTree,
    };
  } catch (error) {
    if (error instanceof DocumentContentError && error.code === "aborted") throw error;
    return { pageCount: null, structureTree: null };
  }
}
