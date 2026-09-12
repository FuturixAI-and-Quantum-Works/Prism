import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { approvalsService } from "../modules/approvals/approvals.service.js";
import {
  ApprovalError,
  approvalMessage,
  approvalStatus,
  type ApprovalSubjectType,
} from "../modules/approvals/approvals.types.js";

export const approvalsRouter = Router();

function userContext(res: import("express").Response) {
  return {
    userId: res.locals.auth.user.id,
    email: res.locals.auth.user.email.toLowerCase(),
  };
}

function sendGovernanceError(res: import("express").Response, error: unknown): void {
  res.status(approvalStatus(error)).json({ detail: approvalMessage(error) });
}

function setPublicResponseHeaders(res: import("express").Response): void {
  res.set({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
}

function subjectParams(req: import("express").Request): {
  subjectType: ApprovalSubjectType;
  subjectId: string;
} {
  const { subjectType, subjectId } = req.params;
  if (subjectType !== "document" && subjectType !== "drive_file" && subjectType !== "workspace") {
    throw new ApprovalError(400, "Invalid approval subject type");
  }
  return { subjectType, subjectId };
}

approvalsRouter.get("/roles", requireAuth, async (_req, res) => {
  try {
    res.json({ roles: await approvalsService.roleOptions() });
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.get("/:subjectType/:subjectId/approvers", requireAuth, async (req, res) => {
  try {
    const actor = userContext(res);
    const { subjectType, subjectId } = subjectParams(req);
    res.json(await approvalsService.listApprovers(actor, subjectType, subjectId));
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.put("/:subjectType/:subjectId/approvers", requireAuth, async (req, res) => {
  try {
    const actor = userContext(res);
    const { subjectType, subjectId } = subjectParams(req);
    res.json(
      await approvalsService.upsertApprovers(
        actor,
        subjectType,
        subjectId,
        req.body?.approvers,
      ),
    );
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.post("/:subjectType/:subjectId/analyze", requireAuth, async (req, res) => {
  try {
    const actor = userContext(res);
    const { subjectType, subjectId } = subjectParams(req);
    res.json(await approvalsService.analyze(actor, subjectType, subjectId));
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.get("/:subjectType/:subjectId/status", requireAuth, async (req, res) => {
  try {
    const actor = userContext(res);
    const { subjectType, subjectId } = subjectParams(req);
    res.json(await approvalsService.status(actor, subjectType, subjectId));
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.post("/:subjectType/:subjectId/request", requireAuth, async (req, res) => {
  try {
    const actor = userContext(res);
    const { subjectType, subjectId } = subjectParams(req);
    res
      .status(201)
      .json(
        await approvalsService.request(
          actor,
          subjectType,
          subjectId,
          req.body ?? {},
        ),
      );
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.patch("/requests/:requestId/decision", requireAuth, async (req, res) => {
  try {
    const { userId } = userContext(res);
    res.json(
      await approvalsService.decide({
        userId,
        requestIdOrToken: req.params.requestId,
        status: req.body?.status,
        note: req.body?.decision_note,
      }),
    );
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.get("/public/:token", async (req, res) => {
  setPublicResponseHeaders(res);
  try {
    res.json(await approvalsService.publicRequest(req.params.token));
  } catch (error) {
    sendGovernanceError(res, error);
  }
});

approvalsRouter.post("/public/:token/decision", async (req, res) => {
  setPublicResponseHeaders(res);
  try {
    res.json(
      await approvalsService.decide({
        userId: null,
        requestIdOrToken: req.params.token,
        status: req.body?.status,
        note: req.body?.decision_note,
        byToken: true,
      }),
    );
  } catch (error) {
    sendGovernanceError(res, error);
  }
});
