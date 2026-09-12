import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db, driveFiles, driveFolders, type Database } from "../../db/index.js";
import type { DriveFolderRepository, FolderListInput, FolderUpdate } from "./drive.repository.js";
import { DriveError, type DriveFile, type DriveFolder } from "./drive.types.js";

function folderScope(userId: string, workspaceId: string | null) {
  return workspaceId
    ? eq(driveFolders.workspaceId, workspaceId)
    : and(eq(driveFolders.userId, userId), isNull(driveFolders.workspaceId));
}

function folderOrder(sortBy: string | null, sortOrder: string | null) {
  const direction = sortOrder === "desc" ? desc : asc;
  switch (sortBy) {
    case "created_at":
    case "createdAt":
      return direction(driveFolders.createdAt);
    case "updated_at":
    case "updatedAt":
      return direction(driveFolders.updatedAt);
    default:
      return direction(driveFolders.name);
  }
}

export class DrizzleDriveFolderRepository implements DriveFolderRepository {
  constructor(private readonly database: Database = db) {}

  async findFolder(folderId: string): Promise<DriveFolder | null> {
    const [folder] = await this.database
      .select()
      .from(driveFolders)
      .where(eq(driveFolders.id, folderId))
      .limit(1);
    return folder ?? null;
  }

  async listFolders(input: FolderListInput) {
    const search = input.search
      ? or(
          ilike(driveFolders.name, `%${input.search}%`),
          ilike(driveFolders.description, `%${input.search}%`),
        )
      : undefined;
    const where = and(
      folderScope(input.userId, input.workspaceId),
      input.parentFolderId
        ? eq(driveFolders.parentFolderId, input.parentFolderId)
        : isNull(driveFolders.parentFolderId),
      search,
    );
    const [items, count] = await Promise.all([
      this.database
        .select()
        .from(driveFolders)
        .where(where)
        .orderBy(folderOrder(input.sortBy, input.sortOrder))
        .limit(input.limit)
        .offset(input.offset),
      this.database
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFolders)
        .where(where),
    ]);
    return { items, total: count[0]?.count ?? 0, limit: input.limit, offset: input.offset };
  }

  async folderNameExists(input: {
    userId: string;
    workspaceId: string | null;
    parentFolderId: string | null;
    name: string;
    excludeFolderId?: string;
  }): Promise<boolean> {
    const [row] = await this.database
      .select({ id: driveFolders.id })
      .from(driveFolders)
      .where(
        and(
          folderScope(input.userId, input.workspaceId),
          input.parentFolderId
            ? eq(driveFolders.parentFolderId, input.parentFolderId)
            : isNull(driveFolders.parentFolderId),
          eq(driveFolders.name, input.name),
          input.excludeFolderId ? ne(driveFolders.id, input.excludeFolderId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async createFolder(input: {
    userId: string;
    workspaceId: string | null;
    parentFolderId: string | null;
    name: string;
    description: string | null;
  }): Promise<DriveFolder> {
    const [folder] = await this.database.insert(driveFolders).values(input).returning();
    return folder;
  }

  async updateFolder(folderId: string, updates: FolderUpdate): Promise<DriveFolder> {
    const [folder] = await this.database
      .update(driveFolders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(driveFolders.id, folderId))
      .returning();
    if (!folder) throw new DriveError(404, "Folder not found");
    return folder;
  }

  async collectFolderTree(folderId: string): Promise<readonly string[]> {
    const ids: string[] = [];
    const queue = [folderId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || ids.includes(current)) continue;
      ids.push(current);
      const children = await this.database
        .select({ id: driveFolders.id })
        .from(driveFolders)
        .where(eq(driveFolders.parentFolderId, current));
      queue.push(...children.map(({ id }) => id));
    }
    return ids;
  }

  async listFilesInFolders(folderIds: readonly string[]): Promise<readonly DriveFile[]> {
    if (folderIds.length === 0) return [];
    return this.database
      .select()
      .from(driveFiles)
      .where(inArray(driveFiles.folderId, [...folderIds]));
  }

  async folderMoveIsAcyclic(folderId: string, targetParentId: string | null): Promise<boolean> {
    let current = targetParentId;
    const seen = new Set<string>();
    while (current) {
      if (current === folderId || seen.has(current)) return false;
      seen.add(current);
      const [parent] = await this.database
        .select({ parentFolderId: driveFolders.parentFolderId })
        .from(driveFolders)
        .where(eq(driveFolders.id, current))
        .limit(1);
      current = parent?.parentFolderId ?? null;
    }
    return true;
  }
}
