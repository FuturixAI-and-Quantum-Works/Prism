import { getAppConfig } from "../../config.js";
import { enqueueTemplateEmail } from "../../jobs/enqueue.js";
import { buildPreviewSummary } from "../../lib/previewSummary.js";
import { downloadFile } from "../../lib/storage.js";
import { loadActiveVersion } from "../../lib/documentVersions.js";
import type { DocumentRole } from "../access/access.types.js";
import { recordDocumentActivity } from "./documents.activity.service.js";
import { DocumentGovernanceRepository } from "./documents.governance.repository.js";

type DocumentEmailOptions = Readonly<{
  body?: string;
  documentName?: string | null;
  summary?: string[] | null;
  metadata?: Record<string, unknown>;
}>;

export class DocumentNotificationsService {
  constructor(private readonly repository = new DocumentGovernanceRepository()) {}

  async send(
    documentId: string,
    recipient: string,
    template: string,
    triggerType: string,
    subject: string,
    note?: string | null,
    options: DocumentEmailOptions = {},
  ) {
    const documentUrl = `${getAppConfig().auth.frontendUrl}/documents/${documentId}`;
    const eventId = await this.repository.createEmailEvent({
      documentId,
      recipient,
      template,
      triggerType,
      metadata: { note: note ?? null, ...(options.metadata ?? {}) },
    });
    await enqueueTemplateEmail({
      idempotencyKey: `document-email:${eventId}`,
      aggregateType: "document_email",
      aggregateId: eventId,
      email: {
        to: recipient,
        template,
        category: "collaboration",
        data: {
          subject,
          title: subject,
          body: options.body ?? note ?? "Open Prism Legal to review this document.",
          actionUrl: documentUrl,
          documentName: options.documentName ?? null,
          summary: options.summary ?? null,
          note: note ?? null,
        },
      },
      tracking: {
        documentEmailEventId: eventId,
        documentId,
        triggerType,
        metadata: {
          note: note ?? null,
          action_url: documentUrl,
          ...(options.metadata ?? {}),
        },
      },
    });
    await recordDocumentActivity(
      documentId,
      null,
      "email_queued",
      { type: "email", id: eventId },
      { recipient, template, trigger_type: triggerType },
    );
  }

  async notifyRole(
    documentId: string,
    role: DocumentRole,
    template: string,
    triggerType: string,
    subject: string,
    note?: string | null,
  ) {
    const emails = await this.repository.memberEmails(documentId, role);
    await Promise.all(
      emails.map((email) => this.send(documentId, email, template, triggerType, subject, note)),
    );
  }

  async notifyDraftersAndReviewers(
    documentId: string,
    template: string,
    triggerType: string,
    subject: string,
    note?: string | null,
  ) {
    const emails = [
      ...new Set([
        ...(await this.repository.memberEmails(documentId, "DRAFTER")),
        ...(await this.repository.memberEmails(documentId, "REVIEWER")),
      ]),
    ];
    await Promise.all(
      emails.map((email) => this.send(documentId, email, template, triggerType, subject, note)),
    );
  }

  async notifyAll(
    documentId: string,
    template: string,
    triggerType: string,
    subject: string,
    note?: string | null,
  ) {
    const emails = await this.repository.memberEmails(documentId);
    await Promise.all(
      emails.map((email) => this.send(documentId, email, template, triggerType, subject, note)),
    );
  }

  async notifyOwnerAdminsForApproval(documentId: string, userId: string, note?: string | null) {
    const emails = await this.repository.ownerAdminEmails(documentId);
    if (emails.length === 0) return;
    const { documentName, summary } = await this.approvalEmailContext(documentId, userId);
    const subject = `Approval requested: ${documentName}`;
    const body = note?.trim()
      ? `A document is ready for owner/admin approval.\n\nNote: ${note.trim()}`
      : "A document is ready for owner/admin approval.";
    await Promise.all(
      emails.map((email) =>
        this.send(
          documentId,
          email,
          "document-owner-approval-request",
          "owner_admin_approval_request",
          subject,
          note,
          {
            body,
            documentName,
            summary,
            metadata: { document_name: documentName, summary },
          },
        ),
      ),
    );
  }

  private async approvalEmailContext(documentId: string, userId: string) {
    const document = await this.repository.findSessionDocument(documentId);
    const documentName = document?.filename ?? "Document";
    const fallbackSummary = [
      "Summary is not available. Open the document to review the latest content.",
    ];
    if (!document) return { documentName, summary: fallbackSummary };
    try {
      const active = await loadActiveVersion(documentId);
      if (!active) return { documentName, summary: fallbackSummary };
      const raw = await downloadFile(active.storage_path);
      const summary = await buildPreviewSummary({
        id: documentId,
        sourceType: "document",
        filename: document.filename,
        bytes: raw,
        userId,
        fileType: document.fileType,
      });
      return {
        documentName,
        summary:
          summary.status === "ready" && summary.summary.length > 0
            ? summary.summary
            : fallbackSummary,
      };
    } catch (error) {
      console.error("[document-approval-email] failed to build summary:", error);
      return { documentName, summary: fallbackSummary };
    }
  }
}

export const documentNotificationsService = new DocumentNotificationsService();
export const recordAndSendDocumentEmail = documentNotificationsService.send.bind(
  documentNotificationsService,
);
export const notifyDocumentRole = documentNotificationsService.notifyRole.bind(
  documentNotificationsService,
);
