import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createDocumentsPlaceholdersController } from "./documents.placeholders.controller.js";
import type { DocumentPlaceholdersService } from "./documents.placeholders.service.js";

export function createDocumentsPlaceholdersRouter(service: DocumentPlaceholdersService): Router {
  const router = Router();
  const controller = createDocumentsPlaceholdersController(service);
  router.get("/:documentId/placeholders", requireAuth, controller.get);
  router.put("/:documentId/placeholders/values", requireAuth, controller.save);
  router.post("/:documentId/placeholders/apply", requireAuth, controller.apply);
  router.get("/:documentId/edits", requireAuth, controller.listEdits);
  return router;
}
