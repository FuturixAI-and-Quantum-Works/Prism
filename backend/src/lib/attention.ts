import { eq, and, desc, inArray } from "drizzle-orm";
import { attentionItems, userActivity, db } from "../db/index.js";

export type AttentionItemSourceType =
  | "document_risk"
  | "compliance_issue"
  | "compliance_question"
  | "project_invitation"
  | "document_invitation"
  | "approval_request"
  | "workspace_invitation"
  | "document_change_request"
  | "access_request";

export type AttentionItemStatus = "pending" | "viewed" | "resolved" | "dismissed";

const attentionItemStatuses: readonly AttentionItemStatus[] = [
  "pending",
  "viewed",
  "resolved",
  "dismissed",
];

export function isAttentionItemStatus(value: unknown): value is AttentionItemStatus {
  return attentionItemStatuses.some((status) => status === value);
}

export interface CreateAttentionItemParams {
  userId: string;
  sourceType: AttentionItemSourceType;
  sourceId?: string | null;
  secondarySourceId?: string | null;
  severity: "high" | "medium";
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAttentionItem(params: CreateAttentionItemParams): Promise<string> {
  const [item] = await db
    .insert(attentionItems)
    .values({
      userId: params.userId,
      sourceType: params.sourceType,
      sourceId: params.sourceId ?? null,
      secondarySourceId: params.secondarySourceId ?? null,
      severity: params.severity,
      title: params.title,
      description: params.description ?? null,
      metadata: params.metadata ?? null,
    })
    .returning({ id: attentionItems.id });

  return item.id;
}

export async function createAttentionItemsForRisks(
  userId: string,
  documentId: string,
  risks: Array<{
    title: string;
    severity: "high" | "medium" | "low";
    description: string;
    recommendation?: string;
    location?: string;
  }>,
): Promise<void> {
  const qualifyingRisks = risks.filter((r) => r.severity === "high" || r.severity === "medium");

  if (qualifyingRisks.length === 0) return;

  const values = qualifyingRisks.map((risk) => ({
    userId,
    sourceType: "document_risk" as const,
    sourceId: documentId,
    severity: risk.severity as "high" | "medium",
    title: risk.title,
    description: risk.description,
    metadata: {
      recommendation: risk.recommendation,
      location: risk.location,
    },
  }));

  await db.insert(attentionItems).values(values);
}

export async function updateAttentionItemStatus(
  itemId: string,
  userId: string,
  status: AttentionItemStatus,
): Promise<boolean> {
  const result = await db
    .update(attentionItems)
    .set({
      status,
      updatedAt: new Date(),
      resolvedAt: status === "resolved" || status === "dismissed" ? new Date() : null,
    })
    .where(and(eq(attentionItems.id, itemId), eq(attentionItems.userId, userId)))
    .returning({ id: attentionItems.id });

  return result.length > 0;
}

export async function listAttentionItems(
  userId: string,
  options?: {
    status?: AttentionItemStatus | AttentionItemStatus[];
    limit?: number;
    offset?: number;
  },
) {
  const statusFilter = options?.status
    ? Array.isArray(options.status)
      ? inArray(attentionItems.status, options.status)
      : eq(attentionItems.status, options.status)
    : undefined;

  const rows = await db
    .select({
      id: attentionItems.id,
      userId: attentionItems.userId,
      sourceType: attentionItems.sourceType,
      sourceId: attentionItems.sourceId,
      secondarySourceId: attentionItems.secondarySourceId,
      severity: attentionItems.severity,
      title: attentionItems.title,
      description: attentionItems.description,
      metadata: attentionItems.metadata,
      status: attentionItems.status,
      createdAt: attentionItems.createdAt,
      updatedAt: attentionItems.updatedAt,
      resolvedAt: attentionItems.resolvedAt,
    })
    .from(attentionItems)
    .where(
      statusFilter
        ? and(eq(attentionItems.userId, userId), statusFilter)
        : eq(attentionItems.userId, userId),
    )
    .orderBy(desc(attentionItems.createdAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);

  return rows;
}
export async function createWorkspaceInvitationAttentionItem(params: {
  userId: string;
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}): Promise<string> {
  return createAttentionItem({
    userId: params.userId,
    sourceType: "workspace_invitation",
    sourceId: params.invitationId,
    secondarySourceId: params.workspaceId,
    severity: "medium",
    title: `Invitation to join "${params.workspaceName}"`,
    description: `${params.inviterName} invited you to join as ${params.role}`,
    metadata: {
      workspaceId: params.workspaceId,
      workspaceName: params.workspaceName,
      inviterName: params.inviterName,
      role: params.role,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function createDocumentChangeRequestAttentionItem(params: {
  userId: string;
  changeRequestId: string;
  documentId: string;
  documentName: string;
  requesterName: string;
  changeType: string;
  changeSummary?: string;
}): Promise<string> {
  return createAttentionItem({
    userId: params.userId,
    sourceType: "document_change_request",
    sourceId: params.changeRequestId,
    secondarySourceId: params.documentId,
    severity: "medium",
    title: `Change request for "${params.documentName}"`,
    description:
      params.changeSummary || `${params.requesterName} requested a ${params.changeType} change`,
    metadata: {
      documentId: params.documentId,
      documentName: params.documentName,
      requesterName: params.requesterName,
      changeType: params.changeType,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function createAccessRequestAttentionItem(params: {
  userId: string;
  accessRequestId: string;
  workspaceId: string;
  workspaceName: string;
  requesterName: string;
  requestedRole: string;
  message?: string;
}): Promise<string> {
  return createAttentionItem({
    userId: params.userId,
    sourceType: "access_request",
    sourceId: params.accessRequestId,
    secondarySourceId: params.workspaceId,
    severity: "medium",
    title: `Access request for "${params.workspaceName}"`,
    description:
      params.message || `${params.requesterName} requested ${params.requestedRole} access`,
    metadata: {
      workspaceId: params.workspaceId,
      workspaceName: params.workspaceName,
      requesterName: params.requesterName,
      requestedRole: params.requestedRole,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function resolveAttentionItemsBySource(
  sourceType: AttentionItemSourceType,
  sourceId: string,
): Promise<void> {
  await db
    .update(attentionItems)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(attentionItems.sourceType, sourceType), eq(attentionItems.sourceId, sourceId)));
}

export async function listUserActivity(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const rows = await db
    .select({
      id: userActivity.id,
      userId: userActivity.userId,
      action: userActivity.action,
      resourceType: userActivity.resourceType,
      resourceId: userActivity.resourceId,
      resourceName: userActivity.resourceName,
      actorUserId: userActivity.actorUserId,
      actorName: userActivity.actorName,
      details: userActivity.details,
      createdAt: userActivity.createdAt,
    })
    .from(userActivity)
    .where(eq(userActivity.userId, userId))
    .orderBy(desc(userActivity.createdAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);

  return rows;
}
