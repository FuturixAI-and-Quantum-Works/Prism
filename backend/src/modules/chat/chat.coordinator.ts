import { runCancellableChatStream } from "./chat.cancellation.js";
import type { ChatContextAssembler } from "./chat.context.js";
import type { ChatAiExecution } from "./chat.execution.js";
import { detectChatIntent } from "./chat.intent.js";
import type { ChatTurnPersistence } from "./chat.persistence.js";
import type { ChatPolicy } from "./chat.policy.js";
import type { ChatSessionResolver } from "./chat.session.js";
import type {
  EphemeralRequest,
  EphemeralResult,
  OrchestratorRequest,
  OrchestratorResult,
} from "./chat.types.js";

export class ChatCoordinator {
  constructor(
    private readonly policy: Pick<ChatPolicy, "authorizeRoute" | "loadActiveDocumentContexts">,
    private readonly sessions: Pick<ChatSessionResolver, "resolve">,
    private readonly contexts: Pick<ChatContextAssembler, "assemble">,
    private readonly persistence: Pick<ChatTurnPersistence, "saveUserTurn" | "saveAssistantTurn">,
    private readonly execution: Pick<ChatAiExecution, "prepareEphemeral" | "execute">,
  ) {}

  async handleEphemeral(req: EphemeralRequest): Promise<EphemeralResult> {
    if (req.messages.length === 0) {
      return { kind: "error", status: 400, detail: "messages must be a non-empty array" };
    }
    const operation = await this.execution.prepareEphemeral(req);
    return {
      kind: "stream",
      stream: (writer, signal) =>
        runCancellableChatStream({
          label: "ephemeral-chat",
          writer,
          signal,
          operation: () => operation(writer, signal),
        }),
    };
  }

  async handle(req: OrchestratorRequest): Promise<OrchestratorResult> {
    const routeError = await this.policy.authorizeRoute(req);
    if (routeError) return routeError;
    if (req.messages.length === 0) {
      return { kind: "error", status: 400, detail: "messages must be a non-empty array" };
    }
    const documents = await this.policy.loadActiveDocumentContexts(req);
    if (documents.kind === "error") return documents;
    const sessionResult = await this.sessions.resolve(req);
    if (sessionResult.kind === "error") return sessionResult;
    const session = sessionResult.session;
    const lastUser = [...req.messages].reverse().find((message) => message.role === "user");
    await this.persistence.saveUserTurn(req, session, lastUser, documents.contexts);
    const context = await this.contexts.assemble(req, session, lastUser, documents.contexts);
    const intent = context.interviewState
      ? ({ type: "fill_template_field" } as const)
      : detectChatIntent(lastUser?.content);
    return {
      kind: "stream",
      chatId: session.chatId,
      stream: (writer, signal) =>
        runCancellableChatStream({
          label: `${req.routeMode}-chat`,
          writer,
          signal,
          operation: async () => {
            writer.event({ type: "chat_id", chatId: session.chatId });
            const outcome = await this.execution.execute(context, intent, writer.event, signal);
            await this.persistence.saveAssistantTurn(context, outcome);
          },
        }),
    };
  }
}
