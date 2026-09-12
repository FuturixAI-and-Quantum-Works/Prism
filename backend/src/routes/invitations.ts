import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sharingService } from "../modules/sharing/sharing.service.js";
import { sharingMessage, sharingStatus } from "../modules/sharing/sharing.types.js";

export const invitationsRouter = Router();

function sendError(res: import("express").Response, error: unknown) {
  res.status(sharingStatus(error)).json({ detail: sharingMessage(error) });
}

function setPublicResponseHeaders(res: import("express").Response): void {
  res.set({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
}

function getResourceId(invitation: {
  resourceType: string;
  documentId: string | null;
  projectId: string | null;
  workspaceId: string | null;
}): string | null {
  if (invitation.resourceType === "document") return invitation.documentId;
  if (invitation.resourceType === "project") return invitation.projectId;
  if (invitation.resourceType === "workspace") return invitation.workspaceId;
  return null;
}

export function publicInvitationDto(
  invitation: Parameters<typeof getResourceId>[0] & {
    role: string;
    status: string;
  },
  resourceName: string,
) {
  return {
    resource_type: invitation.resourceType,
    resource_id: getResourceId(invitation),
    resource_name: resourceName,
    role: invitation.role,
    status: invitation.status,
  };
}

invitationsRouter.get("/:token", async (req, res) => {
  setPublicResponseHeaders(res);
  try {
    const { invitation, resourceName } = await sharingService.invitationForToken(req.params.token);
    res.json(publicInvitationDto(invitation, resourceName));
  } catch (error) {
    sendError(res, error);
  }
});

invitationsRouter.post("/:token/accept", requireAuth, async (req, res) => {
  setPublicResponseHeaders(res);
  const userId = res.locals.auth.user.id;
  const userEmail = res.locals.auth.user.email.toLowerCase();
  try {
    const { invitation, resourceName } = await sharingService.acceptByToken({
      token: req.params.token,
      userId,
      userEmail,
    });

    res.json({
      ok: true,
      ...publicInvitationDto(invitation, resourceName),
    });
  } catch (error) {
    sendError(res, error);
  }
});

invitationsRouter.post("/:token/decline", requireAuth, async (req, res) => {
  setPublicResponseHeaders(res);
  const userId = res.locals.auth.user.id;
  const userEmail = res.locals.auth.user.email.toLowerCase();
  try {
    const { invitation, resourceName } = await sharingService.declineByToken({
      token: req.params.token,
      userId,
      userEmail,
    });

    res.json({
      ok: true,
      resource_type: invitation.resourceType,
      resource_id: getResourceId(invitation),
      resource_name: resourceName,
      status: invitation.status,
    });
  } catch (error) {
    sendError(res, error);
  }
});

invitationsRouter.post("/by-id/:invitationId/accept", requireAuth, async (req, res) => {
  const userId = res.locals.auth.user.id;
  const userEmail = res.locals.auth.user.email.toLowerCase();
  try {
    const { invitation, resourceName } = await sharingService.acceptById({
      invitationId: req.params.invitationId,
      userId,
      userEmail,
    });

    res.json({
      ok: true,
      ...publicInvitationDto(invitation, resourceName),
    });
  } catch (error) {
    sendError(res, error);
  }
});

invitationsRouter.post("/by-id/:invitationId/decline", requireAuth, async (req, res) => {
  const userId = res.locals.auth.user.id;
  const userEmail = res.locals.auth.user.email.toLowerCase();
  try {
    const { invitation, resourceName } = await sharingService.declineById({
      invitationId: req.params.invitationId,
      userId,
      userEmail,
    });

    res.json({
      ok: true,
      resource_type: invitation.resourceType,
      resource_id: getResourceId(invitation),
      resource_name: resourceName,
      status: invitation.status,
    });
  } catch (error) {
    sendError(res, error);
  }
});
