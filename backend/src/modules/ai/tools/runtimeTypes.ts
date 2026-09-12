import type { DocReadFailedEvent } from "@prism/protocol";

export type DocStore = Map<string, { storage_path: string; file_type: string; filename: string }>;

export type WorkflowStore = Map<string, { title: string; prompt_md: string }>;

export type DocIndex = Record<
  string,
  {
    document_id: string;
    filename: string;
    version_id?: string | null;
    version_number?: number | null;
    lifecycle_status?: string | null;
  }
>;

export type ChatMessage = {
  role: string;
  content: string | null;
  files?: { filename: string; document_id?: string }[];
  workflow?: { id: string; title: string };
};

export type EditAnnotation = {
  kind: "edit";
  edit_id: string;
  document_id: string;
  version_id: string;
  version_number?: number | null;
  change_id: string;
  del_w_id?: string;
  ins_w_id?: string;
  deleted_text: string;
  inserted_text: string;
  context_before: string;
  context_after: string;
  reason?: string;
  status: "pending" | "accepted" | "rejected";
};

export type DocEditedResult = {
  filename: string;
  document_id: string;
  version_id: string;
  version_number: number | null;
  download_url: string;
  annotations: EditAnnotation[];
};

export type DocCreatedResult = {
  filename: string;
  download_url: string;
  document_id?: string;
  version_id?: string;
  version_number?: number | null;
};

export type DocReplicatedResult = {
  filename: string;
  count: number;
  copies: {
    new_filename: string;
    document_id: string;
    version_id: string;
  }[];
};

export type DocReadFailure = Omit<DocReadFailedEvent, "type">;

export type AssistantEvent =
  | { type: "reasoning"; text: string }
  | { type: "doc_read"; filename: string; document_id?: string }
  | DocReadFailedEvent
  | { type: "doc_find"; filename: string; query: string; total_matches: number }
  | ({ type: "doc_created" } & DocCreatedResult)
  | { type: "doc_download"; filename: string; download_url: string }
  | ({ type: "doc_replicated" } & DocReplicatedResult)
  | { type: "workflow_applied"; workflow_id: string; title: string }
  | ({ type: "doc_edited" } & DocEditedResult)
  | { type: "content"; text: string };
