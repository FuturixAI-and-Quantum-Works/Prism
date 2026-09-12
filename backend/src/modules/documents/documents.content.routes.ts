import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { singleFileUpload } from "../../lib/upload.js";
import { createDocumentsContentController } from "./documents.content.controller.js";
import type { DocumentsService } from "./documents.service.js";

export function createDocumentsContentRouter(service: DocumentsService): Router {
  const router = Router();
  const controller = createDocumentsContentController(service);
  router.post("/download-zip", requireAuth, controller.downloadZip);
  router.get("/:documentId/display", requireAuth, controller.display);
  router.get("/:documentId/url", requireAuth, controller.url);
  router.get("/:documentId/preview-summary", requireAuth, controller.previewSummary);
  router.get("/:documentId/docx", requireAuth, controller.docx);
  router.get("/:documentId/html", requireAuth, controller.html);
  router.get("/:documentId/versions", requireAuth, controller.listVersions);
  router.post(
    "/:documentId/versions",
    requireAuth,
    singleFileUpload("file"),
    controller.uploadVersion,
  );
  router.post("/:documentId/versions/from-html", requireAuth, controller.saveHtmlVersion);
  router.patch("/:documentId/versions/:versionId", requireAuth, controller.renameVersion);
  router.get("/:documentId/tracked-change-ids", requireAuth, controller.trackedChanges);
  router.post("/:documentId/export", requireAuth, controller.export);
  return router;
}
