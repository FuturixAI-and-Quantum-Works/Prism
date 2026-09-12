import type { documents } from "../../db/index.js";

export type DocumentRow = typeof documents.$inferSelect;

export type DocumentDto = {
  id: string;
  project_id: string | null;
  workspace_id: string | null;
  user_id: string;
  folder_id: string | null;
  filename: string;
  file_type: string | null;
  size_bytes: number | null;
  page_count: number | null;
  structure_tree: unknown;
  status: string | null;
  lifecycle_status: string;
  current_version_id: string | null;
  attached: boolean;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
  storage_path?: string | null;
  pdf_storage_path?: string | null;
  latest_version_number?: number | null;
  active_version_number?: number | null;
};

export type RequestUserContext = {
  userId: string;
  userEmail?: string | null;
};

export type DocumentListQuery = {
  projectId?: string | null;
  workspaceId?: string | null;
};

export type CreateBlankDocumentInput = {
  filename?: string;
  name?: string;
  contentHtml?: string;
  projectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
  isPrimary?: boolean;
};

export type CreateDocumentFromBufferInput = {
  filename: string;
  buffer: Buffer;
  projectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
  isPrimary?: boolean;
};

export type UploadDocumentInput = {
  userId: string;
  userEmail?: string | null;
  filename: string;
  buffer: Buffer;
  projectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
  attached?: boolean;
  isPrimary?: boolean;
};

export type UpdateDocumentInput = {
  filename?: string;
  name?: string;
  projectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
};
