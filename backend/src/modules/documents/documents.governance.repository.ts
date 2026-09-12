import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  documentChatMessages,
  documentComments,
  documentEmailEvents,
  documentMembers,
  documentShares,
  documentStateTransitions,
  documentVersions,
  documents,
  userProfiles,
  users,
  workspaceMembers,
  workspaces,
  type Database,
} from "../../db/index.js";
import type { ShareRole } from "../sharing/sharing.types.js";

export type CommentWrite = Readonly<{
  documentId: string;
  versionId: string | null;
  userId: string;
  parentCommentId: string | null;
  body: string;
  anchorText: string | null;
  anchorStart: number | null;
  anchorEnd: number | null;
}>;

export type CommentUpdate = Readonly<{
  body?: string;
  resolved?: boolean;
  resolvedByUserId?: string | null;
  resolvedAt?: Date | null;
  updatedAt: Date;
}>;

export class DocumentGovernanceRepository {
  constructor(private readonly database: Database = db) {}

  async findDocument(documentId: string) {
    const [document] = await this.database
      .select({
        id: documents.id,
        filename: documents.filename,
        fileType: documents.fileType,
        userId: documents.userId,
        projectId: documents.projectId,
        workspaceId: documents.workspaceId,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return document ?? null;
  }

  async findUserEmail(userId: string): Promise<string | null> {
    const [user] = await this.database
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.email ?? null;
  }

  async findSessionDocument(documentId: string) {
    const [document] = await this.database
      .select({
        id: documents.id,
        filename: documents.filename,
        fileType: documents.fileType,
        userId: documents.userId,
        projectId: documents.projectId,
        lifecycleStatus: documents.lifecycleStatus,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return document ?? null;
  }

  async findSessionUser(userId: string) {
    const [user] = await this.database
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: userProfiles.role,
      })
      .from(users)
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  }

  async ensureDrafter(documentId: string, userId: string, email: string | null): Promise<void> {
    await this.database
      .insert(documentMembers)
      .values({
        documentId,
        userId,
        email,
        role: "DRAFTER",
        assignedByUserId: userId,
      })
      .onConflictDoNothing();
  }

  listMembers(documentId: string) {
    return this.database
      .select({
        id: documentMembers.id,
        document_id: documentMembers.documentId,
        user_id: documentMembers.userId,
        email: documentMembers.email,
        role: documentMembers.role,
        assigned_by_user_id: documentMembers.assignedByUserId,
        created_at: documentMembers.createdAt,
        updated_at: documentMembers.updatedAt,
      })
      .from(documentMembers)
      .where(eq(documentMembers.documentId, documentId));
  }

  async assignMember(input: {
    documentId: string;
    assignedByUserId: string;
    email: string | null;
    targetUserId: string | null;
    role: "DRAFTER" | "REVIEWER" | "APPROVER";
  }) {
    const [existing] = await this.database
      .select({ id: documentMembers.id })
      .from(documentMembers)
      .where(
        and(
          eq(documentMembers.documentId, input.documentId),
          input.targetUserId
            ? eq(documentMembers.userId, input.targetUserId)
            : eq(documentMembers.email, input.email!),
        ),
      )
      .limit(1);
    const [member] = existing
      ? await this.database
          .update(documentMembers)
          .set({
            role: input.role,
            assignedByUserId: input.assignedByUserId,
            updatedAt: new Date(),
          })
          .where(eq(documentMembers.id, existing.id))
          .returning()
      : await this.database
          .insert(documentMembers)
          .values({
            documentId: input.documentId,
            userId: input.targetUserId,
            email: input.email,
            role: input.role,
            assignedByUserId: input.assignedByUserId,
            updatedAt: new Date(),
          })
          .returning();
    if (!member) throw new Error("Failed to assign document member");
    return member;
  }

  async revokeMember(documentId: string, memberId: string) {
    const [member] = await this.database
      .delete(documentMembers)
      .where(and(eq(documentMembers.id, memberId), eq(documentMembers.documentId, documentId)))
      .returning({
        id: documentMembers.id,
        email: documentMembers.email,
        role: documentMembers.role,
      });
    return member ?? null;
  }

  async memberEmails(documentId: string, role?: "DRAFTER" | "REVIEWER" | "APPROVER") {
    const rows = await this.database
      .select({ email: documentMembers.email, userEmail: users.email })
      .from(documentMembers)
      .leftJoin(users, eq(documentMembers.userId, users.id))
      .where(
        role
          ? and(eq(documentMembers.documentId, documentId), eq(documentMembers.role, role))
          : eq(documentMembers.documentId, documentId),
      );
    return [
      ...new Set(
        rows.map((row) => (row.email || row.userEmail || "").toLowerCase()).filter(Boolean),
      ),
    ];
  }

  async ownerAdminEmails(documentId: string) {
    const [owner, admins] = await Promise.all([
      this.database
        .select({ email: users.email })
        .from(documents)
        .leftJoin(users, eq(documents.userId, users.id))
        .where(eq(documents.id, documentId))
        .limit(1),
      this.database
        .select({ email: users.email })
        .from(users)
        .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(eq(userProfiles.role, "admin")),
    ]);
    return [
      ...new Set(
        [owner[0]?.email, ...admins.map((admin) => admin.email)]
          .map((email) => email?.trim().toLowerCase() ?? "")
          .filter(Boolean),
      ),
    ];
  }

  async transitionState(input: {
    documentId: string;
    userId: string;
    fromStatus: "DRAFT" | "IN_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "FINALIZED";
    toStatus: "DRAFT" | "IN_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "FINALIZED";
    note: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.database
      .update(documents)
      .set({ lifecycleStatus: input.toStatus, updatedAt: new Date() })
      .where(eq(documents.id, input.documentId));
    await this.database.insert(documentStateTransitions).values({
      documentId: input.documentId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      userId: input.userId,
      note: input.note,
      metadata: input.metadata ?? null,
    });
  }

  async createEmailEvent(input: {
    documentId: string;
    recipient: string;
    template: string;
    triggerType: string;
    metadata: Record<string, unknown>;
  }): Promise<string> {
    const [event] = await this.database
      .insert(documentEmailEvents)
      .values({ ...input, status: "pending" })
      .returning({ id: documentEmailEvents.id });
    if (!event) throw new Error("Failed to create document email event");
    return event.id;
  }

  async createRejectionComment(input: {
    documentId: string;
    versionId: string | null;
    userId: string;
    reason: string;
    anchorText: string | null;
    metadata: Record<string, unknown>;
  }): Promise<string> {
    const [comment] = await this.database
      .insert(documentComments)
      .values({
        documentId: input.documentId,
        versionId: input.versionId,
        userId: input.userId,
        body: input.reason,
        anchorText: input.anchorText,
        metadata: input.metadata,
      })
      .returning({ id: documentComments.id });
    if (!comment) throw new Error("Failed to create rejection comment");
    return comment.id;
  }

  async recordChatMessage(input: {
    documentId: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    roleBadge: "DRAFTER" | "REVIEWER" | "APPROVER" | "OWNER_ADMIN" | "AI";
    aiLabel: "AI_LUNA" | "AI_LUNA_PRISM" | null;
    content: string;
    metadata: Record<string, unknown> | null;
  }) {
    const [row] = await this.database.insert(documentChatMessages).values(input).returning();
    if (!row) throw new Error("Failed to record document chat message");
    return row;
  }

  listShares(documentId: string) {
    return this.database
      .select({
        id: documentShares.id,
        document_id: documentShares.documentId,
        user_id: documentShares.userId,
        email: documentShares.email,
        role: documentShares.role,
        created_at: documentShares.createdAt,
        updated_at: documentShares.updatedAt,
      })
      .from(documentShares)
      .where(eq(documentShares.documentId, documentId))
      .orderBy(asc(documentShares.createdAt));
  }

  async updateShareRole(documentId: string, shareId: string, role: ShareRole) {
    const [share] = await this.database
      .update(documentShares)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, documentId)))
      .returning();
    return share ?? null;
  }

  async deleteShare(documentId: string, shareId: string) {
    const [share] = await this.database
      .delete(documentShares)
      .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, documentId)))
      .returning({
        id: documentShares.id,
        email: documentShares.email,
        role: documentShares.role,
      });
    return share ?? null;
  }

  listChatMessages(documentId: string) {
    return this.database
      .select({
        id: documentChatMessages.id,
        documentId: documentChatMessages.documentId,
        userId: documentChatMessages.userId,
        userName: documentChatMessages.userName,
        userEmail: documentChatMessages.userEmail,
        roleBadge: documentChatMessages.roleBadge,
        aiLabel: documentChatMessages.aiLabel,
        content: documentChatMessages.content,
        metadata: documentChatMessages.metadata,
        emailNotification: documentChatMessages.emailNotification,
        createdAt: documentChatMessages.createdAt,
      })
      .from(documentChatMessages)
      .where(eq(documentChatMessages.documentId, documentId))
      .orderBy(asc(documentChatMessages.createdAt));
  }

  listComments(documentId: string) {
    return this.database
      .select({
        id: documentComments.id,
        documentId: documentComments.documentId,
        versionId: documentComments.versionId,
        userId: documentComments.userId,
        parentCommentId: documentComments.parentCommentId,
        body: documentComments.body,
        anchorText: documentComments.anchorText,
        anchorStart: documentComments.anchorStart,
        anchorEnd: documentComments.anchorEnd,
        metadata: documentComments.metadata,
        resolved: documentComments.resolved,
        resolvedByUserId: documentComments.resolvedByUserId,
        resolvedAt: documentComments.resolvedAt,
        createdAt: documentComments.createdAt,
        updatedAt: documentComments.updatedAt,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(documentComments)
      .leftJoin(users, eq(documentComments.userId, users.id))
      .where(eq(documentComments.documentId, documentId))
      .orderBy(desc(documentComments.createdAt));
  }

  async versionExists(documentId: string, versionId: string): Promise<boolean> {
    const [version] = await this.database
      .select({ id: documentVersions.id })
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
      .limit(1);
    return Boolean(version);
  }

  async commentExists(documentId: string, commentId: string): Promise<boolean> {
    const [comment] = await this.database
      .select({ id: documentComments.id })
      .from(documentComments)
      .where(and(eq(documentComments.id, commentId), eq(documentComments.documentId, documentId)))
      .limit(1);
    return Boolean(comment);
  }

  async createComment(input: CommentWrite) {
    const [comment] = await this.database
      .insert(documentComments)
      .values({ ...input, metadata: {} })
      .returning();
    if (!comment) throw new Error("Failed to create comment");
    return comment;
  }

  async updateComment(documentId: string, commentId: string, updates: CommentUpdate) {
    const [comment] = await this.database
      .update(documentComments)
      .set(updates)
      .where(and(eq(documentComments.id, commentId), eq(documentComments.documentId, documentId)))
      .returning();
    return comment ?? null;
  }

  async deleteComment(documentId: string, commentId: string): Promise<string | null> {
    const [comment] = await this.database
      .delete(documentComments)
      .where(and(eq(documentComments.id, commentId), eq(documentComments.documentId, documentId)))
      .returning({ id: documentComments.id });
    return comment?.id ?? null;
  }

  async listMentionableEmails(
    documentId: string,
    ownerId: string,
    workspaceId: string | null,
  ): Promise<(string | null)[]> {
    const memberRows = await this.database
      .select({ email: documentMembers.email, userId: documentMembers.userId })
      .from(documentMembers)
      .where(eq(documentMembers.documentId, documentId));
    const emails = memberRows.map(({ email }) => email);
    const userIds = new Set<string>([
      ownerId,
      ...memberRows.flatMap(({ userId }) => (userId ? [userId] : [])),
    ]);
    if (workspaceId) {
      const [workspace] = await this.database
        .select({ ownerId: workspaces.ownerId })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      if (workspace?.ownerId) userIds.add(workspace.ownerId);
      const workspaceRows = await this.database
        .select({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));
      for (const row of workspaceRows) userIds.add(row.userId);
    }
    const adminRows = await this.database
      .select({ id: users.id, email: users.email })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(userProfiles.role, "admin"));
    for (const admin of adminRows) {
      userIds.add(admin.id);
      emails.push(admin.email);
    }
    if (userIds.size > 0) {
      const userRows = await this.database
        .select({ email: users.email })
        .from(users)
        .where(inArray(users.id, [...userIds]));
      emails.push(...userRows.map(({ email }) => email));
    }
    return emails;
  }
}
