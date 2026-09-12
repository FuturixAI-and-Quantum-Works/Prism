import type { Request, RequestHandler, Response } from "express";
import { documentActor } from "./documents.http.js";
import type { DocumentPlaceholdersService } from "./documents.placeholders.service.js";
import {
  parseEditStatus,
  parsePlaceholderValues,
  requirePlaceholderConfirmation,
} from "./documents.placeholders.validators.js";

function sendError(res: Response, error: unknown): void {
  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : 500;
  res.status(statusCode).json({
    detail: error instanceof Error ? error.message : "Server error",
  });
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => sendError(res, error));
  };
}

export function createDocumentsPlaceholdersController(service: DocumentPlaceholdersService) {
  return {
    get: endpoint(async (req, res) => {
      res.json(await service.get(documentActor(res), req.params.documentId));
    }),
    save: endpoint(async (req, res) => {
      const values = parsePlaceholderValues(req.body);
      res.json(await service.save(documentActor(res), req.params.documentId, values));
    }),
    apply: endpoint(async (req, res) => {
      requirePlaceholderConfirmation(req.body);
      const result = await service.apply(documentActor(res), req.params.documentId);
      if (result.kind === "missing") {
        res.status(400).json({ detail: "Missing placeholder values", missing: result.missing });
        return;
      }
      if (result.kind === "empty") {
        res.json({
          ok: true,
          applied: 0,
          annotations: [],
          message: "No placeholders found to apply.",
        });
        return;
      }
      if (result.kind === "failed") {
        res.status(400).json({ detail: result.detail });
        return;
      }
      res.status(201).json({
        ok: true,
        document_id: result.document_id,
        filename: result.filename,
        version_id: result.version_id,
        version_number: result.version_number,
        download_url: result.download_url,
        applied: result.applied,
        errors: result.errors,
        annotations: result.annotations,
      });
    }),
    listEdits: endpoint(async (req, res) => {
      res.json(
        await service.listEdits(
          documentActor(res),
          req.params.documentId,
          parseEditStatus(req.query.status),
        ),
      );
    }),
  };
}
