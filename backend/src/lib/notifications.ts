import { and, desc, eq, sql } from "drizzle-orm";
import { db, notifications, users } from "../db/index.js";

export type NotificationIcon =
  | "document"
  | "compliance"
  | "comment"
  | "approval"
  | "workspace"
  | "alert"
  | "share"
  | "mention"
  | "system";

export type NotificationInput = {
  userId: string;
  icon: NotificationIcon;
  title: string;
  description?: string;
  link?: string;
  resourceType?: string;
  resourceId?: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
  onEmail?: boolean;
};

export async function createNotification(
  input: NotificationInput,
): Promise<typeof notifications.$inferSelect> {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      icon: input.icon,
      title: input.title,
      description: input.description ?? null,
      link: input.link ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      actorUserId: input.actorUserId ?? null,
      metadata: input.metadata ?? null,
      onEmail: input.onEmail ?? false,
    })
    .returning();

  return notification;
}

export async function createNotificationForMultipleUsers(
  userIds: string[],
  input: Omit<NotificationInput, "userId">,
): Promise<(typeof notifications.$inferSelect)[]> {
  if (userIds.length === 0) return [];

  const uniqueUserIds = [...new Set(userIds)];
  const values = uniqueUserIds.map((userId) => ({
    userId,
    icon: input.icon,
    title: input.title,
    description: input.description ?? null,
    link: input.link ?? null,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    actorUserId: input.actorUserId ?? null,
    metadata: input.metadata ?? null,
    onEmail: input.onEmail ?? false,
  }));

  return db.insert(notifications).values(values).returning();
}

async function getActorName(actorUserId: string): Promise<string> {
  const [user] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  return user?.fullName || user?.email || "Someone";
}

export async function notifyWorkspaceInvitation(input: {
  inviteeUserId: string;
  inviterUserId: string;
  workspaceId: string;
  workspaceName: string;
  role: string;
}): Promise<typeof notifications.$inferSelect> {
  const inviterName = await getActorName(input.inviterUserId);
  return createNotification({
    userId: input.inviteeUserId,
    icon: "workspace",
    title: `Workspace Invitation`,
    description: `${inviterName} invited you to join "${input.workspaceName}" as ${input.role}`,
    link: `/workspaces/${encodeURIComponent(input.workspaceId)}`,
    resourceType: "workspace",
    resourceId: input.workspaceId,
    actorUserId: input.inviterUserId,
    metadata: { role: input.role, workspaceName: input.workspaceName },
  });
}

export async function notifyInvitationAccepted(input: {
  inviterUserId: string;
  acceptedByUserId: string;
  resourceType: "workspace" | "project" | "document";
  resourceId: string;
  resourceName: string;
}): Promise<typeof notifications.$inferSelect> {
  const acceptedByName = await getActorName(input.acceptedByUserId);
  return createNotification({
    userId: input.inviterUserId,
    icon: "approval",
    title: `Invitation Accepted`,
    description: `${acceptedByName} accepted your invitation to "${input.resourceName}"`,
    link:
      input.resourceType === "workspace"
        ? `/workspaces/${encodeURIComponent(input.resourceId)}`
        : input.resourceType === "document"
          ? `/documents/${encodeURIComponent(input.resourceId)}`
          : undefined,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    actorUserId: input.acceptedByUserId,
    metadata: { resourceName: input.resourceName },
  });
}

export async function notifyInvitationDeclined(input: {
  inviterUserId: string;
  declinedByUserId: string;
  resourceType: "workspace" | "project" | "document";
  resourceId: string;
  resourceName: string;
}): Promise<typeof notifications.$inferSelect> {
  const declinedByName = await getActorName(input.declinedByUserId);
  return createNotification({
    userId: input.inviterUserId,
    icon: "alert",
    title: `Invitation Declined`,
    description: `${declinedByName} declined your invitation to "${input.resourceName}"`,
    link:
      input.resourceType === "workspace"
        ? `/workspaces/${encodeURIComponent(input.resourceId)}`
        : input.resourceType === "document"
          ? `/documents/${encodeURIComponent(input.resourceId)}`
          : undefined,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    actorUserId: input.declinedByUserId,
    metadata: { resourceName: input.resourceName },
  });
}

export async function notifyAccessRequested(input: {
  adminUserIds: string[];
  requesterUserId: string;
  workspaceId: string;
  workspaceName: string;
  requestedRole: string;
  message?: string;
}): Promise<(typeof notifications.$inferSelect)[]> {
  const requesterName = await getActorName(input.requesterUserId);
  return createNotificationForMultipleUsers(input.adminUserIds, {
    icon: "approval",
    title: `Access Request`,
    description: `${requesterName} requested ${input.requestedRole} access to "${input.workspaceName}"`,
    link: `/workspaces/${encodeURIComponent(input.workspaceId)}`,
    resourceType: "workspace",
    resourceId: input.workspaceId,
    actorUserId: input.requesterUserId,
    metadata: {
      requestedRole: input.requestedRole,
      workspaceName: input.workspaceName,
      message: input.message,
    },
  });
}

export async function notifyAccessRequestApproved(input: {
  requesterUserId: string;
  approverUserId: string;
  workspaceId: string;
  workspaceName: string;
  grantedRole: string;
}): Promise<typeof notifications.$inferSelect> {
  const approverName = await getActorName(input.approverUserId);
  return createNotification({
    userId: input.requesterUserId,
    icon: "approval",
    title: `Access Request Approved`,
    description: `${approverName} approved your request to join "${input.workspaceName}" as ${input.grantedRole}`,
    link: `/workspaces/${encodeURIComponent(input.workspaceId)}`,
    resourceType: "workspace",
    resourceId: input.workspaceId,
    actorUserId: input.approverUserId,
    metadata: { grantedRole: input.grantedRole, workspaceName: input.workspaceName },
  });
}

export async function notifyAccessRequestRejected(input: {
  requesterUserId: string;
  rejectorUserId: string;
  workspaceId: string;
  workspaceName: string;
}): Promise<typeof notifications.$inferSelect> {
  return createNotification({
    userId: input.requesterUserId,
    icon: "alert",
    title: `Access Request Declined`,
    description: `Your request to join "${input.workspaceName}" was declined`,
    link: `/workspaces/${encodeURIComponent(input.workspaceId)}`,
    resourceType: "workspace",
    resourceId: input.workspaceId,
    actorUserId: input.rejectorUserId,
    metadata: { workspaceName: input.workspaceName },
  });
}

export async function notifyMemberRemoved(input: {
  removedUserId: string;
  removerUserId: string;
  workspaceId: string;
  workspaceName: string;
}): Promise<typeof notifications.$inferSelect> {
  return createNotification({
    userId: input.removedUserId,
    icon: "alert",
    title: `Removed from Workspace`,
    description: `You have been removed from "${input.workspaceName}"`,
    resourceType: "workspace",
    resourceId: input.workspaceId,
    actorUserId: input.removerUserId,
    metadata: { workspaceName: input.workspaceName },
  });
}

export async function notifyMemberRoleChanged(input: {
  memberUserId: string;
  changerUserId: string;
  workspaceId: string;
  workspaceName: string;
  oldRole: string;
  newRole: string;
}): Promise<typeof notifications.$inferSelect> {
  const changerName = await getActorName(input.changerUserId);
  return createNotification({
    userId: input.memberUserId,
    icon: "workspace",
    title: `Role Updated`,
    description: `${changerName} changed your role in "${input.workspaceName}" from ${input.oldRole} to ${input.newRole}`,
    link: `/workspaces/${encodeURIComponent(input.workspaceId)}`,
    resourceType: "workspace",
    resourceId: input.workspaceId,
    actorUserId: input.changerUserId,
    metadata: {
      oldRole: input.oldRole,
      newRole: input.newRole,
      workspaceName: input.workspaceName,
    },
  });
}

export async function notifyApprovalRequested(input: {
  approverUserId: string;
  requesterUserId: string;
  documentId: string;
  documentName: string;
}): Promise<typeof notifications.$inferSelect> {
  const requesterName = await getActorName(input.requesterUserId);
  return createNotification({
    userId: input.approverUserId,
    icon: "approval",
    title: `Approval Requested`,
    description: `${requesterName} requested your approval for "${input.documentName}"`,
    link: `/documents/${encodeURIComponent(input.documentId)}`,
    resourceType: "document",
    resourceId: input.documentId,
    actorUserId: input.requesterUserId,
    metadata: { documentName: input.documentName },
  });
}

export async function notifyDocumentApproved(input: {
  ownerUserId: string;
  approverUserId: string;
  documentId: string;
  documentName: string;
}): Promise<typeof notifications.$inferSelect> {
  const approverName = await getActorName(input.approverUserId);
  return createNotification({
    userId: input.ownerUserId,
    icon: "approval",
    title: `Document Approved`,
    description: `${approverName} approved "${input.documentName}"`,
    link: `/documents/${encodeURIComponent(input.documentId)}`,
    resourceType: "document",
    resourceId: input.documentId,
    actorUserId: input.approverUserId,
    metadata: { documentName: input.documentName },
  });
}

export async function notifyDocumentRejected(input: {
  ownerUserId: string;
  rejectorUserId: string;
  documentId: string;
  documentName: string;
  reason?: string;
}): Promise<typeof notifications.$inferSelect> {
  const rejectorName = await getActorName(input.rejectorUserId);
  return createNotification({
    userId: input.ownerUserId,
    icon: "alert",
    title: `Document Rejected`,
    description: `${rejectorName} rejected "${input.documentName}"${input.reason ? `: ${input.reason}` : ""}`,
    link: `/documents/${encodeURIComponent(input.documentId)}`,
    resourceType: "document",
    resourceId: input.documentId,
    actorUserId: input.rejectorUserId,
    metadata: { documentName: input.documentName, reason: input.reason },
  });
}

export async function getUserNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean },
) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const conditions = [eq(notifications.userId, userId)];
  if (options?.unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return result?.count ?? 0;
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<typeof notifications.$inferSelect | null> {
  const [updated] = await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return result.rowCount ?? 0;
}

export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  return (result.rowCount ?? 0) > 0;
}
