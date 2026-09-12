import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createComplianceController } from "./compliance.controller.js";
import type { ComplianceService } from "./compliance.service.js";

export function createComplianceRouter(service: ComplianceService): Router {
  const router = Router();
  const controller = createComplianceController(service);

  router.post("/", requireAuth, controller.create);
  router.get("/", requireAuth, controller.list);
  router.get("/for-document/:documentId", requireAuth, controller.forDocument);
  router.get("/for-workspace/:workspaceId", requireAuth, controller.forWorkspace);
  router.post("/:reviewId/run", requireAuth, controller.startRun);
  router.get("/:reviewId/run", requireAuth, controller.reconnectRun);
  router.delete("/:reviewId/run", requireAuth, controller.cancelRun);
  router.post("/:reviewId/supporting-docs", requireAuth, controller.addSupportingDocument);
  router.delete(
    "/:reviewId/supporting-docs/:docId",
    requireAuth,
    controller.removeSupportingDocument,
  );
  router.post("/:reviewId/rules", requireAuth, controller.addRule);
  router.patch("/:reviewId/rules/:ruleId", requireAuth, controller.updateRule);
  router.delete("/:reviewId/rules/:ruleId", requireAuth, controller.removeRule);
  router.post("/:reviewId/questions", requireAuth, controller.addQuestion);
  router.patch("/:reviewId/questions/:questionId", requireAuth, controller.updateQuestion);
  router.delete("/:reviewId/questions/:questionId", requireAuth, controller.removeQuestion);
  router.get("/:reviewId", requireAuth, controller.get);
  router.patch("/:reviewId", requireAuth, controller.update);
  router.delete("/:reviewId", requireAuth, controller.remove);

  return router;
}
