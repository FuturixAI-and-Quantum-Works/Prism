import type { DocumentRole } from "../access/access.types.js";
import { recordDocumentActivity } from "./documents.activity.service.js";
import { DocumentGovernanceRepository } from "./documents.governance.repository.js";

const repository = new DocumentGovernanceRepository();

export async function recordDocumentChatMessage(input: {
  documentId: string;
  userId: string | null;
  userName?: string | null;
  userEmail?: string | null;
  roleBadge: DocumentRole | "OWNER_ADMIN" | "AI";
  aiLabel?: "AI_LUNA" | "AI_LUNA_PRISM" | null;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const row = await repository.recordChatMessage({
    documentId: input.documentId,
    userId: input.userId,
    userName: input.userName ?? null,
    userEmail: input.userEmail ?? null,
    roleBadge: input.roleBadge,
    aiLabel: input.aiLabel ?? null,
    content: input.content,
    metadata: input.metadata ?? null,
  });
  await recordDocumentActivity(
    input.documentId,
    input.userId,
    input.aiLabel === "AI_LUNA_PRISM" ? "prism_chat_message" : "document_chat_message",
    { type: "chat_message", id: row.id },
    input.metadata,
  );
  return row;
}
