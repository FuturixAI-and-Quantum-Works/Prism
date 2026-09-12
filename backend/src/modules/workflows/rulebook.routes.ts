import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createRulebookController } from "./rulebook.controller.js";
import type { RulebookDraftService } from "./rulebook.service.js";

export function createRulebookRouter(service: RulebookDraftService): Router {
  const router = Router();
  const controller = createRulebookController(service);
  router.post("/generate", requireAuth, controller.generate);
  return router;
}
