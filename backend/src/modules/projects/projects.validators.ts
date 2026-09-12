import { z } from "zod";
import {
  ProjectError,
  type ProjectFolderMutationInput,
  type ProjectMutationInput,
  type ProjectShareRole,
} from "./projects.types.js";

export function parseProjectMutation(body: unknown): ProjectMutationInput {
  const record = z
    .object({
      name: z
        .string()
        .transform((name) => name.trim())
        .optional(),
      cm_number: z
        .string()
        .transform((cmNumber) => cmNumber.trim() || null)
        .nullable()
        .optional(),
    })
    .strict()
    .parse(body);
  return {
    ...(record.name === undefined ? {} : { name: record.name }),
    ...(record.cm_number === undefined ? {} : { cmNumber: record.cm_number }),
  };
}

export function parseFolderCreate(
  body: unknown,
): Required<Pick<ProjectFolderMutationInput, "name">> &
  Pick<ProjectFolderMutationInput, "parentFolderId"> {
  const record = z.record(z.string(), z.unknown()).parse(body);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) throw new ProjectError(400, "name is required");
  return {
    name,
    parentFolderId: typeof record.parent_folder_id === "string" ? record.parent_folder_id : null,
  };
}

export function parseFolderUpdate(body: unknown): ProjectFolderMutationInput {
  const record = z.record(z.string(), z.unknown()).parse(body);
  const input: { name?: string; parentFolderId?: string | null } = {};
  if (record.name != null) {
    if (typeof record.name !== "string") throw new ProjectError(400, "name must be a string");
    input.name = record.name.trim();
  }
  if ("parent_folder_id" in record) {
    if (record.parent_folder_id !== null && typeof record.parent_folder_id !== "string") {
      throw new ProjectError(400, "parent_folder_id must be a string or null");
    }
    input.parentFolderId = record.parent_folder_id;
  }
  return input;
}

export function parseInvitation(body: unknown): Readonly<{
  email: string;
  role: ProjectShareRole;
}> {
  const record = z.record(z.string(), z.unknown()).parse(body);
  return {
    email: normalizeInviteEmail(record.email),
    role: normalizeShareRole(record.role),
  };
}

export function parseMemberRole(body: unknown): ProjectShareRole {
  const record = z.record(z.string(), z.unknown()).parse(body);
  return normalizeShareRole(record.role);
}

export function normalizeShareRole(value: unknown): ProjectShareRole {
  if (value === "admin" || value === "editor" || value === "viewer") return value;
  throw new ProjectError(400, "role must be admin, editor, or viewer");
}

export function normalizeInviteEmail(value: unknown): string {
  if (typeof value !== "string") throw new ProjectError(400, "email is required");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ProjectError(400, "Enter a valid email address");
  }
  return email;
}
