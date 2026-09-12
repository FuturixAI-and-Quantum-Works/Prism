import { Router } from "express";
import { singleFileUpload } from "../../lib/upload.js";
import { requireAuth } from "../../middleware/auth.js";
import { createDriveController, type DriveServices } from "./drive.controller.js";

/**
 * @swagger
 * /drive/files:
 *   get:
 *     tags: [Drive]
 *     summary: List generic drive files
 *   post:
 *     tags: [Drive]
 *     summary: Upload a generic drive file
 * /drive/files/copy:
 *   post:
 *     tags: [Drive]
 *     summary: Copy generic drive files
 * /drive/items/move:
 *   post:
 *     tags: [Drive]
 *     summary: Bulk move drive files and folders
 * /drive/items/delete:
 *   post:
 *     tags: [Drive]
 *     summary: Permanently delete drive files and folders
 * /drive/files/{fileId}:
 *   get:
 *     tags: [Drive]
 *     summary: Get a generic drive file
 *   patch:
 *     tags: [Drive]
 *     summary: Rename, describe, or move a generic drive file within its current scope
 *   delete:
 *     tags: [Drive]
 *     summary: Permanently delete a generic drive file
 * /drive/files/{fileId}/url:
 *   get:
 *     tags: [Drive]
 *     summary: Get a signed generic drive file download URL
 *     parameters:
 *       - name: inline
 *         in: query
 *         description: Use inline disposition for preview instead of attachment
 *         schema:
 *           type: boolean
 * /drive/folders:
 *   get:
 *     tags: [Drive]
 *     summary: List generic drive folders
 *   post:
 *     tags: [Drive]
 *     summary: Create a generic drive folder
 * /drive/folders/{folderId}:
 *   get:
 *     tags: [Drive]
 *     summary: Get a generic drive folder
 *   patch:
 *     tags: [Drive]
 *     summary: Update or move a generic drive folder within its current scope
 *   delete:
 *     tags: [Drive]
 *     summary: Permanently delete a generic drive folder recursively
 * /drive/workspaces:
 *   get:
 *     tags: [Drive]
 *     summary: List minimal drive workspaces
 *   post:
 *     tags: [Drive]
 *     summary: Create a minimal drive workspace
 * /drive/workspaces/{workspaceId}:
 *   get:
 *     tags: [Drive]
 *     summary: Get a minimal drive workspace
 *   patch:
 *     tags: [Drive]
 *     summary: Update a minimal drive workspace
 *   delete:
 *     tags: [Drive]
 *     summary: Permanently delete a minimal drive workspace and its contents
 * /drive/workspaces/{workspaceId}/members:
 *   get:
 *     tags: [Drive]
 *     summary: List workspace members
 *   post:
 *     tags: [Drive]
 *     summary: Add or update a workspace member
 *   delete:
 *     tags: [Drive]
 *     summary: Remove a workspace member
 * /drive/workspaces/{workspaceId}/invitations:
 *   get:
 *     tags: [Drive]
 *     summary: List pending workspace invitations
 *   post:
 *     tags: [Drive]
 *     summary: Invite a workspace collaborator by email
 * /drive/workspaces/{workspaceId}/request-access:
 *   post:
 *     tags: [Drive]
 *     summary: Request access to a workspace
 * /drive/workspaces/{workspaceId}/access-requests:
 *   get:
 *     tags: [Drive]
 *     summary: List pending access requests for a workspace
 * /drive/workspaces/{workspaceId}/access-requests/{requestId}:
 *   patch:
 *     tags: [Drive]
 *     summary: Approve or reject an access request
 */
export function createDriveRouter(services: DriveServices): Router {
  const router = Router();
  const controller = createDriveController(services);

  router.get("/files", requireAuth, controller.listFiles);
  router.post("/files", requireAuth, singleFileUpload("file"), controller.uploadFile);
  router.post("/files/copy", requireAuth, controller.copyFiles);
  router.post("/items/move", requireAuth, controller.moveItems);
  router.post("/items/delete", requireAuth, controller.deleteItems);
  router.get("/files/:fileId", requireAuth, controller.getFile);
  router.patch("/files/:fileId", requireAuth, controller.updateFile);
  router.delete("/files/:fileId", requireAuth, controller.deleteFile);
  router.get("/files/:fileId/url", requireAuth, controller.fileUrl);
  router.get("/files/:fileId/preview-summary", requireAuth, controller.previewFile);
  router.get("/files/:fileId/versions", requireAuth, controller.listVersions);
  router.post(
    "/files/:fileId/versions",
    requireAuth,
    singleFileUpload("file"),
    controller.createVersion,
  );
  router.get("/files/:fileId/activity", requireAuth, controller.fileActivity);

  router.get("/folders", requireAuth, controller.listFolders);
  router.post("/folders", requireAuth, controller.createFolder);
  router.get("/folders/:folderId", requireAuth, controller.getFolder);
  router.patch("/folders/:folderId", requireAuth, controller.updateFolder);
  router.delete("/folders/:folderId", requireAuth, controller.deleteFolder);

  router.get("/workspaces", requireAuth, controller.listWorkspaces);
  router.post("/workspaces", requireAuth, controller.createWorkspace);
  router.get("/workspaces/:workspaceId", requireAuth, controller.getWorkspace);
  router.patch("/workspaces/:workspaceId", requireAuth, controller.updateWorkspace);
  router.delete("/workspaces/:workspaceId", requireAuth, controller.deleteWorkspace);
  router.get("/workspaces/:workspaceId/activity", requireAuth, controller.workspaceActivity);
  router.get("/workspaces/:workspaceId/members", requireAuth, controller.listMembers);
  router.post("/workspaces/:workspaceId/members", requireAuth, controller.upsertMember);
  router.delete("/workspaces/:workspaceId/members", requireAuth, controller.removeMember);
  router.get("/workspaces/:workspaceId/invitations", requireAuth, controller.listInvitations);
  router.post("/workspaces/:workspaceId/invitations", requireAuth, controller.createInvitation);
  router.post("/workspaces/:workspaceId/request-access", requireAuth, controller.requestAccess);
  router.get(
    "/workspaces/:workspaceId/access-requests",
    requireAuth,
    controller.listAccessRequests,
  );
  router.patch(
    "/workspaces/:workspaceId/access-requests/:requestId",
    requireAuth,
    controller.decideAccessRequest,
  );

  return router;
}
