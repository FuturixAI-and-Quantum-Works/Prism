import { and, eq, sql } from "drizzle-orm";
import {
  accessRequests,
  db,
  users,
  workspaceMembers,
  workspaces,
  type Database,
} from "../../db/index.js";
import type { WorkspaceMemberRole } from "./drive.types.js";

export type DriveAccessRequest = typeof accessRequests.$inferSelect;

export type PendingDriveAccessRequest = Readonly<{
  id: string;
  workspaceId: string;
  requestedByUserId: string;
  requestedRole: string;
  message: string | null;
  status: string;
  createdAt: Date;
  requesterEmail: string;
  requesterName: string;
}>;

export interface DriveAccessRequestRepository {
  findWorkspace(workspaceId: string): Promise<{ id: string; name: string; ownerId: string } | null>;
  findUser(userId: string): Promise<{ fullName: string; email: string } | null>;
  create(input: {
    workspaceId: string;
    requestedByUserId: string;
    requestedRole: WorkspaceMemberRole;
    message: string | null;
  }): Promise<DriveAccessRequest>;
  listWorkspaceAdminUserIds(workspaceId: string): Promise<readonly string[]>;
  find(requestId: string): Promise<DriveAccessRequest | null>;
  findWorkspaceId(requestId: string): Promise<string | null>;
  upsertWorkspaceMember(input: {
    workspaceId: string;
    userId: string;
    role: string;
  }): Promise<void>;
  markReviewed(input: {
    requestId: string;
    status: "approved" | "rejected";
    reviewedByUserId: string;
    reviewedAt: Date;
  }): Promise<DriveAccessRequest>;
  listPending(workspaceId: string): Promise<readonly PendingDriveAccessRequest[]>;
}

export class DrizzleDriveAccessRequestRepository implements DriveAccessRequestRepository {
  constructor(private readonly database: Database = db) {}

  async findWorkspace(workspaceId: string) {
    const [workspace] = await this.database
      .select({ id: workspaces.id, name: workspaces.name, ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return workspace ?? null;
  }

  async findUser(userId: string) {
    const [user] = await this.database
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  }

  async create(input: {
    workspaceId: string;
    requestedByUserId: string;
    requestedRole: WorkspaceMemberRole;
    message: string | null;
  }): Promise<DriveAccessRequest> {
    const [request] = await this.database.insert(accessRequests).values(input).returning();
    if (!request) throw new Error("Failed to persist access request");
    return request;
  }

  async listWorkspaceAdminUserIds(workspaceId: string): Promise<readonly string[]> {
    const admins = await this.database
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          sql`${workspaceMembers.role} IN ('owner', 'admin')`,
        ),
      );
    return admins.map(({ userId }) => userId);
  }

  async find(requestId: string): Promise<DriveAccessRequest | null> {
    const [request] = await this.database
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);
    return request ?? null;
  }

  async findWorkspaceId(requestId: string): Promise<string | null> {
    const [request] = await this.database
      .select({ workspaceId: accessRequests.workspaceId })
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);
    return request?.workspaceId ?? null;
  }

  async upsertWorkspaceMember(input: {
    workspaceId: string;
    userId: string;
    role: string;
  }): Promise<void> {
    await this.database
      .insert(workspaceMembers)
      .values(input)
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role: input.role, updatedAt: new Date() },
      });
  }

  async markReviewed(input: {
    requestId: string;
    status: "approved" | "rejected";
    reviewedByUserId: string;
    reviewedAt: Date;
  }): Promise<DriveAccessRequest> {
    const [request] = await this.database
      .update(accessRequests)
      .set({
        status: input.status,
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt: input.reviewedAt,
        updatedAt: input.reviewedAt,
      })
      .where(eq(accessRequests.id, input.requestId))
      .returning();
    if (!request) throw new Error("Failed to update access request");
    return request;
  }

  listPending(workspaceId: string): Promise<readonly PendingDriveAccessRequest[]> {
    return this.database
      .select({
        id: accessRequests.id,
        workspaceId: accessRequests.workspaceId,
        requestedByUserId: accessRequests.requestedByUserId,
        requestedRole: accessRequests.requestedRole,
        message: accessRequests.message,
        status: accessRequests.status,
        createdAt: accessRequests.createdAt,
        requesterEmail: users.email,
        requesterName: users.fullName,
      })
      .from(accessRequests)
      .innerJoin(users, eq(accessRequests.requestedByUserId, users.id))
      .where(
        and(eq(accessRequests.workspaceId, workspaceId), eq(accessRequests.status, "pending")),
      );
  }
}
