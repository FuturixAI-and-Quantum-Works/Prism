import { z } from "zod";
import { documentActor, documentEndpoint } from "./documents.http.js";
import type { DocumentChangesService } from "./documents.changes.service.js";

const editParams = z.object({
  documentId: z.string().uuid(),
  editId: z.string().uuid(),
});
const documentParams = z.object({ documentId: z.string().uuid() });
const requestParams = z.object({
  documentId: z.string().uuid(),
  requestId: z.string().uuid(),
});
const createRequest = z.object({
  change_type: z.string().trim().min(1),
  change_summary: z.string().optional(),
  change_details: z.record(z.string(), z.unknown()).optional(),
  version_id: z.string().uuid().nullish(),
});
const reviewRequest = z.object({
  action: z.enum(["approve", "reject"]),
  review_notes: z.string().optional(),
});

export function createDocumentsChangesController(service: DocumentChangesService) {
  return {
    acceptEdit: documentEndpoint(async (req, res) => {
      const { documentId, editId } = editParams.parse(req.params);
      res.json(await service.resolveEdit(documentActor(res), documentId, editId, "accept"));
    }),
    rejectEdit: documentEndpoint(async (req, res) => {
      const { documentId, editId } = editParams.parse(req.params);
      res.json(await service.resolveEdit(documentActor(res), documentId, editId, "reject"));
    }),
    createRequest: documentEndpoint(async (req, res) => {
      const { documentId } = documentParams.parse(req.params);
      const input = createRequest.parse(req.body);
      res.status(201).json(
        await service.createRequest(documentActor(res), documentId, {
          changeType: input.change_type,
          changeSummary: input.change_summary,
          changeDetails: input.change_details,
          versionId: input.version_id,
        }),
      );
    }),
    listRequests: documentEndpoint(async (req, res) => {
      const { documentId } = documentParams.parse(req.params);
      res.json(await service.listRequests(documentActor(res), documentId));
    }),
    reviewRequest: documentEndpoint(async (req, res) => {
      const { documentId, requestId } = requestParams.parse(req.params);
      const input = reviewRequest.parse(req.body);
      res.json(
        await service.reviewRequest(
          documentActor(res),
          documentId,
          requestId,
          input.action,
          input.review_notes,
        ),
      );
    }),
  };
}
