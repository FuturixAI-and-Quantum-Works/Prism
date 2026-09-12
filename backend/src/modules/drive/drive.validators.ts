import { z } from "zod";
import { DriveError, type WorkspaceMemberRole } from "./drive.types.js";

const nullableId = z.unknown().transform((value, context): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") return value;
  context.addIssue({ code: "custom", message: "must be a string" });
  return z.NEVER;
});

const optionalText = z.unknown().transform((value, context): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    context.addIssue({ code: "custom", message: "Invalid string field" });
    return z.NEVER;
  }
  return value.trim() || null;
});

const requiredName = z.unknown().transform((value, context): string => {
  if (typeof value !== "string" || !value.trim()) {
    context.addIssue({ code: "custom", message: "name is required" });
    return z.NEVER;
  }
  const name = value.trim();
  if (name.length > 500) {
    context.addIssue({ code: "custom", message: "name is too long" });
    return z.NEVER;
  }
  return name;
});

const role = z.unknown().transform((value, context): WorkspaceMemberRole => {
  if (value === "admin" || value === "editor" || value === "viewer") return value;
  context.addIssue({ code: "custom", message: "role must be admin, editor, or viewer" });
  return z.NEVER;
});

const idArray = z.unknown().transform((value, context): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
    context.addIssue({ code: "custom", message: "must be an array of IDs" });
    return z.NEVER;
  }
  return [...new Set(value)];
});

const queryText = z
  .unknown()
  .transform((value): string | null =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  );

const pagination = z.object({
  limit: queryText.optional(),
  offset: queryText.optional(),
});

export const fileIdParamsSchema = z.object({ fileId: z.string().min(1) });
export const folderIdParamsSchema = z.object({ folderId: z.string().min(1) });
export const workspaceIdParamsSchema = z.object({ workspaceId: z.string().min(1) });
export const accessRequestParamsSchema = workspaceIdParamsSchema.extend({
  requestId: z.string().min(1),
});

export const listFilesQuerySchema = pagination
  .extend({
    workspace_id: queryText.optional(),
    folder_id: queryText.optional(),
    search: queryText.optional(),
    sort_by: queryText.optional(),
    sort_order: queryText.optional(),
  })
  .transform((input) => ({
    workspaceId: input.workspace_id ?? null,
    folderId: input.folder_id ?? null,
    search: input.search ?? null,
    sortBy: input.sort_by ?? null,
    sortOrder: input.sort_order ?? null,
    ...parsePagination(input.limit, input.offset),
  }));

export const listFoldersQuerySchema = pagination
  .extend({
    workspace_id: queryText.optional(),
    parent_folder_id: queryText.optional(),
    search: queryText.optional(),
    sort_by: queryText.optional(),
    sort_order: queryText.optional(),
  })
  .transform((input) => ({
    workspaceId: input.workspace_id ?? null,
    parentFolderId: input.parent_folder_id ?? null,
    search: input.search ?? null,
    sortBy: input.sort_by ?? null,
    sortOrder: input.sort_order ?? null,
    ...parsePagination(input.limit, input.offset),
  }));

export const createFileBodySchema = z.object({
  workspace_id: nullableId.optional(),
  folder_id: nullableId.optional(),
  description: optionalText.optional(),
  is_primary: z.union([z.boolean(), z.string()]).optional(),
});

export const updateFileBodySchema = z.object({
  name: requiredName.optional(),
  description: optionalText.optional(),
  folder_id: nullableId.optional(),
});

export const copyFilesBodySchema = z.object({
  file_ids: idArray,
  target_workspace_id: nullableId.optional(),
  target_folder_id: nullableId.optional(),
});

export const moveItemsBodySchema = z.object({
  file_ids: idArray.optional(),
  folder_ids: idArray.optional(),
  target_workspace_id: nullableId.optional(),
  target_folder_id: nullableId.optional(),
});

export const deleteItemsBodySchema = z.object({
  file_ids: idArray.optional(),
  folder_ids: idArray.optional(),
});

export const createFolderBodySchema = z.object({
  workspace_id: nullableId.optional(),
  parent_folder_id: nullableId.optional(),
  name: requiredName,
  description: optionalText.optional(),
});

export const updateFolderBodySchema = z.object({
  name: requiredName.optional(),
  description: optionalText.optional(),
  parent_folder_id: nullableId.optional(),
});

export const createWorkspaceBodySchema = z.object({
  name: requiredName,
  description: optionalText.optional(),
});

export const updateWorkspaceBodySchema = createWorkspaceBodySchema.partial();

export const memberBodySchema = z.object({
  user_id: z.string({ error: "user_id is required" }).min(1, "user_id is required"),
  role: role.optional().default("viewer"),
});

export const invitationBodySchema = z.object({
  email: z
    .string({ error: "email is required" })
    .trim()
    .toLowerCase()
    .email("email must be a valid email address"),
  role: role.optional().default("editor"),
});

export const requestAccessBodySchema = z.object({
  role: role.optional().default("viewer"),
  message: z.string().trim().optional(),
});

export const decideAccessRequestBodySchema = z.object({
  action: z.enum(["approve", "reject"], {
    error: "action must be 'approve' or 'reject'",
  }),
});

export const downloadQuerySchema = z
  .object({ inline: queryText.optional() })
  .transform((input) => ({
    inline: input.inline === "true",
  }));

function parsePagination(
  limitRaw: string | null | undefined,
  offsetRaw: string | null | undefined,
): { limit: number; offset: number } {
  const parsedLimit = Number.parseInt(limitRaw ?? "50", 10);
  const parsedOffset = Number.parseInt(offsetRaw ?? "0", 10);
  return {
    limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50,
    offset: Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0,
  };
}

export function parseUploadedName(value: unknown): string {
  const result = requiredName.safeParse(value);
  if (!result.success) {
    throw new DriveError(400, result.error.issues[0]?.message ?? "file name is required");
  }
  return result.data;
}
