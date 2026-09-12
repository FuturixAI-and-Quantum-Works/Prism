import type { Request, Response } from "express";
import { documentActor, documentEndpoint } from "./documents.http.js";
import type { DocumentsService } from "./documents.service.js";
import {
  createDocumentSchema,
  documentIdParamsSchema,
  documentListQuerySchema,
  updateDocumentSchema,
} from "./documents.validators.js";

function primary(value: boolean | "true" | "false" | undefined): boolean | undefined {
  return value === undefined ? undefined : value === true || value === "true";
}

export function createDocumentsCoreController(service: DocumentsService) {
  return {
    list: documentEndpoint(async (req, res) => {
      const query = documentListQuerySchema.parse(req.query);
      res.json(
        await service.list(documentActor(res), {
          projectId: query.project_id,
          workspaceId: query.workspace_id,
        }),
      );
    }),
    create: documentEndpoint(async (req, res) => {
      const input = createDocumentSchema.parse(req.body);
      res.status(201).json(
        await service.createBlank(documentActor(res), {
          filename: input.filename,
          name: input.name,
          contentHtml: input.content_html,
          projectId: input.project_id,
          workspaceId: input.workspace_id,
          folderId: input.folder_id,
          isPrimary: primary(input.is_primary),
        }),
      );
    }),
    upload: documentEndpoint(async (req: Request, res: Response) => {
      if (!req.file) {
        res.status(400).json({ detail: "file is required" });
        return;
      }
      const input = createDocumentSchema.parse(req.body);
      res.status(201).json(
        await service.upload({
          ...documentActor(res),
          filename: req.file.originalname,
          buffer: req.file.buffer,
          projectId: input.project_id,
          workspaceId: input.workspace_id,
          folderId: input.folder_id,
          attached: req.body?.attached === true || req.body?.attached === "true",
          isPrimary: primary(input.is_primary),
        }),
      );
    }),
    get: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      res.json(await service.get(documentActor(res), documentId));
    }),
    update: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const input = updateDocumentSchema.parse(req.body);
      res.json(
        await service.update(documentActor(res), documentId, {
          filename: input.filename,
          name: input.name,
          projectId: input.project_id,
          folderId: input.folder_id,
        }),
      );
    }),
    remove: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      await service.remove(documentActor(res), documentId);
      res.status(204).send();
    }),
  };
}
