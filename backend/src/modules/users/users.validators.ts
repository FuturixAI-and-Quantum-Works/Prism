import { z } from "zod";
import type { ProfileUpdate } from "./users.dto.js";

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  country: z.string().trim().min(1).max(100),
  jurisdiction: z.string().trim().max(255).optional().nullable(),
  organization: z.string().trim().min(1).max(255),
  professionalRole: z.string().trim().max(100).optional().nullable(),
});

const providerSchema = z.enum(["anthropic", "google", "openai", "openai-compatible"]);
export const taskSchema = z.enum(["main", "title", "tabular"]);
const capabilitiesSchema = z.object({
  input: z.object({ text: z.boolean(), image: z.boolean(), pdf: z.boolean() }),
  output: z.object({
    text: z.boolean(),
    structured: z.boolean(),
    toolCalls: z.boolean(),
  }),
  contextWindowTokens: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
});
const connectionFieldsSchema = z.object({
  provider: providerSchema,
  name: z.string().trim().min(1).max(120),
  baseUrl: z.string().url().optional(),
  enabled: z.boolean().optional(),
  models: z
    .array(
      z.object({
        id: z.string().min(1).max(150).optional(),
        providerModelId: z.string().trim().min(1).max(150),
        displayName: z.string().trim().min(1).max(150),
        capabilities: capabilitiesSchema,
        tasks: z.array(taskSchema).min(1),
      }),
    )
    .optional(),
});

export const createConnectionSchema = connectionFieldsSchema.extend({
  credential: z.string().trim().min(1),
});
export const updateConnectionSchema = connectionFieldsSchema.extend({
  credential: z.string().trim().min(1).optional(),
});
export const preferenceSchema = z.object({
  connectionId: z.string().min(1),
  modelId: z.string().min(1),
});

export type ProfilePayloadResult =
  Readonly<{ ok: true; update: ProfileUpdate }> | Readonly<{ ok: false; detail: string }>;

export function validateProfilePayload(body: unknown): ProfilePayloadResult {
  const parsed = z.record(z.string(), z.unknown()).safeParse(body);
  if (!parsed.success || Array.isArray(body)) {
    return { ok: false, detail: "Expected a JSON object" };
  }
  const raw = parsed.data;
  const allowedFields = new Set(["displayName", "organization", "organisation"]);
  const invalidField = Object.keys(raw).find((key) => !allowedFields.has(key));
  if (invalidField) {
    return { ok: false, detail: `Unsupported profile field: ${invalidField}` };
  }

  const update: { displayName?: string | null; organization?: string | null } = {};
  if ("displayName" in raw) {
    const displayName = raw.displayName;
    if (displayName !== null && typeof displayName !== "string") {
      return { ok: false, detail: "displayName must be a string or null" };
    }
    update.displayName = typeof displayName === "string" ? displayName.trim() || null : null;
  }

  const organization = raw.organization ?? raw.organisation;
  if ("organization" in raw || "organisation" in raw) {
    if (organization !== null && typeof organization !== "string") {
      return { ok: false, detail: "organization must be a string or null" };
    }
    update.organization = typeof organization === "string" ? organization.trim() || null : null;
  }

  return { ok: true, update };
}
