import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createDocumentsGovernanceController } from "./documents.governance.controller.js";
import type { DocumentGovernanceService } from "./documents.governance.service.js";
import { lifecycleRoutes } from "./documents.governance.validators.js";

export function createDocumentsGovernanceRouter(service: DocumentGovernanceService): Router {
  const router = Router();
  const controller = createDocumentsGovernanceController(service);
  router.get("/:documentId/session-context", requireAuth, controller.sessionContext);
  router.get("/:documentId/members", requireAuth, controller.listMembers);
  router.post("/:documentId/members", requireAuth, controller.assignMember);
  router.delete("/:documentId/members/:memberId", requireAuth, controller.revokeMember);
  router.get("/:documentId/shares", requireAuth, controller.listShares);
  router.post("/:documentId/invitations", requireAuth, controller.invite);
  router.patch("/:documentId/shares/:shareId", requireAuth, controller.updateShare);
  router.delete("/:documentId/shares/:shareId", requireAuth, controller.removeShare);
  for (const [path, action] of lifecycleRoutes) {
    router.post(`/:documentId/${path}`, requireAuth, controller.transition(action));
  }
  router.get("/:documentId/chat-messages", requireAuth, controller.listChatMessages);
  router.get("/:documentId/comments", requireAuth, controller.listComments);
  router.post("/:documentId/comments", requireAuth, controller.createComment);
  router.patch("/:documentId/comments/:commentId", requireAuth, controller.updateComment);
  router.delete("/:documentId/comments/:commentId", requireAuth, controller.deleteComment);
  router.get("/:documentId/activity", requireAuth, controller.listActivity);
  return router;
}
