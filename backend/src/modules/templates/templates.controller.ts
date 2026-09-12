import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import type { TemplatesService } from "./templates.service.js";
import { TemplateError, type TemplateActor } from "./templates.types.js";
import {
  cloneTemplateSchema,
  createDocumentSchema,
  createTemplateSchema,
  listTemplatesSchema,
  normalizeTemplateValues,
  templateIdSchema,
  updateTemplateSchema,
} from "./templates.validators.js";

function actor(res: Response): TemplateActor {
  return {
    userId: res.locals.auth.user.id,
    email: res.locals.auth.user.email.toLowerCase(),
  };
}

function errorResponse(error: unknown, res: Response): void {
  if (error instanceof TemplateError) {
    res.status(error.status).json({
      detail: error.message,
      ...(error.missingFields ? { missing_fields: error.missingFields } : {}),
    });
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

export function createTemplatesController(service: TemplatesService) {
  return {
    list: endpoint(async (req, res) => {
      const query = listTemplatesSchema.parse(req.query);
      res.json(await service.list(actor(res), query.type));
    }),
    get: endpoint(async (req, res) => {
      const { templateId } = templateIdSchema.parse(req.params);
      res.json(await service.get(actor(res), templateId));
    }),
    create: endpoint(async (req, res) => {
      const body = createTemplateSchema.parse(req.body);
      res.status(201).json(
        await service.create(actor(res), {
          name: body.name,
          category: body.category,
          description: body.description,
          contentHtml: body.content_html,
          fields: body.fields,
        }),
      );
    }),
    update: endpoint(async (req, res) => {
      const { templateId } = templateIdSchema.parse(req.params);
      const body = updateTemplateSchema.parse(req.body ?? {});
      res.json(
        await service.update(actor(res), templateId, {
          name: body.name,
          category: body.category,
          description: body.description,
          contentHtml: body.content_html,
          fields: body.fields,
        }),
      );
    }),
    remove: endpoint(async (req, res) => {
      const { templateId } = templateIdSchema.parse(req.params);
      await service.remove(actor(res), templateId);
      res.status(204).send();
    }),
    clone: endpoint(async (req, res) => {
      const { templateId } = templateIdSchema.parse(req.params);
      const body = cloneTemplateSchema.parse(req.body ?? {});
      res.status(201).json(await service.clone(actor(res), templateId, body.name));
    }),
    createDocument: endpoint(async (req, res) => {
      const { templateId } = templateIdSchema.parse(req.params);
      const body = createDocumentSchema.parse(req.body ?? {});
      const isPrimary =
        body.is_primary === undefined
          ? undefined
          : body.is_primary === true || body.is_primary === "true";
      res.status(201).json(
        await service.createDocument(actor(res), templateId, {
          values: normalizeTemplateValues(body.values),
          filename: body.filename,
          name: body.name,
          projectId: body.project_id,
          workspaceId: body.workspace_id,
          folderId: body.folder_id,
          isPrimary,
        }),
      );
    }),
  };
}
