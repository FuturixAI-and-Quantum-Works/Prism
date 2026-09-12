import { describe, expect, it, vi } from "vitest";
import { ChatTurnPersistence } from "../../src/modules/chat/chat.persistence.js";
import type { AssembledChatContext } from "../../src/modules/chat/chat.types.js";

describe("chat turn persistence", () => {
  it("stores scoped attachments on the user turn", async () => {
    const repository = {
      saveMessage: vi.fn(async () => undefined),
      setTitle: vi.fn(async () => undefined),
    };
    const persistence = new ChatTurnPersistence(repository, vi.fn());
    const message = { role: "user", content: "Review this" };

    await persistence.saveUserTurn(
      {
        userId: "user-1",
        routeMode: "project",
        scope: { type: "project", projectId: "project-1" },
        messages: [message],
        attachedItems: [{ id: "document-1", filename: "agreement.docx" }],
      },
      {
        chatId: "chat-1",
        chatTitle: null,
        projectId: "project-1",
        workspaceId: null,
      },
      message,
      [],
    );

    expect(repository.saveMessage).toHaveBeenCalledWith({
      chatId: "chat-1",
      role: "user",
      content: "Review this",
      files: [{ filename: "agreement.docx", document_id: "document-1" }],
      workflow: null,
    });
  });

  it("stores assistant events and derives the initial title after the turn", async () => {
    const repository = {
      saveMessage: vi.fn(async () => undefined),
      setTitle: vi.fn(async () => undefined),
    };
    const persistence = new ChatTurnPersistence(repository, vi.fn());
    const context = {
      req: {
        userId: "user-1",
        routeMode: "general",
        scope: { type: "personal" },
        messages: [{ role: "user", content: "A concise title" }],
      },
      session: {
        chatId: "chat-1",
        chatTitle: null,
        projectId: null,
        workspaceId: null,
      },
      lastUser: { role: "user", content: "A concise title" },
      activeDocumentContexts: [],
      docIndex: {},
      docStore: new Map(),
      folderPaths: new Map(),
      templates: [],
      workflowStore: new Map(),
      ragScope: { type: "personal", id: "user-1", name: "Personal" },
      ragCollection: null,
      ragStatus: { indexedSourceCount: 0 },
      interviewState: null,
      aiRuntime: { connections: [], models: [] },
      baseSystemPromptExtra: "",
    } satisfies AssembledChatContext;

    await persistence.saveAssistantTurn(context, {
      fullText: "Done",
      events: [{ type: "content", text: "Done" }],
      annotations: [{ ref: 1 }],
    });

    expect(repository.saveMessage).toHaveBeenCalledWith({
      chatId: "chat-1",
      role: "assistant",
      content: JSON.stringify([{ type: "content", text: "Done" }]),
      annotations: [{ ref: 1 }],
    });
    expect(repository.setTitle).toHaveBeenCalledWith("chat-1", "A concise title");
  });
});
