import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import type { WorkflowsService } from "./workflows.service.js";
import { WorkflowError, type WorkflowActor } from "./workflows.types.js";
import {
  createWorkflowSchema,
  hideWorkflowSchema,
  listWorkflowsSchema,
  shareWorkflowSchema,
  updateWorkflowSchema,
  workflowIdSchema,
} from "./workflows.validators.js";

function actor(res: Response): WorkflowActor {
  return {
    userId: res.locals.auth.user.id,
    email: res.locals.auth.user.email.toLowerCase(),
  };
}

function errorResponse(error: unknown, res: Response): void {
  if (error instanceof WorkflowError) {
    res.status(error.status).json({ detail: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ detail: error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  res.status(500).json({ detail: error instanceof Error ? error.message : "Unknown error" });
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => errorResponse(error, res));
  };
}

export function createWorkflowsController(service: WorkflowsService) {
  const update = endpoint(async (req, res) => {
    const { workflowId } = workflowIdSchema.parse(req.params);
    const body = updateWorkflowSchema.parse(req.body ?? {});
    res.json(
      await service.update(actor(res), workflowId, {
        ...(body.title === undefined ? {} : { title: body.title }),
        ...(body.prompt_md === undefined ? {} : { promptMd: body.prompt_md }),
        ...(body.columns_config === undefined ? {} : { columnsConfig: body.columns_config }),
        ...(body.practice === undefined ? {} : { practice: body.practice }),
      }),
    );
  });

  return {
    list: endpoint(async (req, res) => {
      const query = listWorkflowsSchema.parse(req.query);
      res.json(await service.list(actor(res), query.type));
    }),
    create: endpoint(async (req, res) => {
      const body = createWorkflowSchema.parse(req.body);
      res.status(201).json(
        await service.create(actor(res), {
          title: body.title,
          type: body.type,
          promptMd: body.prompt_md,
          columnsConfig: body.columns_config,
          practice: body.practice,
        }),
      );
    }),
    get: endpoint(async (req, res) => {
      const { workflowId } = workflowIdSchema.parse(req.params);
      res.json(await service.get(actor(res), workflowId));
    }),
    update,
    remove: endpoint(async (req, res) => {
      const { workflowId } = workflowIdSchema.parse(req.params);
      await service.remove(actor(res), workflowId);
      res.status(204).send();
    }),
    listHidden: endpoint(async (_req, res) => {
      res.json(await service.listHidden(actor(res)));
    }),
    hide: endpoint(async (req, res) => {
      const body = hideWorkflowSchema.parse(req.body);
      await service.hide(actor(res), body.workflow_id);
      res.status(204).send();
    }),
    unhide: endpoint(async (req, res) => {
      const { workflowId } = workflowIdSchema.parse(req.params);
      await service.unhide(actor(res), workflowId);
      res.status(204).send();
    }),
    listShares: endpoint(async (req, res) => {
      const { workflowId } = workflowIdSchema.parse(req.params);
      res.json(await service.listShares(actor(res), workflowId));
    }),
    share: endpoint(async (req, res) => {
      const { workflowId } = workflowIdSchema.parse(req.params);
      const body = shareWorkflowSchema.parse(req.body);
      await service.share(actor(res), workflowId, body.emails, body.allow_edit);
      res.status(204).send();
    }),
    removeShare: endpoint(async (req, res) => {
      const { workflowId } = workflowIdSchema.parse(req.params);
      await service.removeShare(actor(res), workflowId, req.params.shareId);
      res.status(204).send();
    }),
  };
}
