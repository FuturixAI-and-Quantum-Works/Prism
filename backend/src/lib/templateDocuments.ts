import fs from "fs/promises";
import path from "path";
import { and, desc, eq, or } from "drizzle-orm";
import { db, templates } from "../db/index.js";
import { DOCX_TEMPLATE_MIME, fillDocxTemplate } from "./docxTemplateAnalyzer.js";
import { buildDownloadUrl } from "./downloadTokens.js";
import { downloadFile, storageEnabled } from "./storage.js";
import type { DocumentCreator } from "../modules/documents/documents.service.js";
import type { DocumentDto, RequestUserContext } from "../modules/documents/documents.models.js";

export type TemplateRecord = typeof templates.$inferSelect;

export type NormalizedTemplateField = {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
  required: boolean;
  options?: string[];
};

export type CreateDocumentFromTemplateInput = {
  templateId: string;
  values?: Record<string, string>;
  filename?: string | null;
  name?: string | null;
  projectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
  isPrimary?: boolean;
};

export type CreateDocumentFromTemplateResult = {
  doc: DocumentDto;
  template: TemplateRecord;
  replacements?: Record<string, number>;
  downloadUrl: string;
};

export type MissingTemplateField = {
  id: string;
  label: string;
};

export class MissingTemplateFieldsError extends Error {
  statusCode = 400;
  code = "missing_template_fields";
  missingFields: MissingTemplateField[];

  constructor(missingFields: MissingTemplateField[]) {
    super(
      `Missing required template fields: ${missingFields.map((field) => field.label).join(", ")}`,
    );
    this.name = "MissingTemplateFieldsError";
    this.missingFields = missingFields;
  }
}

export function isMissingTemplateFieldsError(error: unknown): error is MissingTemplateFieldsError {
  return error instanceof MissingTemplateFieldsError;
}

export function normalizeTemplateValues(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key.trim(), String(value ?? "")]),
  );
}

function routeError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderHtmlTemplate(contentHtml: string, values: Record<string, string>): string {
  let rendered = contentHtml;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, "g"), value);
  }
  return rendered;
}

export function isDocxBackedTemplate(template: TemplateRecord): boolean {
  return (
    template.sourceMimeType === DOCX_TEMPLATE_MIME ||
    template.sourceFilename?.toLowerCase().endsWith(".docx") === true
  );
}

function toFieldId(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const placeholder = trimmed.match(/^\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}$/);
  return placeholder?.[1] ?? trimmed;
}

export function normalizeTemplateFields(fields: unknown): NormalizedTemplateField[] {
  if (!Array.isArray(fields)) return [];
  const out: NormalizedTemplateField[] = [];
  for (const raw of fields) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const rawId = Reflect.get(raw, "id");
    const rawKey = Reflect.get(raw, "key");
    const rawPlaceholder = Reflect.get(raw, "placeholder");
    const rawLabel = Reflect.get(raw, "label");
    const rawOptions = Reflect.get(raw, "options");
    const rawType = Reflect.get(raw, "type");
    const id = toFieldId(rawId) ?? toFieldId(rawKey) ?? toFieldId(rawPlaceholder);
    if (!id) continue;
    const label =
      typeof rawLabel === "string" && rawLabel.trim()
        ? rawLabel.trim()
        : id
            .replace(/[_-]+/g, " ")
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    const options = Array.isArray(rawOptions)
      ? rawOptions.map((option) => String(option ?? "").trim()).filter(Boolean)
      : undefined;
    out.push({
      id,
      label,
      placeholder: typeof rawPlaceholder === "string" ? rawPlaceholder : undefined,
      type: typeof rawType === "string" ? rawType : undefined,
      required: Reflect.get(raw, "required") !== false,
      options,
    });
  }
  return out;
}

export function getMissingRequiredTemplateFields(
  template: TemplateRecord,
  values: Record<string, string>,
): MissingTemplateField[] {
  return normalizeTemplateFields(template.fields)
    .filter((field) => field.required && !values[field.id]?.trim())
    .map((field) => ({ id: field.id, label: field.label }));
}

export function validateTemplateValues(template: TemplateRecord, values: Record<string, string>) {
  const missingFields = getMissingRequiredTemplateFields(template, values);
  if (missingFields.length) {
    throw new MissingTemplateFieldsError(missingFields);
  }
}

async function readLocalSourceFile(sourceStoragePath: string | null) {
  if (!sourceStoragePath || sourceStoragePath.startsWith("templates/system/")) return null;

  const cwd = process.cwd();
  const resolved = path.resolve(cwd, sourceStoragePath);
  if (resolved !== cwd && !resolved.startsWith(`${cwd}${path.sep}`)) return null;
  try {
    return await fs.readFile(resolved);
  } catch {
    return null;
  }
}

export async function loadDocxTemplateSource(template: TemplateRecord): Promise<Buffer> {
  if (template.sourceStoragePath && storageEnabled) {
    const raw = await downloadFile(template.sourceStoragePath);
    if (raw) return Buffer.from(raw);
  }

  const local = await readLocalSourceFile(template.sourceStoragePath);
  if (local) return local;

  throw routeError(404, "Template DOCX source is not available");
}

export async function loadAccessibleTemplates(userId: string): Promise<TemplateRecord[]> {
  return db
    .select()
    .from(templates)
    .where(
      or(
        eq(templates.isCreatedByUser, false),
        and(eq(templates.isCreatedByUser, true), eq(templates.userId, userId)),
      ),
    )
    .orderBy(desc(templates.createdAt));
}

export async function loadAccessibleTemplate(
  templateId: string,
  userId: string,
): Promise<TemplateRecord | null> {
  const [template] = await db
    .select()
    .from(templates)
    .where(
      and(
        eq(templates.id, templateId),
        or(eq(templates.isCreatedByUser, false), eq(templates.userId, userId)),
      ),
    )
    .limit(1);
  return template ?? null;
}

export async function createDocumentFromTemplate(
  documents: DocumentCreator,
  context: RequestUserContext,
  input: CreateDocumentFromTemplateInput,
): Promise<CreateDocumentFromTemplateResult> {
  const template = await loadAccessibleTemplate(input.templateId, context.userId);
  if (!template) throw routeError(404, "Template not found");

  const values = input.values ?? {};
  validateTemplateValues(template, values);
  const requestedFilename =
    input.filename?.trim() ||
    (input.name?.trim() ? `${input.name.trim()}.docx` : `${template.name}.docx`);

  if (isDocxBackedTemplate(template)) {
    const sourceBytes = await loadDocxTemplateSource(template);
    const filled = await fillDocxTemplate(sourceBytes, values);
    const doc = await documents.createFromBuffer(context, {
      filename: requestedFilename,
      buffer: filled.bytes,
      projectId: input.projectId ?? null,
      workspaceId: input.workspaceId ?? null,
      folderId: input.folderId ?? null,
      isPrimary: input.isPrimary,
    });
    return {
      doc,
      template,
      replacements: filled.replacements,
      downloadUrl: doc.storage_path ? buildDownloadUrl(doc.storage_path, doc.filename) : "",
    };
  }

  const doc = await documents.createBlank(context, {
    filename: requestedFilename,
    contentHtml: renderHtmlTemplate(template.contentHtml, values),
    projectId: input.projectId ?? null,
    workspaceId: input.workspaceId ?? null,
    folderId: input.folderId ?? null,
    isPrimary: input.isPrimary,
  });
  return {
    doc,
    template,
    downloadUrl: doc.storage_path ? buildDownloadUrl(doc.storage_path, doc.filename) : "",
  };
}
