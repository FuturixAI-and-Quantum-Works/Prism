import {
  assertDocumentActionAllowed,
  documentPermissionMessage,
  documentPermissionStatus,
} from "../documents/documents.permissions.service.js";
import type { AccessAuthority } from "../access/access.authority.js";
import { accessAuthority } from "../access/access.composition.js";
import type {
  AccessibleChat,
  ActiveDocumentContext,
  ChatActor,
  ChatMessage,
  ChatScope,
  OrchestratorRequest,
} from "./chat.types.js";

export type ChatPolicyError = Readonly<{
  kind: "error";
  status: number;
  detail: string;
}>;

type ChatPolicyDependencies = Readonly<{
  authority: Pick<AccessAuthority, "decide">;
  assertDocumentActionAllowed: typeof assertDocumentActionAllowed;
  documentPermissionMessage: typeof documentPermissionMessage;
  documentPermissionStatus: typeof documentPermissionStatus;
}>;

const defaultDependencies: ChatPolicyDependencies = {
  authority: accessAuthority,
  assertDocumentActionAllowed,
  documentPermissionMessage,
  documentPermissionStatus,
};

export function documentIdsFromMessages(messages: readonly ChatMessage[]): string[] {
  const ids = new Set<string>();
  for (const message of messages) {
    for (const file of message.files ?? []) {
      if (typeof file.document_id === "string" && file.document_id.trim()) {
        ids.add(file.document_id.trim());
      }
    }
  }
  return [...ids];
}

export class ChatPolicy {
  constructor(private readonly dependencies: ChatPolicyDependencies = defaultDependencies) {}

  async authorizeRoute(req: OrchestratorRequest): Promise<ChatPolicyError | null> {
    if (req.routeMode === "project") {
      if (req.scope.type !== "project") {
        return { kind: "error", status: 400, detail: "Project scope is required" };
      }
      const decision = await this.dependencies.authority.decide({
        actor: { userId: req.userId, email: req.userEmail?.toLowerCase() ?? "" },
        resource: { kind: "project", id: req.scope.projectId },
        action: "write",
      });
      if (!decision.allowed && decision.reason === "not-found") {
        return { kind: "error", status: 404, detail: "Project not found" };
      }
      if (!decision.allowed) {
        return {
          kind: "error",
          status: 403,
          detail: "You do not have permission to use project editing tools",
        };
      }
    }
    if (req.routeMode === "workspace") {
      if (req.scope.type !== "workspace") {
        return { kind: "error", status: 400, detail: "Workspace scope is required" };
      }
      return this.authorizeWorkspace(req.userId, req.scope.workspaceId);
    }
    return null;
  }

  async authorizeNewGeneralScope(
    actor: ChatActor,
    scope: ChatScope,
  ): Promise<ChatPolicyError | null> {
    if (scope.type === "project") {
      return this.authorizeProjectRead(actor, scope.projectId);
    }
    if (scope.type === "workspace") {
      return this.authorizeWorkspace(actor.userId, scope.workspaceId);
    }
    return null;
  }

  async authorizeProjectRead(actor: ChatActor, projectId: string): Promise<ChatPolicyError | null> {
    const decision = await this.dependencies.authority.decide({
      actor: { userId: actor.userId, email: actor.userEmail?.toLowerCase() ?? "" },
      resource: { kind: "project", id: projectId },
      action: "read",
    });
    return decision.allowed ? null : { kind: "error", status: 404, detail: "Project not found" };
  }

  authorizeWorkspaceRead(userId: string, workspaceId: string): Promise<ChatPolicyError | null> {
    return this.authorizeWorkspace(userId, workspaceId);
  }

  async authorizeChat(
    actor: ChatActor,
    chatId: string,
    action: "read" | "write" | "delete",
  ): Promise<ChatPolicyError | null> {
    const decision = await this.dependencies.authority.decide({
      actor: { userId: actor.userId, email: actor.userEmail?.toLowerCase() ?? "" },
      resource: { kind: "chat", id: chatId },
      action,
    });
    if (decision.allowed) return null;
    return {
      kind: "error",
      status: decision.reason === "not-found" ? 404 : 403,
      detail:
        action === "read" ? "Chat not found" : "You do not have permission to modify this chat",
    };
  }

  async canAccessGeneralChat(chat: AccessibleChat, actor: ChatActor): Promise<boolean> {
    return (
      await this.dependencies.authority.decide({
        actor: { userId: actor.userId, email: actor.userEmail?.toLowerCase() ?? "" },
        resource: { kind: "chat", id: chat.id },
        action: "read",
      })
    ).allowed;
  }

  async loadActiveDocumentContexts(
    req: OrchestratorRequest,
  ): Promise<{ kind: "ok"; contexts: ActiveDocumentContext[] } | ChatPolicyError> {
    if (req.routeMode !== "general") return { kind: "ok", contexts: [] };
    const contexts: ActiveDocumentContext[] = [];
    for (const documentId of documentIdsFromMessages(req.messages)) {
      try {
        contexts.push(
          await this.dependencies.assertDocumentActionAllowed(
            documentId,
            req.userId,
            req.userEmail,
            "read_document",
          ),
        );
      } catch (error) {
        return {
          kind: "error",
          status: this.dependencies.documentPermissionStatus(error),
          detail: this.dependencies.documentPermissionMessage(error),
        };
      }
    }
    return { kind: "ok", contexts };
  }

  private async authorizeWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<ChatPolicyError | null> {
    const decision = await this.dependencies.authority.decide({
      actor: { userId, email: "" },
      resource: { kind: "workspace", id: workspaceId },
      action: "read",
    });
    return decision.allowed ? null : { kind: "error", status: 404, detail: "Workspace not found" };
  }
}
