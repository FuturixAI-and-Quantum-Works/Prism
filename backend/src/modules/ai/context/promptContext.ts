import { getNextField, type InterviewState } from "../../../lib/templateInterview.js";
import type { TemplateRecord } from "../../../lib/templateDocuments.js";
import type { RetrievalScope } from "../../retrieval/retrieval.types.js";
import type { ChatMessage, DocIndex, WorkflowStore } from "../tools/runtimeTypes.js";

const PROJECT_PROMPT = `PROJECT CONTEXT:
You are operating within a project folder that contains a collection of legal documents the user has organized for a single matter. The user's questions will usually refer to one or more documents in this project - your job is to find the relevant files to work on. Use list_documents to see what is available and fetch_documents / read_document to pull in any documents you need before answering.

A document may currently be displayed in the user's side panel; when provided, treat it as context for the user's likely focus, but do not assume it is the only or definitive document the user is asking about. If the request could apply to other files in the project, identify and read those as well. Prefer coverage across the relevant project documents over an over-narrow reading of only the displayed one.

REPLICATING A DOCUMENT:
When the user wants to use an existing project document as a starting point for a new file, call replicate_document with the source doc_id. Then call edit_document on the returned slug.`;

const WORKSPACE_PROMPT = `WORKSPACE CONTEXT:
You are operating within a workspace that contains a collection of files the user has organized. Use list_documents to discover files and fetch_documents / read_document to load relevant content.

A displayed file is context for likely focus, but it is not necessarily the only file relevant to the request.`;

type Scope =
  | { type: "personal"; projectId?: null; workspaceId?: null }
  | { type: "project"; projectId: string; workspaceId?: null }
  | { type: "workspace"; workspaceId: string; projectId?: null };

type PromptContext = {
  scope: Scope;
  attachedItems?: { filename: string; id: string }[];
  docIndex: DocIndex;
  folderPaths: Map<string, string>;
  lastUser: ChatMessage | undefined;
  templates: TemplateRecord[];
  workflowStore: WorkflowStore;
  ragScope: RetrievalScope;
  ragCollection: { collectionName: string; displayName: string | null } | null;
  ragStatus: { indexedSourceCount: number };
  interviewState: InterviewState | null;
};

export function composeChatContextPrompt(context: PromptContext): string {
  const parts: string[] = [];
  if (context.scope.type === "project") parts.push(PROJECT_PROMPT);
  if (context.scope.type === "workspace") parts.push(WORKSPACE_PROMPT);
  parts.push(buildContextBlock(context));

  if (context.attachedItems?.length) {
    const slugById = new Map<string, string>();
    for (const [slug, info] of Object.entries(context.docIndex)) {
      slugById.set(info.document_id, slug);
    }
    const lines = context.attachedItems.map((item) => {
      const slug = slugById.get(item.id);
      return slug ? `- ${slug}: ${item.filename}` : `- ${item.filename}`;
    });
    const subject = context.scope.type === "workspace" ? "FILES" : "DOCUMENTS";
    parts.push(
      `USER-ATTACHED ${subject} FOR THIS TURN:\nTreat these as the primary focus unless the request clearly says otherwise.\n${lines.join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

function buildContextBlock(context: PromptContext): string {
  const scopeRef =
    context.scope.type === "project"
      ? `project ${context.scope.projectId}`
      : context.scope.type === "workspace"
        ? `workspace ${context.scope.workspaceId}`
        : "personal";
  const lines = [
    "CONTEXT:",
    "This context is assembled every turn. Call read_document to fetch full content.",
    `Scope: ${context.scope.type} - ${scopeRef}`,
    `RAG: ${context.ragStatus.indexedSourceCount} documents indexed${
      context.ragCollection
        ? `, ready to search (${context.ragCollection.displayName || context.ragCollection.collectionName})`
        : ", no collection available"
    }`,
    "",
    "DOCUMENTS IN SCOPE:",
  ];
  const documents = Object.entries(context.docIndex);
  if (documents.length) {
    for (const [docId, info] of documents) {
      const folder = context.folderPaths.get(docId);
      const label = folder ? `${folder} / ${info.filename}` : info.filename;
      lines.push(`- ${docId}: ${label} [${info.lifecycle_status || "UNKNOWN"}]`);
    }
  } else {
    lines.push("- none");
  }

  lines.push("", "AVAILABLE TEMPLATES:");
  if (context.templates.length) {
    for (const template of context.templates) {
      lines.push(`- ${template.name} (${template.category}) [id: ${template.id}]`);
    }
  } else {
    lines.push("- none");
  }

  if (context.lastUser?.workflow) {
    lines.push(
      "",
      `ACTIVE WORKFLOW: ${context.lastUser.workflow.title} [id: ${context.lastUser.workflow.id}]`,
    );
  }
  const interviewState = context.interviewState;
  if (interviewState?.status === "active") {
    const collected = interviewState.fields
      .filter((field) => interviewState.collectedValues[field.id]?.trim())
      .map((field) => field.label);
    lines.push(
      "",
      `INTERVIEW IN PROGRESS: ${interviewState.templateName}`,
      `Collected so far: ${collected.length ? collected.join(", ") : "none"}`,
      `Next needed: ${getNextField(interviewState)?.label ?? "none"}`,
    );
  }
  lines.push(
    "",
    "Lifecycle guidance: Do not casually edit documents marked PENDING_APPROVAL, IN_REVIEW, or otherwise non-draft. Permission checks remain authoritative.",
    `RAG scope ref: ${context.ragScope.type}:${context.ragScope.id}`,
    `Available workflows: ${context.workflowStore.size}`,
  );
  if (context.scope.type === "project") lines.push(`Project ID: ${context.scope.projectId}`);
  if (context.scope.type === "workspace") lines.push(`Workspace ID: ${context.scope.workspaceId}`);
  return lines.join("\n");
}

export function applyDisplayedItem(
  scope: Scope,
  displayedItem: { filename: string; id: string } | null | undefined,
  messages: ChatMessage[],
): ChatMessage[] {
  if (!displayedItem || scope.type === "personal") return messages;
  const name = scope.type === "workspace" ? "displayed_file" : "displayed_doc";
  const idName = scope.type === "workspace" ? "displayed_file_id" : "displayed_doc_id";
  return messages.map((message, index) =>
    index === messages.length - 1 && message.role === "user"
      ? {
          ...message,
          content: `${message.content}\n\n${name}: ${displayedItem.filename}, ${idName}: ${displayedItem.id}`,
        }
      : message,
  );
}
