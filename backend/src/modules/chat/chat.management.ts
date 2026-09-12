import { completeText } from "../../lib/llm/index.js";
import { getUserModelSettings } from "../../lib/userSettings.js";
import type { ChatPolicy } from "./chat.policy.js";
import type { ChatRepository } from "./chat.repository.js";
import type { AccessibleChat, ChatActor } from "./chat.types.js";

export class ChatManagementError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type ChatManagementDependencies = Readonly<{
  completeText: typeof completeText;
  getUserModelSettings: typeof getUserModelSettings;
}>;

const defaultDependencies: ChatManagementDependencies = {
  completeText,
  getUserModelSettings,
};

export class ChatManagementService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly policy: ChatPolicy,
    private readonly dependencies: ChatManagementDependencies = defaultDependencies,
  ) {}

  listPersonalSessions(userId: string): Promise<unknown[]> {
    return this.repository.listPersonalSessions(userId);
  }

  async createSession(
    actor: ChatActor,
    input: { projectId: string | null; workspaceId: string | null },
  ): Promise<{ id: string; type: "session" }> {
    if (input.projectId) {
      const error = await this.policy.authorizeProjectRead(actor, input.projectId);
      if (error) throw new ChatManagementError(error.status, error.detail);
    }
    if (input.workspaceId) {
      const error = await this.policy.authorizeWorkspaceRead(actor.userId, input.workspaceId);
      if (error) throw new ChatManagementError(error.status, error.detail);
    }
    const id = await this.repository.createSession({
      userId: actor.userId,
      projectId: input.projectId,
      workspaceId: input.workspaceId,
    });
    return { id, type: "session" };
  }

  async createChat(
    actor: ChatActor,
    input: { sessionId: string | null; projectId: string | null },
  ): Promise<{ id: string }> {
    if (input.projectId) {
      const error = await this.policy.authorizeProjectRead(actor, input.projectId);
      if (error) throw new ChatManagementError(error.status, error.detail);
    }
    if (input.sessionId) {
      const error = await this.policy.authorizeChat(actor, input.sessionId, "read");
      if (error) throw new ChatManagementError(error.status, error.detail);
    }
    const id = await this.repository.createManagedChat({
      userId: actor.userId,
      sessionId: input.sessionId,
      projectId: input.projectId,
    });
    if (input.sessionId) await this.repository.touchSession(input.sessionId);
    return { id };
  }

  async getChat(
    actor: ChatActor,
    chatId: string,
  ): Promise<{
    chat: Omit<AccessibleChat, "workspaceId">;
    messages: Record<string, unknown>[];
  }> {
    const chat = await this.accessibleChat(actor, chatId);
    if (!chat) throw new ChatManagementError(404, "Chat not found");
    return {
      chat: {
        id: chat.id,
        title: chat.title,
        userId: chat.userId,
        projectId: chat.projectId,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
      messages: await this.repository.listHydratedMessages(chatId),
    };
  }

  async updateTitle(
    actor: ChatActor,
    chatId: string,
    title: string,
  ): Promise<{ id: string; title: string }> {
    const error = await this.policy.authorizeChat(actor, chatId, "write");
    if (error) throw new ChatManagementError(error.status, error.detail);
    if (!(await this.repository.updateTitle(chatId, title))) {
      throw new ChatManagementError(404, "Chat not found");
    }
    return { id: chatId, title };
  }

  async deleteChat(actor: ChatActor, chatId: string): Promise<void> {
    const error = await this.policy.authorizeChat(actor, chatId, "delete");
    if (error) throw new ChatManagementError(error.status, error.detail);
    await this.repository.deleteChat(chatId);
  }

  async generateTitle(actor: ChatActor, chatId: string, message: string): Promise<string> {
    const chat = await this.accessibleChat(actor, chatId);
    if (!chat) throw new ChatManagementError(404, "Chat not found");
    const { titleModel, aiRuntime } = await this.dependencies.getUserModelSettings(actor.userId);
    const generated = await this.dependencies.completeText({
      model: titleModel,
      task: "title",
      user: `Generate a concise title (3–6 words) for a chat in an AI Legal Platform that starts with this message. The title should describe the topic or document — do NOT include words like "Legal Assistant", "AI", "Chat", or any similar prefix. Return only the title, no quotes or punctuation.\n\nMessage: ${message.slice(0, 500)}`,
      maxTokens: 64,
      runtime: aiRuntime,
    });
    const title = generated.trim() || message.slice(0, 60);
    await this.repository.setTitle(chatId, title);
    return title;
  }

  async listWorkspaceChats(
    userId: string,
    workspaceId: string,
  ): Promise<
    {
      id: string;
      title: string | null;
      created_at: Date;
      updated_at: Date;
    }[]
  > {
    const error = await this.policy.authorizeWorkspaceRead(userId, workspaceId);
    if (error) throw new ChatManagementError(error.status, error.detail);
    const chats = await this.repository.listWorkspaceChats(workspaceId);
    return chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      created_at: chat.createdAt,
      updated_at: chat.updatedAt,
    }));
  }

  private async accessibleChat(actor: ChatActor, chatId: string): Promise<AccessibleChat | null> {
    const chat = await this.repository.findChat(chatId);
    if (!chat || !(await this.policy.canAccessGeneralChat(chat, actor))) return null;
    return chat;
  }
}
