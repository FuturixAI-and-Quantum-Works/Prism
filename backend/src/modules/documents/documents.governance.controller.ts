import type { Request, RequestHandler, Response } from "express";
import {
  documentPermissionMessage,
  documentPermissionStatus,
} from "./documents.permissions.service.js";
import { sharingMessage, sharingStatus } from "../sharing/sharing.types.js";
import { documentActor } from "./documents.http.js";
import type { DocumentGovernanceService } from "./documents.governance.service.js";
import {
  type LifecycleAction,
  parseAssignMember,
  parseCommentUpdate,
  parseCreateComment,
  parseInvitation,
  parseLifecycle,
  parseShareRole,
} from "./documents.governance.validators.js";

type ErrorMode = "permission" | "sharing";

function hasStatusCode(error: unknown): error is { statusCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}

function sendError(res: Response, error: unknown, mode: ErrorMode): void {
  if (mode === "sharing" && !hasStatusCode(error)) {
    res.status(sharingStatus(error)).json({ detail: sharingMessage(error) });
    return;
  }
  const status = hasStatusCode(error) ? error.statusCode : documentPermissionStatus(error);
  res.status(status).json({ detail: documentPermissionMessage(error) });
}

function endpoint(
  mode: ErrorMode,
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => sendError(res, error, mode));
  };
}

export function createDocumentsGovernanceController(service: DocumentGovernanceService) {
  return {
    sessionContext: endpoint("permission", async (req, res) => {
      res.json(await service.sessionContext(documentActor(res), req.params.documentId));
    }),
    listMembers: endpoint("permission", async (req, res) => {
      res.json(await service.listMembers(documentActor(res), req.params.documentId));
    }),
    assignMember: endpoint("permission", async (req, res) => {
      res
        .status(201)
        .json(
          await service.assignMember(
            documentActor(res),
            req.params.documentId,
            parseAssignMember(req.body),
          ),
        );
    }),
    revokeMember: endpoint("permission", async (req, res) => {
      await service.revokeMember(documentActor(res), req.params.documentId, req.params.memberId);
      res.status(204).send();
    }),
    listShares: endpoint("permission", async (req, res) => {
      res.json(await service.listShares(documentActor(res), req.params.documentId));
    }),
    invite: endpoint("sharing", async (req, res) => {
      res
        .status(201)
        .json(
          await service.invite(
            documentActor(res),
            req.params.documentId,
            parseInvitation(req.body),
          ),
        );
    }),
    updateShare: endpoint("sharing", async (req, res) => {
      res.json(
        await service.updateShare(
          documentActor(res),
          req.params.documentId,
          req.params.shareId,
          parseShareRole(req.body),
        ),
      );
    }),
    removeShare: endpoint("permission", async (req, res) => {
      await service.removeShare(documentActor(res), req.params.documentId, req.params.shareId);
      res.status(204).send();
    }),
    transition: (action: LifecycleAction) =>
      endpoint("permission", async (req, res) => {
        const input = parseLifecycle(req.body);
        res.json(
          await service.transition(
            documentActor(res),
            req.params.documentId,
            action,
            input.note,
            input.rejectionTarget,
          ),
        );
      }),
    listChatMessages: endpoint("permission", async (req, res) => {
      res.json(await service.listChatMessages(documentActor(res), req.params.documentId));
    }),
    listComments: endpoint("permission", async (req, res) => {
      res.json(await service.listComments(documentActor(res), req.params.documentId));
    }),
    createComment: endpoint("permission", async (req, res) => {
      res
        .status(201)
        .json(
          await service.createComment(
            documentActor(res),
            req.params.documentId,
            parseCreateComment(req.body),
          ),
        );
    }),
    updateComment: endpoint("permission", async (req, res) => {
      res.json(
        await service.updateComment(
          documentActor(res),
          req.params.documentId,
          req.params.commentId,
          parseCommentUpdate(req.body),
        ),
      );
    }),
    deleteComment: endpoint("permission", async (req, res) => {
      await service.deleteComment(documentActor(res), req.params.documentId, req.params.commentId);
      res.status(204).send();
    }),
    listActivity: endpoint("permission", async (req, res) => {
      res.json(await service.listActivity(documentActor(res), req.params.documentId));
    }),
  };
}
