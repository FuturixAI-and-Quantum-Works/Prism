import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createTabularController } from "./tabular.controller.js";
import type { TabularService } from "./tabular.service.js";

export function createTabularRouter(service: TabularService): Router {
  const router = Router();
  const controller = createTabularController(service);
  router.get("/", requireAuth, controller.list);
  router.post("/", requireAuth, controller.create);
  router.post("/prompt", requireAuth, controller.prompt);
  router.get("/:reviewId/people", requireAuth, controller.people);
  router.post("/:reviewId/clear-cells", requireAuth, controller.clearCells);
  router.post("/:reviewId/generate", requireAuth, controller.startGenerate);
  router.get("/:reviewId/generate", requireAuth, controller.reconnectGenerate);
  router.delete("/:reviewId/generate", requireAuth, controller.cancelGenerate);
  router.post("/:reviewId/regenerate-cell", requireAuth, controller.regenerate);
  router.get("/:reviewId/regenerate-cell", requireAuth, controller.reconnectRegenerate);
  router.delete("/:reviewId/regenerate-cell", requireAuth, controller.cancelRegenerate);
  router.get("/:reviewId/chats", requireAuth, controller.listChats);
  router.delete("/:reviewId/chats/:chatId", requireAuth, controller.deleteChat);
  router.get("/:reviewId/chats/:chatId/messages", requireAuth, controller.listChatMessages);
  router.post("/:reviewId/chat", requireAuth, controller.chat);
  router.get("/:reviewId", requireAuth, controller.get);
  router.patch("/:reviewId", requireAuth, controller.update);
  router.delete("/:reviewId", requireAuth, controller.remove);
  return router;
}
