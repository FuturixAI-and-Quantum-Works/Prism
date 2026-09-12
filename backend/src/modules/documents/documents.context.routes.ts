import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createDocumentsContextController } from "./documents.context.controller.js";
import type { DocumentContextService } from "./documents.context.service.js";

export function createDocumentsContextRouter(service: DocumentContextService): Router {
  const router = Router();
  const controller = createDocumentsContextController(service);
  router.get("/:documentId/context-files", requireAuth, controller.list);
  router.post("/:documentId/context-files", requireAuth, controller.add);
  router.delete("/:documentId/context-files/:contextFileId", requireAuth, controller.remove);
  return router;
}
