import { and, eq, or, sql } from "drizzle-orm";
import {
  db,
  documentShares,
  documents,
  projectMembers,
  projects,
  shareInvitations,
  users,
  workspaces,
  workspaceMembers,
  type Database,
} from "../../db/index.js";
import type { ShareResourceType } from "./sharing.types.js";

export type ShareInvitationRow = typeof shareInvitations.$inferSelect;

export class SharingRepository {
  constructor(private readonly database: Database = db) {}

  async findUser(userId: string) {
    const [user] = await this.database
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  }

  async findUserByEmail(email: string) {
    const [user] = await this.database
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return user ?? null;
  }

  async revokePendingDuplicates(
    resourceType: ShareResourceType,
    resourceId: string,
    email: string,
  ): Promise<void> {
    await this.database
      .update(shareInvitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(this.resourceCondition(resourceType, resourceId, email));
  }

  async createInvitation(input: typeof shareInvitations.$inferInsert): Promise<ShareInvitationRow> {
    const [invitation] = await this.database.insert(shareInvitations).values(input).returning();
    if (!invitation) throw new Error("Failed to create share invitation");
    return invitation;
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const [invitation] = await this.database
      .select()
      .from(shareInvitations)
      .where(eq(shareInvitations.tokenHash, tokenHash))
      .limit(1);
    return invitation ?? null;
  }

  async findInvitationById(invitationId: string) {
    const [invitation] = await this.database
      .select()
      .from(shareInvitations)
      .where(eq(shareInvitations.id, invitationId))
      .limit(1);
    return invitation ?? null;
  }

  async expireInvitation(invitationId: string): Promise<void> {
    await this.database
      .update(shareInvitations)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(shareInvitations.id, invitationId));
  }

  async resourceName(invitation: ShareInvitationRow): Promise<string> {
    if (invitation.resourceType === "document" && invitation.documentId) {
      const [document] = await this.database
        .select({ name: documents.filename })
        .from(documents)
        .where(eq(documents.id, invitation.documentId))
        .limit(1);
      return document?.name ?? "Shared item";
    }
    if (invitation.resourceType === "project" && invitation.projectId) {
      const [project] = await this.database
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, invitation.projectId))
        .limit(1);
      return project?.name ?? "Shared item";
    }
    if (invitation.resourceType === "workspace" && invitation.workspaceId) {
      const [workspace] = await this.database
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(eq(workspaces.id, invitation.workspaceId))
        .limit(1);
      return workspace?.name ?? "Shared item";
    }
    return "Shared item";
  }

  async persistAcceptedShare(invitation: ShareInvitationRow, userId: string): Promise<void> {
    if (invitation.resourceType === "document") {
      if (!invitation.documentId) return;
      const [existing] = await this.database
        .select({ id: documentShares.id })
        .from(documentShares)
        .where(
          and(
            eq(documentShares.documentId, invitation.documentId),
            or(eq(documentShares.userId, userId), eq(documentShares.email, invitation.email)),
          ),
        )
        .limit(1);
      if (existing) {
        await this.database
          .update(documentShares)
          .set({
            userId,
            email: invitation.email,
            role: invitation.role,
            invitedByUserId: invitation.invitedByUserId,
            updatedAt: new Date(),
          })
          .where(eq(documentShares.id, existing.id));
      } else {
        await this.database.insert(documentShares).values({
          documentId: invitation.documentId,
          userId,
          email: invitation.email,
          role: invitation.role,
          invitedByUserId: invitation.invitedByUserId,
          updatedAt: new Date(),
        });
      }
      return;
    }
    if (invitation.resourceType === "project") {
      if (!invitation.projectId) return;
      const [existing] = await this.database
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, invitation.projectId),
            or(eq(projectMembers.userId, userId), eq(projectMembers.email, invitation.email)),
          ),
        )
        .limit(1);
      if (existing) {
        await this.database
          .update(projectMembers)
          .set({
            userId,
            email: invitation.email,
            role: invitation.role,
            invitedByUserId: invitation.invitedByUserId,
            updatedAt: new Date(),
          })
          .where(eq(projectMembers.id, existing.id));
      } else {
        await this.database.insert(projectMembers).values({
          projectId: invitation.projectId,
          userId,
          email: invitation.email,
          role: invitation.role,
          invitedByUserId: invitation.invitedByUserId,
          updatedAt: new Date(),
        });
      }
      return;
    }
    if (!invitation.workspaceId) return;
    await this.database
      .insert(workspaceMembers)
      .values({
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role: invitation.role, updatedAt: new Date() },
      });
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const [invitation] = await this.database
      .update(shareInvitations)
      .set({
        status: "accepted",
        acceptedByUserId: userId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shareInvitations.id, invitationId))
      .returning();
    return invitation ?? null;
  }

  async declineInvitation(invitationId: string) {
    const [invitation] = await this.database
      .update(shareInvitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(eq(shareInvitations.id, invitationId))
      .returning();
    return invitation ?? null;
  }

  listPending(resourceType: ShareResourceType, resourceId: string) {
    return this.database
      .select({
        id: shareInvitations.id,
        email: shareInvitations.email,
        role: shareInvitations.role,
        status: shareInvitations.status,
        expires_at: shareInvitations.expiresAt,
        created_at: shareInvitations.createdAt,
      })
      .from(shareInvitations)
      .where(this.resourceCondition(resourceType, resourceId));
  }

  private resourceCondition(resourceType: ShareResourceType, resourceId: string, email?: string) {
    const resource =
      resourceType === "document"
        ? and(
            eq(shareInvitations.resourceType, "document"),
            eq(shareInvitations.documentId, resourceId),
          )
        : resourceType === "project"
          ? and(
              eq(shareInvitations.resourceType, "project"),
              eq(shareInvitations.projectId, resourceId),
            )
          : and(
              eq(shareInvitations.resourceType, "workspace"),
              eq(shareInvitations.workspaceId, resourceId),
            );
    return and(
      resource,
      email ? eq(shareInvitations.email, email) : undefined,
      eq(shareInvitations.status, "pending"),
    );
  }
}
