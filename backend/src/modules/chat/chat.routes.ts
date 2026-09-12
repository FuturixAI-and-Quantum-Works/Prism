import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import type { createChatComposition } from "./chat.composition.js";

type ChatControllers = ReturnType<typeof createChatComposition>["controllers"];
type ProjectChatController = ChatControllers["project"];
type WorkspaceChatController = ChatControllers["workspace"];

export function createChatRouter(chatControllers: ChatControllers): Router {
  const router = Router();
  router.get("/", requireAuth, chatControllers.general.list);
  router.post("/session", requireAuth, chatControllers.general.createSession);
  router.post("/create", requireAuth, chatControllers.general.create);
  router.get("/:chatId", requireAuth, chatControllers.general.get);
  router.patch("/:chatId", requireAuth, chatControllers.general.update);
  router.delete("/:chatId", requireAuth, chatControllers.general.remove);
  router.post("/:chatId/generate-title", requireAuth, chatControllers.general.generateTitle);
  router.post("/", requireAuth, chatControllers.general.stream);
  return router;
}

export function createProjectChatRouter(controller: ProjectChatController): Router {
  const router = Router({ mergeParams: true });
  router.post("/", requireAuth, controller);
  return router;
}

export function createWorkspaceChatRouter(controller: WorkspaceChatController): Router {
  const router = Router({ mergeParams: true });
  router.post("/", requireAuth, controller.stream);
  router.get("/chats", requireAuth, controller.list);
  return router;
}
