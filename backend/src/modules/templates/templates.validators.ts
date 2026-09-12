import { z } from "zod";

const optionalUuid = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || null);
const SYSTEM_TEMPLATE_TYPE = "system";
const USER_TEMPLATE_TYPE = "user";
const ALL_TEMPLATE_TYPE = "all";

function requiredText(message: string) {
  return z.preprocess((value) => value ?? "", z.string().trim().min(1, message));
}

export const listTemplatesSchema = z.object({
  type: z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value === SYSTEM_TEMPLATE_TYPE) return SYSTEM_TEMPLATE_TYPE;
      if (value === USER_TEMPLATE_TYPE) return USER_TEMPLATE_TYPE;
      return ALL_TEMPLATE_TYPE;
    }),
});

export const templateIdSchema = z.object({
  templateId: z.string().min(1),
});

export const createTemplateSchema = z.object({
  name: requiredText("name is required"),
  category: requiredText("category is required"),
  description: z.string().trim().optional(),
  content_html: requiredText("content_html is required"),
  fields: z.unknown().optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().optional(),
  category: z.string().trim().optional(),
  description: z.string().trim().nullable().optional(),
  content_html: z.string().trim().optional(),
  fields: z.unknown().optional(),
});

export const cloneTemplateSchema = z.object({
  name: z.string().trim().optional(),
});

export const createDocumentSchema = z.object({
  values: z.unknown().optional(),
  filename: z.string().optional(),
  name: z.string().optional(),
  project_id: optionalUuid,
  workspace_id: optionalUuid,
  folder_id: optionalUuid,
  is_primary: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
});

export function normalizeTemplateValues(values: unknown): Readonly<Record<string, string>> {
  if (!values || typeof values !== "object" || Array.isArray(values)) return {};
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.trim(), String(value ?? "")]),
  );
}
