import type { templates } from "../../db/schema/index.js";

export type Template = typeof templates.$inferSelect;

export type TemplateActor = Readonly<{
  userId: string;
  email: string;
}>;

export type TemplateListType = "system" | "user" | "all";

export type CreateTemplateInput = Readonly<{
  name: string;
  category: string;
  description?: string | null;
  contentHtml: string;
  fields?: unknown;
}>;

export type UpdateTemplateInput = Readonly<{
  name?: string;
  category?: string;
  description?: string | null;
  contentHtml?: string;
  fields?: unknown;
}>;

export type CreateTemplateDocumentInput = Readonly<{
  values: Readonly<Record<string, string>>;
  filename?: string | null;
  name?: string | null;
  projectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
  isPrimary?: boolean;
}>;

export class TemplateError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly missingFields?: readonly Readonly<{ id: string; label: string }>[],
  ) {
    super(message);
    this.name = "TemplateError";
  }
}
