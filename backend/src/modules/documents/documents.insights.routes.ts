import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createDocumentsInsightsController } from "./documents.insights.controller.js";
import type { DocumentInsightsService } from "./documents.insights.service.js";

export function createDocumentsInsightsRouter(service: DocumentInsightsService): Router {
  const router = Router();
  const controller = createDocumentsInsightsController(service);
  router.get("/:documentId/insights", requireAuth, controller.generate);
  return router;
}
