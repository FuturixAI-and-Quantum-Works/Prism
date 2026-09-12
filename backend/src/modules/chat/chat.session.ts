import type { ChatPolicyError, ChatPolicy } from "./chat.policy.js";
import type { ChatRepository } from "./chat.repository.js";
import type { ChatSession, OrchestratorRequest } from "./chat.types.js";

export type ChatSessionResult = { kind: "ok"; session: ChatSession } | ChatPolicyError;

export class ChatSessionResolver {
  constructor(
    private readonly repository: Pick<ChatRepository, "findChat" | "createChat">,
    private readonly policy: Pick<ChatPolicy, "canAccessGeneralChat" | "authorizeNewGeneralScope">,
  ) {}

  async resolve(req: OrchestratorRequest): Promise<ChatSessionResult> {
    if (req.routeMode === "general") return this.resolveGeneral(req);
    if (req.routeMode === "project") return this.resolveProject(req);
    return this.resolveWorkspace(req);
  }

  private async resolveGeneral(req: OrchestratorRequest): Promise<ChatSessionResult> {
    let chatId = req.chatId ?? null;
    let chatTitle: string | null = null;
    let projectId = req.scope.type === "project" ? req.scope.projectId : null;
    let workspaceId = req.scope.type === "workspace" ? req.scope.workspaceId : null;

    if (chatId) {
      const existing = await this.repository.findChat(chatId);
      if (!existing || !(await this.policy.canAccessGeneralChat(existing, req))) {
        return { kind: "error", status: 404, detail: "Chat not found" };
      }
      if (
        req.projectIdProvided &&
        existing.projectId !== (req.scope.type === "project" ? req.scope.projectId : null)
      ) {
        return { kind: "error", status: 400, detail: "project_id does not match chat" };
      }
      if (
        req.workspaceIdProvided &&
        existing.workspaceId !== (req.scope.type === "workspace" ? req.scope.workspaceId : null)
      ) {
        return { kind: "error", status: 400, detail: "workspace_id does not match chat" };
      }
      projectId = existing.projectId ?? projectId;
      workspaceId = existing.workspaceId ?? workspaceId;
      chatTitle = existing.title;
    }

    if (!chatId) {
      const accessError = await this.policy.authorizeNewGeneralScope(req, req.scope);
      if (accessError) return accessError;
      const chat = await this.repository.createChat({
        userId: req.userId,
        sessionId: req.sessionId ?? null,
        projectId,
        workspaceId,
      });
      if (!chat) return { kind: "error", status: 500, detail: "Failed to create chat" };
      chatId = chat.id;
      chatTitle = chat.title;
    }

    return {
      kind: "ok",
      session: { chatId, chatTitle, projectId, workspaceId },
    };
  }

  private async resolveProject(req: OrchestratorRequest): Promise<ChatSessionResult> {
    if (req.scope.type !== "project") {
      return { kind: "error", status: 400, detail: "Project scope is required" };
    }
    const existing = req.chatId ? await this.repository.findChat(req.chatId) : null;
    const chat =
      existing?.projectId === req.scope.projectId
        ? existing
        : await this.repository.createChat({
            userId: req.userId,
            sessionId: req.sessionId ?? null,
            projectId: req.scope.projectId,
            workspaceId: null,
          });
    if (!chat) return { kind: "error", status: 500, detail: "Failed to create chat" };
    return {
      kind: "ok",
      session: {
        chatId: chat.id,
        chatTitle: chat.title,
        projectId: req.scope.projectId,
        workspaceId: null,
      },
    };
  }

  private async resolveWorkspace(req: OrchestratorRequest): Promise<ChatSessionResult> {
    if (req.scope.type !== "workspace") {
      return { kind: "error", status: 400, detail: "Workspace scope is required" };
    }
    const existing = req.chatId ? await this.repository.findChat(req.chatId) : null;
    const chat =
      existing?.workspaceId === req.scope.workspaceId
        ? existing
        : await this.repository.createChat({
            userId: req.userId,
            sessionId: req.sessionId ?? null,
            projectId: null,
            workspaceId: req.scope.workspaceId,
          });
    if (!chat) return { kind: "error", status: 500, detail: "Failed to create chat" };
    return {
      kind: "ok",
      session: {
        chatId: chat.id,
        chatTitle: chat.title,
        projectId: null,
        workspaceId: req.scope.workspaceId,
      },
    };
  }
}
