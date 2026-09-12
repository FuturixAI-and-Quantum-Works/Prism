import { recordDocumentChatMessage } from "../documents/documents.chat.service.js";
import type { ChatRepository } from "./chat.repository.js";
import type {
  ActiveDocumentContext,
  AssembledChatContext,
  ChatMessage,
  ChatSession,
  HandlerOutcome,
  OrchestratorRequest,
} from "./chat.types.js";

type RecordDocumentMessage = typeof recordDocumentChatMessage;

function usedPrismDocumentTool(events: readonly unknown[]): boolean {
  return events.some((event) => {
    if (!event || typeof event !== "object") return false;
    const tool = Reflect.get(event, "tool");
    return typeof tool === "string" && tool.startsWith("prism_");
  });
}

export class ChatTurnPersistence {
  constructor(
    private readonly repository: Pick<ChatRepository, "saveMessage" | "setTitle">,
    private readonly recordDocumentMessage: RecordDocumentMessage = recordDocumentChatMessage,
  ) {}

  async saveUserTurn(
    req: OrchestratorRequest,
    session: ChatSession,
    lastUser: ChatMessage | undefined,
    contexts: readonly ActiveDocumentContext[],
  ): Promise<void> {
    if (!lastUser) return;
    const files = req.attachedItems?.length
      ? req.attachedItems.map((item) => ({
          filename: item.filename,
          document_id: item.id,
        }))
      : (lastUser.files ?? null);
    await this.repository.saveMessage({
      chatId: session.chatId,
      role: "user",
      content: lastUser.content,
      files,
      workflow: lastUser.workflow ?? null,
    });
    if (req.routeMode !== "general" || contexts.length === 0) return;
    await Promise.all(
      contexts.map((context) =>
        this.recordDocumentMessage({
          documentId: context.document_id,
          userId: req.userId,
          userName: context.user_name,
          userEmail: context.user_email,
          roleBadge:
            context.role_badge === "PROJECT_MEMBER"
              ? (context.document_role ?? "OWNER_ADMIN")
              : (context.role_badge ?? context.document_role ?? "OWNER_ADMIN"),
          content: lastUser.content ?? "",
          metadata: { chat_id: session.chatId },
        }),
      ),
    );
  }

  async saveAssistantTurn(context: AssembledChatContext, outcome: HandlerOutcome): Promise<void> {
    const annotations = outcome.annotations ?? [];
    await this.repository.saveMessage({
      chatId: context.session.chatId,
      role: "assistant",
      content: outcome.events.length ? JSON.stringify(outcome.events) : null,
      annotations: annotations.length ? annotations : null,
    });
    await this.recordAssistantDocumentTurns(context, outcome);
    if (!context.session.chatTitle && context.lastUser?.content) {
      await this.repository.setTitle(
        context.session.chatId,
        context.lastUser.content.slice(0, 120),
      );
    }
  }

  private async recordAssistantDocumentTurns(
    context: AssembledChatContext,
    outcome: HandlerOutcome,
  ): Promise<void> {
    if (context.req.routeMode !== "general" || context.activeDocumentContexts.length === 0) {
      return;
    }
    const aiLabel = usedPrismDocumentTool(outcome.events) ? "AI_LUNA_PRISM" : "AI_LUNA";
    await Promise.all(
      context.activeDocumentContexts.map((document) =>
        this.recordDocumentMessage({
          documentId: document.document_id,
          userId: null,
          userName: "Luna",
          userEmail: null,
          roleBadge: "AI",
          aiLabel,
          content:
            outcome.fullText ||
            (outcome.events.length ? JSON.stringify(outcome.events) : "No response generated."),
          metadata: {
            chat_id: context.session.chatId,
            event_count: outcome.events.length,
          },
        }),
      ),
    );
  }
}
