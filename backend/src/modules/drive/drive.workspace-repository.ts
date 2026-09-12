import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  documents,
  documentVersions,
  driveFiles,
  driveStorageOperations,
  fileVersions,
  users,
  workspaceMembers,
  workspaces,
  type Database,
} from "../../db/index.js";
import {
  DriveError,
  type DriveMember,
  type DriveWorkspace,
  type DriveWorkspaceSummary,
  type WorkspaceMemberRole,
} from "./drive.types.js";
import type { AccessGrant } from "../access/access.types.js";

export class DrizzleDriveWorkspaceRepository {
  constructor(protected readonly database: Database = db) {}

  async findWorkspace(workspaceId: string): Promise<DriveWorkspace | null> {
    const [workspace] = await this.database
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return workspace ?? null;
  }

  async listWorkspaces(
    grants: ReadonlyMap<string, AccessGrant>,
  ): Promise<readonly DriveWorkspaceSummary[]> {
    const workspaceIds = [...grants.keys()];
    if (workspaceIds.length === 0) return [];
    const visible = await this.database
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, workspaceIds))
      .orderBy(desc(workspaces.updatedAt));
    const ownerIds = [...new Set(visible.map(({ ownerId }) => ownerId))];
    const [counts, owners, members] = await Promise.all([
      this.database
        .select({ workspaceId: driveFiles.workspaceId, count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(inArray(driveFiles.workspaceId, workspaceIds))
        .groupBy(driveFiles.workspaceId),
      this.database
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, ownerIds)),
      this.membersForWorkspaces(workspaceIds),
    ]);
    const countById = new Map(counts.map(({ workspaceId, count }) => [workspaceId, count]));
    const ownerById = new Map(owners.map(({ id, fullName }) => [id, fullName]));
    return visible.map((workspace) => ({
      workspace,
      role: grants.get(workspace.id)?.role ?? "viewer",
      ownerName: ownerById.get(workspace.ownerId) ?? null,
      fileCount: countById.get(workspace.id) ?? 0,
      collaborators: members.filter((member) => member.workspaceId === workspace.id),
    }));
  }

  async createWorkspace(input: {
    ownerId: string;
    name: string;
    description: string | null;
  }): Promise<DriveWorkspace> {
    const [workspace] = await this.database.insert(workspaces).values(input).returning();
    return workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    updates: Readonly<{ name?: string; description?: string | null }>,
  ): Promise<DriveWorkspace> {
    const [workspace] = await this.database
      .update(workspaces)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();
    if (!workspace) throw new DriveError(404, "Workspace not found");
    return workspace;
  }

  async deleteWorkspaceWithStorageOperation(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<string> {
    return this.database.transaction(async (tx) => {
      await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .for("update");
      const files = await tx
        .select({ id: driveFiles.id })
        .from(driveFiles)
        .where(eq(driveFiles.workspaceId, workspaceId))
        .for("update");
      const fileIds = files.map(({ id }) => id);
      const [currentObjects, versionObjects] =
        fileIds.length === 0
          ? [[], []]
          : await Promise.all([
              tx
                .select({ path: driveFiles.storagePath })
                .from(driveFiles)
                .where(inArray(driveFiles.id, fileIds)),
              tx
                .select({ path: fileVersions.storagePath })
                .from(fileVersions)
                .where(inArray(fileVersions.fileId, fileIds)),
            ]);
      const workspaceDocuments = await tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.workspaceId, workspaceId))
        .for("update");
      const documentObjects =
        workspaceDocuments.length === 0
          ? []
          : await tx
              .select({
                storagePath: documentVersions.storagePath,
                pdfStoragePath: documentVersions.pdfStoragePath,
              })
              .from(documentVersions)
              .where(
                inArray(
                  documentVersions.documentId,
                  workspaceDocuments.map(({ id }) => id),
                ),
              );
      const objectPaths = new Set([
        ...currentObjects.map(({ path }) => path),
        ...versionObjects.map(({ path }) => path),
      ]);
      for (const version of documentObjects) {
        objectPaths.add(version.storagePath);
        if (version.pdfStoragePath) objectPaths.add(version.pdfStoragePath);
      }
      const [operation] = await tx
        .insert(driveStorageOperations)
        .values({
          idempotencyKey,
          state: "cleanup",
          payload: {
            actions: [...objectPaths].map((path) => ({
              kind: "delete" as const,
              destinationPath: path,
            })),
          },
        })
        .returning({ id: driveStorageOperations.id });
      if (!operation) throw new Error("Failed to persist Drive workspace delete operation");
      await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
      return operation.id;
    });
  }

  async listWorkspaceMembers(workspaceId: string): Promise<readonly DriveMember[]> {
    return this.membersForWorkspaces([workspaceId]);
  }

  async findUser(userId: string) {
    const [user] = await this.database
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  }

  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    const [user] = await this.database
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return user ?? null;
  }

  async upsertWorkspaceMember(input: {
    workspaceId: string;
    userId: string;
    role: WorkspaceMemberRole;
  }): Promise<{ member: DriveMember; previousRole: string | null }> {
    const [existing] = await this.database
      .select({ id: workspaceMembers.id, role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, input.userId),
        ),
      )
      .limit(1);
    if (existing) {
      await this.database
        .update(workspaceMembers)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(workspaceMembers.id, existing.id));
    } else {
      await this.database.insert(workspaceMembers).values(input);
    }
    const member = (await this.membersForWorkspaces([input.workspaceId])).find(
      ({ userId }) => userId === input.userId,
    );
    if (!member) throw new Error("Workspace member write did not persist");
    return { member, previousRole: existing?.role ?? null };
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await this.database
      .delete(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      );
  }

  private async membersForWorkspaces(workspaceIds: readonly string[]): Promise<DriveMember[]> {
    if (workspaceIds.length === 0) return [];
    return this.database
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        email: users.email,
        fullName: users.fullName,
        createdAt: workspaceMembers.createdAt,
        updatedAt: workspaceMembers.updatedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(inArray(workspaceMembers.workspaceId, [...workspaceIds]))
      .orderBy(asc(users.email));
  }
}
