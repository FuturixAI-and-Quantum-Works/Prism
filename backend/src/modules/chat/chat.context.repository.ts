import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import {
  chatMessages,
  db,
  documents,
  driveFiles,
  driveFolders,
  projectSubfolders,
  workflows,
  workflowShares,
  type Database,
} from "../../db/index.js";
import { attachActiveVersionPaths } from "../../lib/documentVersions.js";
import type { DocIndex, DocStore, WorkflowStore } from "../ai/tools/runtimeTypes.js";
import type { ChatMessage } from "./chat.types.js";

export type LoadedChatDocuments = Readonly<{
  docIndex: DocIndex;
  docStore: DocStore;
  folderPaths: Map<string, string>;
}>;

export interface ChatContextRepository {
  loadPersonalDocuments(
    messages: readonly ChatMessage[],
    userId: string,
    chatId: string | null,
  ): Promise<LoadedChatDocuments>;
  loadProjectDocuments(projectId: string): Promise<LoadedChatDocuments>;
  loadWorkspaceDocuments(workspaceId: string): Promise<LoadedChatDocuments>;
  loadWorkflows(userId: string, userEmail: string | null | undefined): Promise<WorkflowStore>;
  enrichWithPriorEvents(
    messages: readonly ChatMessage[],
    chatId: string,
    docIndex: DocIndex,
  ): Promise<ChatMessage[]>;
}

type ContextDocument = {
  id: string;
  filename: string;
  file_type: string | null;
  current_version_id: string | null;
  lifecycle_status: string | null;
  active_version_number: number | null;
  storage_path: string | null;
  folder_id?: string | null;
};

type FolderRecord = Readonly<{
  id: string;
  name: string;
  parentFolderId: string | null;
}>;

function folderPathsFor(folders: readonly FolderRecord[]) {
  const foldersById = new Map(
    folders.map((folder) => [
      folder.id,
      { name: folder.name, parentFolderId: folder.parentFolderId },
    ]),
  );
  return (folderId: string | null): string => {
    const parts: string[] = [];
    let current = folderId;
    while (current) {
      const folder = foldersById.get(current);
      if (!folder) break;
      parts.unshift(folder.name);
      current = folder.parentFolderId;
    }
    return parts.join(" / ");
  };
}

function addDocuments(
  docIndex: DocIndex,
  docStore: DocStore,
  documents: readonly ContextDocument[],
  folderPath?: (folderId: string | null) => string,
) {
  const folderPaths = new Map<string, string>();
  for (let index = 0; index < documents.length; index++) {
    const document = documents[index];
    if (!document.storage_path) continue;
    const label = `doc-${index}`;
    docIndex[label] = {
      document_id: document.id,
      filename: document.filename,
      version_id: document.current_version_id,
      version_number: document.active_version_number,
      lifecycle_status: document.lifecycle_status,
    };
    docStore.set(label, {
      storage_path: document.storage_path,
      file_type: document.file_type ?? "",
      filename: document.filename,
    });
    const path = folderPath?.(document.folder_id ?? null);
    if (path) folderPaths.set(label, path);
  }
  return folderPaths;
}

function contextDocuments(
  rows: readonly {
    id: string;
    filename: string;
    fileType: string | null;
    currentVersionId: string | null;
    lifecycleStatus: string | null;
    folderId?: string | null;
  }[],
): ContextDocument[] {
  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    file_type: row.fileType,
    current_version_id: row.currentVersionId,
    lifecycle_status: row.lifecycleStatus,
    active_version_number: null,
    storage_path: null,
    folder_id: row.folderId,
  }));
}

function eventDocumentIds(content: unknown): string[] {
  let events: unknown = content;
  if (typeof content === "string") {
    try {
      events = JSON.parse(content);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(events)) return [];
  return events.flatMap((event) => {
    if (!event || typeof event !== "object") return [];
    const type = Reflect.get(event, "type");
    const documentId = Reflect.get(event, "document_id");
    return (type === "doc_created" || type === "doc_edited") && typeof documentId === "string"
      ? [documentId]
      : [];
  });
}

function priorEventSummary(content: unknown, docIndex: DocIndex): string | null {
  if (!Array.isArray(content)) return null;
  const labelsByDocumentId = new Map(
    Object.entries(docIndex).map(([label, info]) => [info.document_id, label]),
  );
  const reference = (documentId: unknown, filename: unknown) => {
    const label = typeof documentId === "string" ? labelsByDocumentId.get(documentId) : undefined;
    return label ? `${label} ("${String(filename)}")` : `"${String(filename)}"`;
  };
  const lines: string[] = [];
  for (const event of content) {
    if (!event || typeof event !== "object") continue;
    const type = Reflect.get(event, "type");
    const documentId = Reflect.get(event, "document_id");
    const filename = Reflect.get(event, "filename");
    if (type === "doc_created") {
      lines.push(`- generate_docx → ${reference(documentId, filename)}`);
    } else if (type === "doc_edited") {
      lines.push(`- edit_document → ${reference(documentId, filename)}`);
    } else if (type === "doc_read") {
      lines.push(`- read_document → ${reference(documentId, filename)}`);
    } else if (type === "workflow_applied") {
      lines.push(`- applied workflow: "${String(Reflect.get(event, "title"))}"`);
    } else if (type === "doc_replicated") {
      const source = typeof filename === "string" ? `"${filename}"` : "";
      const copies = Reflect.get(event, "copies");
      if (!Array.isArray(copies)) continue;
      for (const copy of copies) {
        if (!copy || typeof copy !== "object") continue;
        const target = reference(
          Reflect.get(copy, "document_id"),
          Reflect.get(copy, "new_filename"),
        );
        lines.push(
          source
            ? `- replicate_document → ${target} (copy of ${source})`
            : `- replicate_document → ${target}`,
        );
      }
    }
  }
  return lines.length ? `\n\n[Tool activity in your previous turn]\n${lines.join("\n")}` : null;
}

function appendSummary(messages: readonly ChatMessage[], summary: string | null): ChatMessage[] {
  if (!summary) return [...messages];
  let index = -1;
  for (let candidate = messages.length - 1; candidate >= 0; candidate -= 1) {
    if (messages[candidate]?.role === "assistant") {
      index = candidate;
      break;
    }
  }
  if (index < 0) return [...messages];
  return messages.map((message, messageIndex) =>
    messageIndex === index ? { ...message, content: (message.content ?? "") + summary } : message,
  );
}

export class DrizzleChatContextRepository implements ChatContextRepository {
  constructor(private readonly database: Database = db) {}

  async loadPersonalDocuments(
    messages: readonly ChatMessage[],
    userId: string,
    chatId: string | null,
  ): Promise<LoadedChatDocuments> {
    const documentIds = new Set(
      messages.flatMap((message) =>
        (message.files ?? []).flatMap((file) => (file.document_id ? [file.document_id] : [])),
      ),
    );
    if (chatId) {
      const rows = await this.database
        .select({ content: chatMessages.content })
        .from(chatMessages)
        .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.role, "assistant")));
      for (const row of rows) {
        for (const documentId of eventDocumentIds(row.content)) documentIds.add(documentId);
      }
    }
    const docIndex: DocIndex = {};
    const docStore: DocStore = new Map();
    if (documentIds.size > 0) {
      const rows = await this.database
        .select({
          id: documents.id,
          filename: documents.filename,
          fileType: documents.fileType,
          currentVersionId: documents.currentVersionId,
          lifecycleStatus: documents.lifecycleStatus,
        })
        .from(documents)
        .where(
          and(
            inArray(documents.id, [...documentIds]),
            eq(documents.userId, userId),
            eq(documents.status, "ready"),
          ),
        );
      const loaded = contextDocuments(rows);
      await attachActiveVersionPaths(loaded);
      addDocuments(docIndex, docStore, loaded);
    }
    return { docIndex, docStore, folderPaths: new Map() };
  }

  async loadProjectDocuments(projectId: string): Promise<LoadedChatDocuments> {
    const [rows, folders] = await Promise.all([
      this.database
        .select({
          id: documents.id,
          filename: documents.filename,
          fileType: documents.fileType,
          currentVersionId: documents.currentVersionId,
          lifecycleStatus: documents.lifecycleStatus,
          folderId: documents.folderId,
        })
        .from(documents)
        .where(and(eq(documents.projectId, projectId), eq(documents.status, "ready")))
        .orderBy(asc(documents.createdAt)),
      this.database
        .select({
          id: projectSubfolders.id,
          name: projectSubfolders.name,
          parentFolderId: projectSubfolders.parentFolderId,
        })
        .from(projectSubfolders)
        .where(eq(projectSubfolders.projectId, projectId)),
    ]);
    const loaded = contextDocuments(rows);
    await attachActiveVersionPaths(loaded);
    const docIndex: DocIndex = {};
    const docStore: DocStore = new Map();
    const folderPaths = addDocuments(docIndex, docStore, loaded, folderPathsFor(folders));
    return { docIndex, docStore, folderPaths };
  }

  async loadWorkspaceDocuments(workspaceId: string): Promise<LoadedChatDocuments> {
    const [files, folders, rows] = await Promise.all([
      this.database
        .select({
          id: driveFiles.id,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
          extension: driveFiles.extension,
          storagePath: driveFiles.storagePath,
          folderId: driveFiles.folderId,
          version: driveFiles.version,
        })
        .from(driveFiles)
        .where(eq(driveFiles.workspaceId, workspaceId))
        .orderBy(asc(driveFiles.createdAt)),
      this.database
        .select({
          id: driveFolders.id,
          name: driveFolders.name,
          parentFolderId: driveFolders.parentFolderId,
        })
        .from(driveFolders)
        .where(eq(driveFolders.workspaceId, workspaceId)),
      this.database
        .select({
          id: documents.id,
          filename: documents.filename,
          fileType: documents.fileType,
          currentVersionId: documents.currentVersionId,
          lifecycleStatus: documents.lifecycleStatus,
        })
        .from(documents)
        .where(and(eq(documents.workspaceId, workspaceId), eq(documents.status, "ready")))
        .orderBy(asc(documents.createdAt)),
    ]);
    const docIndex: DocIndex = {};
    const docStore: DocStore = new Map();
    const folderPaths = new Map<string, string>();
    const pathFor = folderPathsFor(folders);
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const label = `file-${index}`;
      docIndex[label] = {
        document_id: file.id,
        filename: file.name,
        version_id: null,
        version_number: file.version,
        lifecycle_status: "WORKSPACE_FILE",
      };
      docStore.set(label, {
        storage_path: file.storagePath,
        file_type: file.extension ?? file.mimeType,
        filename: file.name,
      });
      const path = pathFor(file.folderId);
      if (path) folderPaths.set(label, path);
    }
    const loaded = contextDocuments(rows);
    await attachActiveVersionPaths(loaded);
    for (const [label, path] of addDocuments(docIndex, docStore, loaded)) {
      folderPaths.set(label, path);
    }
    return { docIndex, docStore, folderPaths };
  }

  async loadWorkflows(
    userId: string,
    userEmail: string | null | undefined,
  ): Promise<WorkflowStore> {
    const store: WorkflowStore = new Map();
    const userWorkflows = await this.database
      .select({
        id: workflows.id,
        stableKey: workflows.stableKey,
        title: workflows.title,
        promptMd: workflows.promptMd,
        isSystem: workflows.isSystem,
      })
      .from(workflows)
      .where(
        and(
          or(eq(workflows.userId, userId), eq(workflows.isSystem, true)),
          eq(workflows.type, "assistant"),
        ),
      );
    for (const workflow of userWorkflows) {
      if (!workflow.promptMd) continue;
      const id = workflow.isSystem && workflow.stableKey ? workflow.stableKey : workflow.id;
      store.set(id, { title: workflow.title, prompt_md: workflow.promptMd });
    }
    const email = (userEmail ?? "").trim().toLowerCase();
    if (!email) return store;
    const shares = await this.database
      .select({ workflowId: workflowShares.workflowId })
      .from(workflowShares)
      .where(eq(workflowShares.sharedWithEmail, email));
    const sharedIds = [...new Set(shares.map((share) => share.workflowId))];
    if (sharedIds.length === 0) return store;
    const shared = await this.database
      .select({ id: workflows.id, title: workflows.title, promptMd: workflows.promptMd })
      .from(workflows)
      .where(and(inArray(workflows.id, sharedIds), eq(workflows.type, "assistant")));
    for (const workflow of shared) {
      if (workflow.promptMd) {
        store.set(workflow.id, { title: workflow.title, prompt_md: workflow.promptMd });
      }
    }
    return store;
  }

  async enrichWithPriorEvents(
    messages: readonly ChatMessage[],
    chatId: string,
    docIndex: DocIndex,
  ): Promise<ChatMessage[]> {
    const [row] = await this.database
      .select({ content: chatMessages.content })
      .from(chatMessages)
      .where(and(eq(chatMessages.chatId, chatId), eq(chatMessages.role, "assistant")))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);
    return appendSummary(messages, priorEventSummary(row?.content, docIndex));
  }
}
