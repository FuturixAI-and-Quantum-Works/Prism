import type { ChatItem, ChatMessage } from "./chat.types.js";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; detail: string };

export function parseOptionalId(
  value: unknown,
  name: string,
  options: { allowNull: boolean; mentionNull: boolean },
): ParseResult<{ provided: boolean; value: string | null }> {
  if (value === undefined) return { ok: true, value: { provided: false, value: null } };
  if (value === null && options.allowNull) {
    return { ok: true, value: { provided: true, value: null } };
  }
  if (typeof value !== "string" || !value.trim()) {
    return {
      ok: false,
      detail: `${name} must be a non-empty string${options.mentionNull ? " or null" : ""}`,
    };
  }
  return { ok: true, value: { provided: true, value: value.trim() } };
}

export function parseOptionalModel(value: unknown): ParseResult<string | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, detail: "model must be a non-empty string" };
  }
  return { ok: true, value: value.trim() };
}

export function parseChatMessages(value: unknown): ParseResult<ChatMessage[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, detail: "messages must be a non-empty array" };
  }
  const messages: ChatMessage[] = [];
  for (const message of value) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return { ok: false, detail: "messages must contain objects" };
    }
    const role = Reflect.get(message, "role");
    const content = Reflect.get(message, "content");
    if (typeof role !== "string") {
      return { ok: false, detail: "message.role must be a string" };
    }
    if (content !== null && typeof content !== "string") {
      return { ok: false, detail: "message.content must be a string or null" };
    }
    messages.push({
      role,
      content,
      files: parseMessageFiles(Reflect.get(message, "files")),
      workflow: parseWorkflow(Reflect.get(message, "workflow")),
    });
  }
  return { ok: true, value: messages };
}

export function parseChatItem(value: unknown, idKey: "document_id" | "file_id"): ChatItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const filename = Reflect.get(value, "filename");
  const id = Reflect.get(value, idKey);
  return typeof filename === "string" && typeof id === "string" ? { filename, id } : null;
}

export function parseChatItems(value: unknown, idKey: "document_id" | "file_id"): ChatItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = parseChatItem(item, idKey);
    return parsed ? [parsed] : [];
  });
}

function parseMessageFiles(value: unknown): ChatMessage["files"] {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((file) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) return [];
    const filename = Reflect.get(file, "filename");
    const documentId = Reflect.get(file, "document_id");
    if (typeof filename !== "string") return [];
    return [
      {
        filename,
        ...(typeof documentId === "string" ? { document_id: documentId } : {}),
      },
    ];
  });
}

function parseWorkflow(value: unknown): ChatMessage["workflow"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const id = Reflect.get(value, "id");
  const title = Reflect.get(value, "title");
  return typeof id === "string" && typeof title === "string" ? { id, title } : undefined;
}
