import type { DocumentRole } from "../access/access.types.js";
import { recordDocumentActivity } from "./documents.activity.service.js";
import { DocumentGovernanceRepository } from "./documents.governance.repository.js";
import { documentNotificationsService } from "./documents.notifications.service.js";
import {
  DocumentPermissionError,
  documentPermissionsService,
} from "./documents.permissions.service.js";

export class DocumentMembersService {
  constructor(private readonly repository = new DocumentGovernanceRepository()) {}

  async list(documentId: string, userId: string, userEmail?: string | null) {
    await documentPermissionsService.assertAllowed(
      documentId,
      userId,
      userEmail,
      "assign_document_role",
    );
    return this.repository.listMembers(documentId);
  }

  async assign(
    documentId: string,
    userId: string,
    userEmail: string | null | undefined,
    input: { email?: string | null; targetUserId?: string | null; role: DocumentRole },
  ) {
    await documentPermissionsService.assertAllowed(
      documentId,
      userId,
      userEmail,
      "assign_document_role",
    );
    const email = input.email?.trim().toLowerCase() || null;
    const targetUserId = input.targetUserId?.trim() || null;
    if (!email && !targetUserId) {
      throw new DocumentPermissionError(400, "email or user_id is required");
    }
    const member = await this.repository.assignMember({
      documentId,
      assignedByUserId: userId,
      email,
      targetUserId,
      role: input.role,
    });
    await recordDocumentActivity(
      documentId,
      userId,
      "document_role_assigned",
      { type: "member", id: member.id },
      { role: input.role, email, user_id: targetUserId },
    );
    if (email) {
      await documentNotificationsService.send(
        documentId,
        email,
        "role-assignment",
        "role_assignment",
        "Document role assigned",
        `You have been assigned ${input.role} access. Open the document from your workspace.`,
      );
    }
    return member;
  }

  async revoke(
    documentId: string,
    userId: string,
    userEmail: string | null | undefined,
    memberId: string,
  ): Promise<void> {
    await documentPermissionsService.assertAllowed(
      documentId,
      userId,
      userEmail,
      "assign_document_role",
    );
    const member = await this.repository.revokeMember(documentId, memberId);
    if (!member) throw new DocumentPermissionError(404, "Document member not found");
    await recordDocumentActivity(
      documentId,
      userId,
      "document_role_revoked",
      { type: "member", id: member.id },
      { role: member.role, email: member.email },
    );
  }
}

export const documentMembersService = new DocumentMembersService();
