import { describe, expect, it, vi } from "vitest";
import { ChatSessionResolver } from "../../src/modules/chat/chat.session.js";

function repository() {
  return {
    findChat: vi.fn(),
    createChat: vi.fn(async (input) => ({
      id: "new-chat",
      title: null,
      userId: input.userId,
      projectId: input.projectId,
      workspaceId: input.workspaceId,
    })),
  };
}

function policy() {
  return {
    canAccessGeneralChat: vi.fn(async () => true),
    authorizeNewGeneralScope: vi.fn(async () => null),
  };
}

describe("chat session resolution", () => {
  it("rejects explicit null for an existing project association", async () => {
    const repo = repository();
    repo.findChat.mockResolvedValue({
      id: "chat-1",
      title: "Existing",
      userId: "user-1",
      projectId: "project-a",
      workspaceId: null,
    });
    const resolver = new ChatSessionResolver(repo, policy());

    await expect(
      resolver.resolve({
        userId: "user-1",
        routeMode: "general",
        scope: { type: "personal" },
        projectIdProvided: true,
        messages: [{ role: "user", content: "Hello" }],
        chatId: "chat-1",
      }),
    ).resolves.toEqual({
      kind: "error",
      status: 400,
      detail: "project_id does not match chat",
    });
  });

  it("inherits an existing project association when the id is omitted", async () => {
    const repo = repository();
    repo.findChat.mockResolvedValue({
      id: "chat-1",
      title: "Existing",
      userId: "user-1",
      projectId: "project-a",
      workspaceId: null,
    });
    const resolver = new ChatSessionResolver(repo, policy());

    await expect(
      resolver.resolve({
        userId: "user-1",
        routeMode: "general",
        scope: { type: "personal" },
        messages: [{ role: "user", content: "Hello" }],
        chatId: "chat-1",
      }),
    ).resolves.toEqual({
      kind: "ok",
      session: {
        chatId: "chat-1",
        chatTitle: "Existing",
        projectId: "project-a",
        workspaceId: null,
      },
    });
  });

  it("rejects a general-route project mismatch", async () => {
    const repo = repository();
    repo.findChat.mockResolvedValue({
      id: "chat-1",
      title: "Existing",
      userId: "user-1",
      projectId: "project-a",
      workspaceId: null,
    });
    const resolver = new ChatSessionResolver(repo, policy());

    await expect(
      resolver.resolve({
        userId: "user-1",
        routeMode: "general",
        scope: { type: "project", projectId: "project-b" },
        projectIdProvided: true,
        messages: [{ role: "user", content: "Hello" }],
        chatId: "chat-1",
      }),
    ).resolves.toEqual({
      kind: "error",
      status: 400,
      detail: "project_id does not match chat",
    });
    expect(repo.createChat).not.toHaveBeenCalled();
  });

  it("creates a new project chat when a scoped chat id belongs elsewhere", async () => {
    const repo = repository();
    repo.findChat.mockResolvedValue({
      id: "chat-1",
      title: "Existing",
      userId: "user-1",
      projectId: "project-a",
      workspaceId: null,
    });
    const resolver = new ChatSessionResolver(repo, policy());

    await expect(
      resolver.resolve({
        userId: "user-1",
        routeMode: "project",
        scope: { type: "project", projectId: "project-b" },
        messages: [{ role: "user", content: "Hello" }],
        chatId: "chat-1",
      }),
    ).resolves.toEqual({
      kind: "ok",
      session: {
        chatId: "new-chat",
        chatTitle: null,
        projectId: "project-b",
        workspaceId: null,
      },
    });
    expect(repo.createChat).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: null,
      projectId: "project-b",
      workspaceId: null,
    });
  });

  it("reuses a matching workspace chat", async () => {
    const repo = repository();
    repo.findChat.mockResolvedValue({
      id: "chat-1",
      title: "Existing",
      userId: "another-user",
      projectId: null,
      workspaceId: "workspace-1",
    });
    const resolver = new ChatSessionResolver(repo, policy());

    await expect(
      resolver.resolve({
        userId: "user-1",
        routeMode: "workspace",
        scope: { type: "workspace", workspaceId: "workspace-1" },
        messages: [{ role: "user", content: "Hello" }],
        chatId: "chat-1",
      }),
    ).resolves.toEqual({
      kind: "ok",
      session: {
        chatId: "chat-1",
        chatTitle: "Existing",
        projectId: null,
        workspaceId: "workspace-1",
      },
    });
    expect(repo.createChat).not.toHaveBeenCalled();
  });
});
