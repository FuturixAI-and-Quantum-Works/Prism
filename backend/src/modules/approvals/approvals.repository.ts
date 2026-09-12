import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import {
  approvalApprovers,
  approvalPolicies,
  approvalPolicyRules,
  approvalRequestItems,
  approvalRequests,
  approvalRoles,
  db,
  documentEdits,
  documentEmailEvents,
  documents,
  users,
  workspaces,
  type Database,
} from "../../db/index.js";
import type {
  ApprovalRoleDefinition,
  ApprovalRuleDefinition,
  ApprovalSubjectType,
  ApproverRole,
} from "./approvals.types.js";

export type ApprovalRequestRow = typeof approvalRequests.$inferSelect;
export type ApprovalApproverRow = typeof approvalApprovers.$inferSelect;

export class ApprovalsRepository {
  constructor(private readonly database: Database = db) {}

  listRoles(): Promise<ApprovalRoleDefinition[]> {
    return this.database
      .select({
        key: approvalRoles.key,
        label: approvalRoles.label,
        description: approvalRoles.description,
        enabled: approvalRoles.enabled,
        sortOrder: approvalRoles.sortOrder,
      })
      .from(approvalRoles)
      .orderBy(asc(approvalRoles.sortOrder), asc(approvalRoles.key));
  }

  listRules(subjectType: ApprovalSubjectType): Promise<ApprovalRuleDefinition[]> {
    return this.database
      .select({
        key: approvalPolicyRules.key,
        roleKey: approvalPolicyRules.role,
        matchTarget: approvalPolicyRules.matchTarget,
        pattern: approvalPolicyRules.pattern,
        flags: approvalPolicyRules.flags,
        description: approvalPolicyRules.description,
        priority: approvalPolicyRules.priority,
        enabled: approvalPolicyRules.enabled,
      })
      .from(approvalPolicyRules)
      .innerJoin(approvalPolicies, eq(approvalPolicyRules.policyId, approvalPolicies.id))
      .where(
        and(
          eq(approvalPolicies.subjectType, subjectType),
          eq(approvalPolicies.enabled, true),
          eq(approvalPolicies.isDefault, true),
          eq(approvalPolicyRules.enabled, true),
        ),
      )
      .orderBy(asc(approvalPolicyRules.priority), asc(approvalPolicyRules.key));
  }

  async findDocument(documentId: string) {
    const [document] = await this.database
      .select({
        id: documents.id,
        filename: documents.filename,
        userId: documents.userId,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return document ?? null;
  }

  async findWorkspace(workspaceId: string) {
    const [workspace] = await this.database
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return workspace ?? null;
  }

  listDocumentEdits(documentId: string) {
    return this.database
      .select()
      .from(documentEdits)
      .where(eq(documentEdits.documentId, documentId))
      .orderBy(desc(documentEdits.createdAt));
  }

  listApprovers(subjectType: ApprovalSubjectType, subjectId: string) {
    return this.database
      .select()
      .from(approvalApprovers)
      .where(
        and(
          eq(approvalApprovers.subjectType, subjectType),
          eq(approvalApprovers.subjectId, subjectId),
        ),
      );
  }

  async upsertApprover(input: {
    subjectType: ApprovalSubjectType;
    subjectId: string;
    role: ApproverRole;
    approverName: string;
    approverEmail: string;
    createdByUserId: string;
  }): Promise<ApprovalApproverRow> {
    const [existing] = await this.database
      .select({ id: approvalApprovers.id })
      .from(approvalApprovers)
      .where(
        and(
          eq(approvalApprovers.subjectType, input.subjectType),
          eq(approvalApprovers.subjectId, input.subjectId),
          eq(approvalApprovers.role, input.role),
        ),
      )
      .limit(1);
    const [approver] = existing
      ? await this.database
          .update(approvalApprovers)
          .set({
            approverName: input.approverName,
            approverEmail: input.approverEmail,
            updatedAt: new Date(),
          })
          .where(eq(approvalApprovers.id, existing.id))
          .returning()
      : await this.database.insert(approvalApprovers).values(input).returning();
    if (!approver) throw new Error("Failed to persist approver");
    return approver;
  }

  listRequests(subjectType: ApprovalSubjectType, subjectId: string) {
    return this.database
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.subjectType, subjectType),
          eq(approvalRequests.subjectId, subjectId),
        ),
      )
      .orderBy(desc(approvalRequests.createdAt));
  }

  listRequestItemIds(requestIds: readonly string[]) {
    if (requestIds.length === 0) return Promise.resolve([]);
    return this.database
      .select({ requestId: approvalRequestItems.requestId, id: approvalRequestItems.id })
      .from(approvalRequestItems)
      .where(inArray(approvalRequestItems.requestId, [...requestIds]));
  }

  async createRequest(input: typeof approvalRequests.$inferInsert): Promise<ApprovalRequestRow> {
    const [request] = await this.database.insert(approvalRequests).values(input).returning();
    if (!request) throw new Error("Failed to create approval request");
    return request;
  }

  markApproverRequired(approverId: string) {
    return this.database
      .update(approvalApprovers)
      .set({ isRequired: true, updatedAt: new Date() })
      .where(eq(approvalApprovers.id, approverId));
  }

  insertRequestItems(values: (typeof approvalRequestItems.$inferInsert)[]) {
    return this.database.insert(approvalRequestItems).values(values);
  }

  async findUserByEmail(email: string) {
    const [user] = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async findVerifiedUserById(userId: string) {
    const [user] = await this.database
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.emailVerified, true)))
      .limit(1);
    return user ?? null;
  }

  async createDocumentEmailEvent(input: {
    documentId: string;
    recipient: string;
    requestId: string;
    role: string;
  }): Promise<string> {
    const [event] = await this.database
      .insert(documentEmailEvents)
      .values({
        documentId: input.documentId,
        recipient: input.recipient,
        template: "approval-action-link",
        triggerType: "approval_action_link",
        status: "pending",
        metadata: { approval_request_id: input.requestId, role: input.role },
      })
      .returning({ id: documentEmailEvents.id });
    if (!event) throw new Error("Failed to create document email event");
    return event.id;
  }

  async findRequestById(requestId: string) {
    const [request] = await this.database
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId))
      .limit(1);
    return request ?? null;
  }

  async findRequestByTokenHash(tokenHash: string) {
    const [request] = await this.database
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.token, tokenHash))
      .limit(1);
    return request ?? null;
  }

  async decideRequest(input: {
    requestId: string;
    status: "approved" | "rejected";
    decisionNote: string | null;
    decidedAt: Date;
  }) {
    const [request] = await this.database
      .update(approvalRequests)
      .set({
        status: input.status,
        decisionNote: input.decisionNote,
        decidedAt: input.decidedAt,
        updatedAt: input.decidedAt,
      })
      .where(
        and(
          eq(approvalRequests.id, input.requestId),
          eq(approvalRequests.status, "pending"),
          gte(approvalRequests.expiresAt, input.decidedAt),
        ),
      )
      .returning();
    return request ?? null;
  }

  listRequestItems(requestId: string) {
    return this.database
      .select()
      .from(approvalRequestItems)
      .where(eq(approvalRequestItems.requestId, requestId));
  }
}
