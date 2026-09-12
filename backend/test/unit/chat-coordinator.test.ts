import { describe, expect, it, vi } from "vitest";
import { ChatCoordinator } from "../../src/modules/chat/chat.coordinator.js";
import type {
  AssembledChatContext,
  OrchestratorRequest,
} from "../../src/modules/chat/chat.types.js";

const request: OrchestratorRequest = {
  userId: "user-1",
  routeMode: "general",
  scope: { type: "personal" },
  messages: [{ role: "user", content: "Hello" }],
};

const session = {
  chatId: "chat-1",
  chatTitle: null,
  projectId: null,
  workspaceId: null,
};

function assembled(): AssembledChatContext {
  return {
    req: request,
    session,
    lastUser: request.messages[0],
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
  };
}

function coordinator(execute = vi.fn(async () => ({ fullText: "Reply", events: [] }))) {
  const persistence = {
    saveUserTurn: vi.fn(async () => undefined),
    saveAssistantTurn: vi.fn(async () => undefined),
  };
  return {
    instance: new ChatCoordinator(
      {
        authorizeRoute: vi.fn(async () => null),
        loadActiveDocumentContexts: vi.fn(async () => ({
          kind: "ok" as const,
          contexts: [],
        })),
      },
      {
        resolve: vi.fn(async () => ({ kind: "ok" as const, session })),
      },
      {
        assemble: vi.fn(async () => assembled()),
      },
      persistence,
      {
        prepareEphemeral: vi.fn(),
        execute,
      },
    ),
    persistence,
    execute,
  };
}

describe("chat coordinator", () => {
  it("stores the user turn before assembling context", async () => {
    const order: string[] = [];
    const persistence = {
      saveUserTurn: vi.fn(async () => {
        order.push("user");
      }),
      saveAssistantTurn: vi.fn(),
    };
    const instance = new ChatCoordinator(
      {
        authorizeRoute: vi.fn(async () => null),
        loadActiveDocumentContexts: vi.fn(async () => ({
          kind: "ok" as const,
          contexts: [],
        })),
      },
      {
        resolve: vi.fn(async () => ({ kind: "ok" as const, session })),
      },
      {
        assemble: vi.fn(async () => {
          order.push("context");
          throw new Error("context failed");
        }),
      },
      persistence,
      {
        prepareEphemeral: vi.fn(),
        execute: vi.fn(),
      },
    );

    await expect(instance.handle(request)).rejects.toThrow("context failed");
    expect(order).toEqual(["user", "context"]);
    expect(persistence.saveAssistantTurn).not.toHaveBeenCalled();
  });

  it("emits the chat id before AI events and persists the completed turn", async () => {
    const order: string[] = [];
    const setup = coordinator(
      vi.fn(async (_context, _intent, write) => {
        order.push("execute");
        write({ type: "content_delta", text: "Reply" });
        return { fullText: "Reply", events: [{ type: "content", text: "Reply" }] };
      }),
    );
    setup.persistence.saveAssistantTurn.mockImplementation(async () => {
      order.push("persist");
    });
    const result = await setup.instance.handle(request);
    if (result.kind !== "stream") throw new Error("Expected stream");

    await result.stream(
      {
        event: (event) => {
          order.push(event.type);
        },
        error: vi.fn(),
        complete: vi.fn(),
      },
      new AbortController().signal,
    );

    expect(order).toEqual(["chat_id", "execute", "content_delta", "persist"]);
    expect(setup.persistence.saveUserTurn).toHaveBeenCalledOnce();
    expect(setup.persistence.saveAssistantTurn).toHaveBeenCalledOnce();
  });

  it("does not persist an assistant turn when execution aborts", async () => {
    const controller = new AbortController();
    const setup = coordinator(
      vi.fn(async () => {
        controller.abort();
        throw new Error("aborted");
      }),
    );
    const result = await setup.instance.handle(request);
    if (result.kind !== "stream") throw new Error("Expected stream");

    await result.stream(
      {
        event: vi.fn(),
        error: vi.fn(),
        complete: vi.fn(),
      },
      controller.signal,
    );

    expect(setup.persistence.saveAssistantTurn).not.toHaveBeenCalled();
  });
});
