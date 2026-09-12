import type { Request, Response } from "express";
import { documentActor, documentEndpoint } from "./documents.http.js";
import type { DocumentsService } from "./documents.service.js";
import {
  documentIdParamsSchema,
  documentZipRequestSchema,
  documentVersionParamsSchema,
  exportDocumentSchema,
  htmlVersionSchema,
  renameVersionSchema,
  versionQuerySchema,
} from "./documents.validators.js";

function sendBytes(
  res: Response,
  content: Readonly<{ bytes: Buffer; filename: string; contentType: string }>,
  disposition: "inline" | "attachment",
): void {
  res.setHeader("Content-Type", content.contentType);
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${content.filename.replace(/["\\\r\n]/g, "_")}"`,
  );
  res.send(content.bytes);
}

export function createDocumentsContentController(service: DocumentsService) {
  return {
    downloadZip: documentEndpoint(async (req, res) => {
      const input = documentZipRequestSchema.parse(req.body);
      const result = await service.downloadZip(documentActor(res), input);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="documents.zip"');
      res.send(result.bytes);
    }),
    display: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const query = versionQuerySchema.parse(req.query);
      sendBytes(
        res,
        await service.rawContent(documentActor(res), documentId, query.version_id, true),
        "inline",
      );
    }),
    docx: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const query = versionQuerySchema.parse(req.query);
      sendBytes(
        res,
        await service.rawContent(documentActor(res), documentId, query.version_id),
        "inline",
      );
    }),
    html: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const query = versionQuerySchema.parse(req.query);
      res.json(await service.html(documentActor(res), documentId, query.version_id));
    }),
    url: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const query = versionQuerySchema.parse(req.query);
      res.json(
        await service.signedUrl(
          documentActor(res),
          documentId,
          query.version_id,
          req.query.inline === "true",
        ),
      );
    }),
    previewSummary: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      res.json(await service.previewSummary(documentActor(res), documentId));
    }),
    listVersions: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      res.json(await service.listVersions(documentActor(res), documentId));
    }),
    uploadVersion: documentEndpoint(async (req: Request, res: Response) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      if (!req.file) {
        res.status(400).json({ detail: "file is required" });
        return;
      }
      res.status(201).json(
        await service.uploadVersion(documentActor(res), documentId, {
          filename: req.file.originalname,
          buffer: req.file.buffer,
          displayName:
            typeof req.body?.display_name === "string" ? req.body.display_name : undefined,
        }),
      );
    }),
    saveHtmlVersion: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const input = htmlVersionSchema.parse(req.body);
      res
        .status(201)
        .json(
          await service.saveHtmlVersion(
            documentActor(res),
            documentId,
            input.html,
            input.display_name,
          ),
        );
    }),
    renameVersion: documentEndpoint(async (req, res) => {
      const { documentId, versionId } = documentVersionParamsSchema.parse(req.params);
      const input = renameVersionSchema.parse(req.body);
      res.json(
        await service.renameVersion(
          documentActor(res),
          documentId,
          versionId,
          input.display_name || null,
        ),
      );
    }),
    trackedChanges: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const query = versionQuerySchema.parse(req.query);
      res.json(await service.trackedChangeIds(documentActor(res), documentId, query.version_id));
    }),
    export: documentEndpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const input = exportDocumentSchema.parse(req.body);
      const result = await service.export(documentActor(res), documentId, input.html, input.format);
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", result.disposition);
      res.send(result.bytes);
    }),
  };
}
