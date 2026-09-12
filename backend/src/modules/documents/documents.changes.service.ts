import {
  approveChangeRequest,
  createDocumentChangeRequest,
  listPendingChangeRequests,
  rejectChangeRequest,
} from "../../lib/changeRequests.js";
import { assertDocumentActionAllowed } from "./documents.permissions.service.js";
import { buildDownloadUrl } from "../../lib/downloadTokens.js";
import { resolveTrackedChange } from "../../lib/docxTrackedChangeResolution.js";
import { downloadFile, uploadFile } from "../../lib/storage.js";
import { recordDocumentActivity } from "./documents.activity.service.js";
import type { RequestUserContext } from "./documents.models.js";
import { DocumentsRepository } from "./documents.repository.js";
import { DocumentServiceError } from "./documents.service.js";

export class DocumentChangesService {
  constructor(private readonly repository = new DocumentsRepository()) {}

  private async requireDocument(
    actor: RequestUserContext,
    documentId: string,
    action: "read_document" | "edit_document" | "list_change_requests" | "review_change_request",
  ) {
    const document = await this.repository.findDocumentById(documentId);
    if (!document) throw new DocumentServiceError(404, "Document not found");
    await assertDocumentActionAllowed(
      documentId,
      actor.userId,
      actor.userEmail ?? undefined,
      action,
    );
    return document;
  }

  async resolveEdit(
    actor: RequestUserContext,
    documentId: string,
    editId: string,
    mode: "accept" | "reject",
  ) {
    const edit = await this.repository.findEdit(documentId, editId);
    if (!edit) throw new DocumentServiceError(404, "Edit not found");
    const document = await this.requireDocument(actor, documentId, "edit_document");
    const active = await this.repository.findActiveVersion(documentId);
    if (!active) throw new DocumentServiceError(404, "No file to edit");
    if (edit.status !== "pending") {
      return {
        ok: true,
        already_resolved: true,
        status: edit.status,
        version_id: active.id,
        download_url: buildDownloadUrl(active.storagePath, document.filename),
        remaining_pending: 0,
      };
    }
    const original = await downloadFile(active.storagePath);
    if (!original) throw new DocumentServiceError(404, "Document bytes not available");
    const ids = [edit.delWId, edit.insWId].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    const resolved = await resolveTrackedChange(Buffer.from(original), ids, mode);
    if (resolved.found) {
      await uploadFile(
        active.storagePath,
        Uint8Array.from(resolved.bytes).buffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    }
    let remaining: number;
    try {
      remaining = await this.repository.resolveEdit(
        documentId,
        editId,
        mode === "accept" ? "accepted" : "rejected",
      );
    } catch (error) {
      if (resolved.found) {
        await uploadFile(
          active.storagePath,
          original,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
      }
      throw error;
    }
    await recordDocumentActivity(
      documentId,
      actor.userId,
      mode === "accept" ? "edit_accepted" : "edit_rejected",
      { type: "edit", id: editId },
      resolved.found ? undefined : { status_only: true },
    );
    return {
      ok: true,
      version_id: active.id,
      download_url: buildDownloadUrl(active.storagePath, document.filename),
      remaining_pending: remaining,
    };
  }

  async createRequest(
    actor: RequestUserContext,
    documentId: string,
    input: {
      changeType: string;
      changeSummary?: string;
      changeDetails?: Record<string, unknown>;
      versionId?: string | null;
    },
  ) {
    await this.requireDocument(actor, documentId, "read_document");
    const request = await createDocumentChangeRequest({
      documentId,
      requestedByUserId: actor.userId,
      versionId: input.versionId ?? null,
      changeType: input.changeType,
      changeSummary: input.changeSummary,
      changeDetails: input.changeDetails,
    });
    return {
      id: request.id,
      document_id: request.documentId,
      change_type: request.changeType,
      change_summary: request.changeSummary,
      status: request.status,
      created_at: request.createdAt,
    };
  }

  async listRequests(actor: RequestUserContext, documentId: string) {
    await this.requireDocument(actor, documentId, "list_change_requests");
    const requests = await listPendingChangeRequests(documentId);
    return {
      change_requests: requests.map((request) => ({
        id: request.id,
        document_id: request.documentId,
        requested_by_user_id: request.requestedByUserId,
        requester_email: request.requesterEmail,
        requester_name: request.requesterName,
        version_id: request.versionId,
        change_type: request.changeType,
        change_summary: request.changeSummary,
        change_details: request.changeDetails,
        status: request.status,
        created_at: request.createdAt,
      })),
    };
  }

  async reviewRequest(
    actor: RequestUserContext,
    documentId: string,
    requestId: string,
    action: "approve" | "reject",
    reviewNotes?: string,
  ) {
    await this.requireDocument(actor, documentId, "review_change_request");
    const request =
      action === "approve"
        ? await approveChangeRequest({
            requestId,
            documentId,
            reviewedByUserId: actor.userId,
            reviewNotes,
          })
        : await rejectChangeRequest({
            requestId,
            documentId,
            reviewedByUserId: actor.userId,
            reviewNotes,
          });
    await recordDocumentActivity(
      documentId,
      actor.userId,
      action === "approve" ? "change_request_approved" : "change_request_rejected",
      { type: "user", id: request.requestedByUserId },
      { changeType: request.changeType },
    );
    return {
      id: request.id,
      status: request.status,
      reviewed_at: request.reviewedAt,
      review_notes: request.reviewNotes,
    };
  }
}
