import { loadActiveVersion } from "../../lib/documentVersions.js";
import { recordDocumentActivity } from "./documents.activity.service.js";
import { DocumentGovernanceRepository } from "./documents.governance.repository.js";
import { documentNotificationsService } from "./documents.notifications.service.js";
import {
  DocumentPermissionError,
  documentPermissionsService,
} from "./documents.permissions.service.js";

export type RejectionTarget = Readonly<{
  page_number?: number | null;
  section_ref?: string | null;
  anchor_text?: string | null;
}>;

export type DocumentLifecycleAction =
  | "send_review"
  | "send_approval"
  | "approve_document"
  | "reject_document"
  | "finalize_document"
  | "request_clarification";

function requireState(from: string, expected: string, action: string): void {
  if (from !== expected) {
    throw new DocumentPermissionError(
      409,
      `${action} requires document state ${expected}. Current state is ${from}.`,
    );
  }
}

function normalizeRejectionTarget(target?: RejectionTarget | null): RejectionTarget {
  const pageNumber = Number(target?.page_number);
  return {
    page_number: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null,
    section_ref:
      typeof target?.section_ref === "string" && target.section_ref.trim()
        ? target.section_ref.trim().slice(0, 500)
        : null,
    anchor_text:
      typeof target?.anchor_text === "string" && target.anchor_text.trim()
        ? target.anchor_text.trim().slice(0, 1000)
        : null,
  };
}

function rejectionFixPrompt(reason: string, target: RejectionTarget) {
  const targetText = [
    target.page_number ? `Page ${target.page_number}` : null,
    target.section_ref ? `Section: ${target.section_ref}` : null,
    target.anchor_text ? `Anchor: ${target.anchor_text}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return [
    "Revise the document to address this rejection.",
    targetText,
    `Reason: ${reason}`,
    "Update only the relevant section, preserve the rest of the document, and then resubmit for approval.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export class DocumentLifecycleService {
  constructor(private readonly repository = new DocumentGovernanceRepository()) {}

  async transition(
    documentId: string,
    userId: string,
    userEmail: string | null | undefined,
    action: DocumentLifecycleAction,
    note?: string | null,
    rejectionTarget?: RejectionTarget | null,
  ) {
    const context = await documentPermissionsService.assertAllowed(
      documentId,
      userId,
      userEmail,
      action,
    );
    if (action === "send_review") {
      requireState(context.document_state, "DRAFT", "Send to review");
      await this.changeState(documentId, userId, context.document_state, "IN_REVIEW", note ?? null);
      await documentNotificationsService.notifyRole(
        documentId,
        "REVIEWER",
        "document-review-request",
        "review_request",
        "Document review requested",
      );
    } else if (action === "send_approval") {
      if (context.document_state !== "DRAFT" && context.document_state !== "IN_REVIEW") {
        throw new DocumentPermissionError(
          409,
          `Send for approval requires document state DRAFT or IN_REVIEW. Current state is ${context.document_state}.`,
        );
      }
      await this.changeState(
        documentId,
        userId,
        context.document_state,
        "PENDING_APPROVAL",
        note ?? null,
      );
      await documentNotificationsService.notifyRole(
        documentId,
        "APPROVER",
        "document-approval-request",
        "approval_request",
        "Document approval requested",
      );
      await documentNotificationsService.notifyOwnerAdminsForApproval(documentId, userId, note);
    } else if (action === "approve_document") {
      requireState(context.document_state, "PENDING_APPROVAL", "Approve document");
      await this.changeState(documentId, userId, context.document_state, "FINALIZED", note ?? null);
      await documentNotificationsService.notifyDraftersAndReviewers(
        documentId,
        "document-approved",
        "document_approved",
        "Document completed",
      );
    } else if (action === "reject_document") {
      if (!note?.trim()) throw new DocumentPermissionError(400, "Rejection note is required");
      const reason = note.trim();
      const target = normalizeRejectionTarget(rejectionTarget);
      requireState(context.document_state, "PENDING_APPROVAL", "Reject document");
      await this.changeState(documentId, userId, context.document_state, "DRAFT", reason);
      await this.createRejectionComment(documentId, userId, reason, target);
      await documentNotificationsService.notifyRole(
        documentId,
        "DRAFTER",
        "document-rejected",
        "document_rejected",
        "Document rejected",
        reason,
      );
    } else if (action === "finalize_document") {
      requireState(context.document_state, "APPROVED", "Finalize document");
      await this.changeState(documentId, userId, context.document_state, "FINALIZED", note ?? null);
      await documentNotificationsService.notifyAll(
        documentId,
        "document-finalized",
        "document_finalized",
        "Document finalized",
      );
    } else {
      await documentNotificationsService.notifyRole(
        documentId,
        "DRAFTER",
        "clarification-request",
        "clarification_request",
        "Clarification requested",
        note ?? null,
      );
      await recordDocumentActivity(
        documentId,
        userId,
        "clarification_requested",
        { type: "document", id: documentId },
        { note },
      );
    }
    return documentPermissionsService.loadContext(documentId, userId, userEmail);
  }

  private async changeState(
    documentId: string,
    userId: string,
    fromStatus: "DRAFT" | "IN_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "FINALIZED",
    toStatus: "DRAFT" | "IN_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "FINALIZED",
    note: string | null,
    metadata?: Record<string, unknown>,
  ) {
    await this.repository.transitionState({
      documentId,
      userId,
      fromStatus,
      toStatus,
      note,
      metadata,
    });
    await recordDocumentActivity(
      documentId,
      userId,
      "document_state_changed",
      { type: "document", id: documentId },
      { from_status: fromStatus, to_status: toStatus, note, ...metadata },
    );
  }

  private async createRejectionComment(
    documentId: string,
    userId: string,
    reason: string,
    target: RejectionTarget,
  ) {
    const activeVersion = await loadActiveVersion(documentId);
    const commentId = await this.repository.createRejectionComment({
      documentId,
      versionId: activeVersion?.id ?? null,
      userId,
      reason,
      anchorText: target.anchor_text ?? target.section_ref ?? null,
      metadata: {
        kind: "rejection",
        label: "Rejected",
        page_number: target.page_number ?? null,
        section_ref: target.section_ref ?? null,
        anchor_text: target.anchor_text ?? null,
        fix_prompt: rejectionFixPrompt(reason, target),
      },
    });
    await recordDocumentActivity(
      documentId,
      userId,
      "document_rejection_comment_created",
      { type: "comment", id: commentId },
      {
        page_number: target.page_number ?? null,
        section_ref: target.section_ref ?? null,
        anchor_text: target.anchor_text ?? null,
      },
    );
  }
}

export const documentLifecycleService = new DocumentLifecycleService();
