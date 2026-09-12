import type { Request, RequestHandler, Response } from "express";
import { runSSEStream } from "../../lib/sseHelpers.js";
import type { ChatCoordinator } from "./chat.coordinator.js";
import { ChatManagementError, type ChatManagementService } from "./chat.management.js";
import type { ChatActor, ChatScope } from "./chat.types.js";
import {
  parseChatItem,
  parseChatItems,
  parseChatMessages,
  parseOptionalId,
  parseOptionalModel,
} from "./chat.validators.js";

function actor(res: Response): ChatActor {
  return {
    userId: res.locals.auth.user.id,
    userEmail: res.locals.auth.user.email.toLowerCase(),
  };
}

function bodyObject(req: Request): object {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => {
      if (error instanceof ChatManagementError) {
        res.status(error.status).json({ detail: error.message });
        return;
      }
      res.status(500).json({
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    });
  };
}

export function createChatController(
  coordinator: Pick<ChatCoordinator, "handle" | "handleEphemeral">,
  management: Pick<
    ChatManagementService,
    | "listPersonalSessions"
    | "createSession"
    | "createChat"
    | "getChat"
    | "updateTitle"
    | "deleteChat"
    | "generateTitle"
  >,
) {
  return {
    list: endpoint(async (_req, res) => {
      res.json(await management.listPersonalSessions(actor(res).userId));
    }),

    createSession: endpoint(async (req, res) => {
      const body = bodyObject(req);
      const project = parseOptionalId(Reflect.get(body, "project_id"), "project_id", {
        allowNull: true,
        mentionNull: true,
      });
      if (!project.ok) {
        res.status(400).json({ detail: project.detail });
        return;
      }
      const workspace = parseOptionalId(Reflect.get(body, "workspace_id"), "workspace_id", {
        allowNull: true,
        mentionNull: true,
      });
      if (!workspace.ok) {
        res.status(400).json({ detail: workspace.detail });
        return;
      }
      res.json(
        await management.createSession(actor(res), {
          projectId: project.value.value,
          workspaceId: workspace.value.value,
        }),
      );
    }),

    create: endpoint(async (req, res) => {
      const body = bodyObject(req);
      const project = parseOptionalId(Reflect.get(body, "project_id"), "project_id", {
        allowNull: true,
        mentionNull: true,
      });
      if (!project.ok) {
        res.status(400).json({ detail: project.detail });
        return;
      }
      const rawSessionId = Reflect.get(body, "session_id");
      const sessionId = typeof rawSessionId === "string" ? rawSessionId : null;
      res.json(
        await management.createChat(actor(res), {
          sessionId,
          projectId: project.value.value,
        }),
      );
    }),

    get: endpoint(async (req, res) => {
      res.json(await management.getChat(actor(res), req.params.chatId));
    }),

    update: endpoint(async (req, res) => {
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      if (!title) {
        res.status(400).json({ detail: "title is required" });
        return;
      }
      res.json(await management.updateTitle(actor(res), req.params.chatId, title));
    }),

    remove: endpoint(async (req, res) => {
      await management.deleteChat(actor(res), req.params.chatId);
      res.status(204).send();
    }),

    generateTitle: endpoint(async (req, res) => {
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!message) {
        res.status(400).json({ detail: "message is required" });
        return;
      }
      try {
        const title = await management.generateTitle(actor(res), req.params.chatId, message);
        res.json({ title });
      } catch (error) {
        if (error instanceof ChatManagementError) throw error;
        console.error("[generate-title]", error);
        res.status(500).json({ detail: "Failed to generate title" });
      }
    }),

    stream: endpoint(async (req, res) => {
      const body = bodyObject(req);
      const messages = parseChatMessages(Reflect.get(body, "messages"));
      if (!messages.ok) {
        res.status(400).json({ detail: messages.detail });
        return;
      }
      const chatId = parseOptionalId(Reflect.get(body, "chat_id"), "chat_id", {
        allowNull: true,
        mentionNull: false,
      });
      if (!chatId.ok) {
        res.status(400).json({ detail: chatId.detail });
        return;
      }
      const sessionId = parseOptionalId(Reflect.get(body, "session_id"), "session_id", {
        allowNull: true,
        mentionNull: false,
      });
      if (!sessionId.ok) {
        res.status(400).json({ detail: sessionId.detail });
        return;
      }
      const project = parseOptionalId(Reflect.get(body, "project_id"), "project_id", {
        allowNull: true,
        mentionNull: true,
      });
      if (!project.ok) {
        res.status(400).json({ detail: project.detail });
        return;
      }
      const workspace = parseOptionalId(Reflect.get(body, "workspace_id"), "workspace_id", {
        allowNull: true,
        mentionNull: true,
      });
      if (!workspace.ok) {
        res.status(400).json({ detail: workspace.detail });
        return;
      }
      const model = parseOptionalModel(Reflect.get(body, "model"));
      if (!model.ok) {
        res.status(400).json({ detail: model.detail });
        return;
      }
      if (Reflect.get(body, "ephemeral") === true) {
        const result = await coordinator.handleEphemeral({
          userId: actor(res).userId,
          messages: messages.value,
          model: model.value,
        });
        if (result.kind === "error") {
          res.status(result.status).json({ detail: result.detail });
          return;
        }
        await runSSEStream(req, res, result.stream);
        return;
      }
      const scope: ChatScope = workspace.value.value
        ? { type: "workspace", workspaceId: workspace.value.value }
        : project.value.value
          ? { type: "project", projectId: project.value.value }
          : { type: "personal" };
      const result = await coordinator.handle({
        ...actor(res),
        scope,
        routeMode: "general",
        messages: messages.value,
        chatId: chatId.value.value,
        sessionId: sessionId.value.value,
        projectIdProvided: project.value.provided,
        workspaceIdProvided: workspace.value.provided,
        model: model.value,
      });
      if (result.kind === "error") {
        res.status(result.status).json({ detail: result.detail });
        return;
      }
      await runSSEStream(req, res, result.stream);
    }),
  };
}

export function createProjectChatController(coordinator: Pick<ChatCoordinator, "handle">) {
  return endpoint(async (req, res) => {
    const body = bodyObject(req);
    const messages = parseChatMessages(Reflect.get(body, "messages"));
    if (!messages.ok) {
      res.status(400).json({ detail: messages.detail });
      return;
    }
    const chatId = Reflect.get(body, "chat_id");
    const model = Reflect.get(body, "model");
    const result = await coordinator.handle({
      ...actor(res),
      scope: { type: "project", projectId: req.params.projectId },
      routeMode: "project",
      messages: messages.value,
      chatId: typeof chatId === "string" ? chatId : null,
      model: typeof model === "string" ? model : undefined,
      displayedItem: parseChatItem(Reflect.get(body, "displayed_doc"), "document_id"),
      attachedItems: parseChatItems(Reflect.get(body, "attached_documents"), "document_id"),
    });
    if (result.kind === "error") {
      res.status(result.status).json({ detail: result.detail });
      return;
    }
    await runSSEStream(req, res, result.stream);
  });
}

export function createWorkspaceChatController(
  coordinator: Pick<ChatCoordinator, "handle">,
  management: Pick<ChatManagementService, "listWorkspaceChats">,
) {
  return {
    stream: endpoint(async (req, res) => {
      const body = bodyObject(req);
      const messages = parseChatMessages(Reflect.get(body, "messages"));
      if (!messages.ok) {
        res.status(400).json({ detail: messages.detail });
        return;
      }
      const chatId = Reflect.get(body, "chat_id");
      const model = Reflect.get(body, "model");
      const result = await coordinator.handle({
        ...actor(res),
        scope: { type: "workspace", workspaceId: req.params.workspaceId },
        routeMode: "workspace",
        messages: messages.value,
        chatId: typeof chatId === "string" ? chatId : null,
        model: typeof model === "string" ? model : undefined,
        displayedItem: parseChatItem(Reflect.get(body, "displayed_file"), "file_id"),
        attachedItems: parseChatItems(Reflect.get(body, "attached_files"), "file_id"),
      });
      if (result.kind === "error") {
        res.status(result.status).json({ detail: result.detail });
        return;
      }
      await runSSEStream(req, res, result.stream);
    }),

    list: endpoint(async (req, res) => {
      res.json(await management.listWorkspaceChats(actor(res).userId, req.params.workspaceId));
    }),
  };
}
