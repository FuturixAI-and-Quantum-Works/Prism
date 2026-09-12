import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { singleFileUpload } from "../../lib/upload.js";
import { createDocumentsCoreController } from "./documents.core.controller.js";
import type { DocumentsService } from "./documents.service.js";

export function createDocumentsCoreRouter(service: DocumentsService): Router {
  const router = Router();
  const controller = createDocumentsCoreController(service);
  router.get("/", requireAuth, controller.list);
  router.post("/", requireAuth, controller.create);
  router.post("/upload", requireAuth, singleFileUpload("file"), controller.upload);
  router.get("/:documentId", requireAuth, controller.get);
  router.patch("/:documentId", requireAuth, controller.update);
  router.delete("/:documentId", requireAuth, controller.remove);
  return router;
}
