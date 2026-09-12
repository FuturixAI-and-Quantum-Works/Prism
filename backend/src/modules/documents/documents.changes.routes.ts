import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createDocumentsChangesController } from "./documents.changes.controller.js";
import type { DocumentChangesService } from "./documents.changes.service.js";

export function createDocumentsChangesRouter(service: DocumentChangesService): Router {
  const router = Router();
  const controller = createDocumentsChangesController(service);
  router.post("/:documentId/edits/:editId/accept", requireAuth, controller.acceptEdit);
  router.post("/:documentId/edits/:editId/reject", requireAuth, controller.rejectEdit);
  router.post("/:documentId/change-requests", requireAuth, controller.createRequest);
  router.get("/:documentId/change-requests", requireAuth, controller.listRequests);
  router.patch("/:documentId/change-requests/:requestId", requireAuth, controller.reviewRequest);
  return router;
}
