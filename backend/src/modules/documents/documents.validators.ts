import { z } from "zod";
import type { DocumentZipRequest } from "./documents.zip.js";

export const ALLOWED_DOCUMENT_TYPES = new Set(["pdf", "docx", "doc", "txt", "rtf", "odt"]);
export const ALLOWED_IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "webp", "bmp"]);
export const ALL_ALLOWED_TYPES = new Set([...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_IMAGE_TYPES]);

export function documentExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

export function assertAllowedDocumentType(filename: string): string {
  const suffix = documentExtension(filename);
  if (!ALL_ALLOWED_TYPES.has(suffix)) {
    throw Object.assign(
      new Error(
        `Unsupported file type: ${suffix}. Allowed: pdf, docx, doc, txt, rtf, odt, jpg, jpeg, png, webp, bmp`,
      ),
      { statusCode: 400 },
    );
  }
  return suffix;
}

export function normalizeDocumentFilename(
  name?: string,
  fallback = "Untitled Document.docx",
): string {
  const raw = (name ?? "").trim() || fallback;
  const safe = raw
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withName = safe || fallback;
  return /\.[a-z0-9]{1,16}$/i.test(withName) ? withName : `${withName}.docx`;
}

export function normalizeRenameFilename(name: string, currentFilename: string): string {
  const raw = name.trim();
  if (!raw) return currentFilename;
  const safe = raw
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!safe) return currentFilename;
  if (/\.[a-z0-9]{1,16}$/i.test(safe)) return safe;
  const dot = currentFilename.lastIndexOf(".");
  const currentExt = dot >= 0 ? currentFilename.slice(dot) : "";
  return `${safe}${currentExt}`;
}

const uuid = z.string().uuid();

export const documentIdParamsSchema = z.object({ documentId: uuid });
export const documentVersionParamsSchema = z.object({
  documentId: uuid,
  versionId: uuid,
});
export const contextFileParamsSchema = z.object({
  documentId: uuid,
  contextFileId: uuid,
});
export const documentListQuerySchema = z.object({
  project_id: uuid.optional(),
  workspace_id: uuid.optional(),
});
export const versionQuerySchema = z.object({ version_id: uuid.optional() });
export const createDocumentSchema = z.object({
  filename: z.string().optional(),
  name: z.string().optional(),
  content_html: z.string().optional(),
  project_id: uuid.nullish(),
  workspace_id: uuid.nullish(),
  folder_id: uuid.nullish(),
  is_primary: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
});
export const updateDocumentSchema = z.object({
  filename: z.string().optional(),
  name: z.string().optional(),
  project_id: uuid.nullish(),
  folder_id: uuid.nullish(),
});
export const contextDocumentSchema = z.object({ context_document_id: uuid });
export const htmlVersionSchema = z.object({
  html: z.string().trim().min(1, "html is required"),
  display_name: z.string().trim().max(200).optional(),
});
export const renameVersionSchema = z.object({
  display_name: z.string().trim().max(200).nullable().optional(),
});
export const exportDocumentSchema = z.object({
  html: z.string().trim().min(1, "html is required"),
  format: z.enum(["docx", "pdf"]),
});
export const documentZipRequestSchema: z.ZodType<DocumentZipRequest> = z
  .object({
    document_ids: z.array(uuid).min(1),
    mode: z.enum(["atomic", "partial"]).default("atomic"),
  })
  .strict()
  .transform(({ document_ids, mode }) => ({
    documentIds: document_ids,
    mode,
  }));
