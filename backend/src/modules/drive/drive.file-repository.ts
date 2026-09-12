import { and, asc, desc, eq, gt, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  db,
  driveFiles,
  driveFolders,
  driveStorageOperations,
  fileVersions,
  userProfiles,
  users,
  workspaces,
  type Database,
} from "../../db/index.js";
import type {
  CopyFileRecord,
  DriveFileRepository,
  DriveFolderRepository,
  FileListInput,
  FileUpdate,
  MoveFileInput,
  MoveFolderInput,
  NewFileRecord,
  NewVersionRecord,
  StorageObjectRecord,
} from "./drive.repository.js";
import type { DriveStorageOperationLease } from "./drive.reconciliation.js";
import { DriveError, type DriveFile, type DriveFolder, type DriveVersion } from "./drive.types.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type SqlExecutor = Database | Transaction;

function fileScope(userId: string, workspaceId: string | null) {
  return workspaceId
    ? eq(driveFiles.workspaceId, workspaceId)
    : and(eq(driveFiles.userId, userId), isNull(driveFiles.workspaceId));
}

function fileOrder(sortBy: string | null, sortOrder: string | null) {
  const direction = sortOrder === "asc" ? asc : desc;
  switch (sortBy) {
    case "name":
      return direction(driveFiles.name);
    case "size":
    case "size_bytes":
      return direction(driveFiles.sizeBytes);
    case "created_at":
    case "createdAt":
      return direction(driveFiles.createdAt);
    case "last_accessed_at":
    case "lastAccessedAt":
      return direction(driveFiles.lastAccessedAt);
    default:
      return direction(driveFiles.updatedAt);
  }
}

function groupFilesByStorageScope(files: readonly DriveFile[]) {
  const groups = new Map<string, [DriveFile, ...DriveFile[]]>();
  for (const file of files) {
    const key = file.workspaceId ?? `personal:${file.userId}`;
    const group = groups.get(key);
    if (group) group.push(file);
    else groups.set(key, [file]);
  }
  return groups.values();
}

async function commitStorageOperation(
  executor: SqlExecutor,
  lease: DriveStorageOperationLease,
): Promise<void> {
  const now = new Date();
  const [updated] = await executor
    .update(driveStorageOperations)
    .set({ state: "committed", updatedAt: now })
    .where(
      and(
        eq(driveStorageOperations.id, lease.id),
        eq(driveStorageOperations.state, "prepared"),
        eq(driveStorageOperations.lockedBy, lease.owner),
        eq(driveStorageOperations.leaseGeneration, lease.generation),
        gt(driveStorageOperations.lockedUntil, now),
      ),
    )
    .returning({ id: driveStorageOperations.id });
  if (!updated) throw new Error("Drive storage operation lease was lost");
}

export class DrizzleDriveFileRepository implements DriveFileRepository {
  constructor(
    private readonly database: Database = db,
    private readonly folders: Pick<
      DriveFolderRepository,
      "collectFolderTree" | "listFilesInFolders"
    >,
  ) {}

  async findFile(fileId: string): Promise<DriveFile | null> {
    const [file] = await this.database
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.id, fileId))
      .limit(1);
    return file ?? null;
  }

  async listFiles(input: FileListInput) {
    const search = input.search
      ? or(
          ilike(driveFiles.name, `%${input.search}%`),
          ilike(driveFiles.description, `%${input.search}%`),
        )
      : undefined;
    const where = and(
      fileScope(input.userId, input.workspaceId),
      input.folderId ? eq(driveFiles.folderId, input.folderId) : isNull(driveFiles.folderId),
      search,
    );
    const [items, count] = await Promise.all([
      this.database
        .select()
        .from(driveFiles)
        .where(where)
        .orderBy(fileOrder(input.sortBy, input.sortOrder))
        .limit(input.limit)
        .offset(input.offset),
      this.database
        .select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(where),
    ]);
    return { items, total: count[0]?.count ?? 0, limit: input.limit, offset: input.offset };
  }

  async fileNameExists(input: {
    userId: string;
    workspaceId: string | null;
    folderId: string | null;
    name: string;
    excludeFileId?: string;
  }): Promise<boolean> {
    const [row] = await this.database
      .select({ id: driveFiles.id })
      .from(driveFiles)
      .where(
        and(
          fileScope(input.userId, input.workspaceId),
          input.folderId ? eq(driveFiles.folderId, input.folderId) : isNull(driveFiles.folderId),
          eq(driveFiles.name, input.name),
          input.excludeFileId ? ne(driveFiles.id, input.excludeFileId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async createFileWithInitialVersion(input: NewFileRecord, operation: DriveStorageOperationLease) {
    return this.database.transaction(async (tx) => {
      await this.adjustQuota(tx, input.userId, input.workspaceId, input.sizeBytes);
      const [file] = await tx.insert(driveFiles).values(input).returning();
      const [version] = await tx
        .insert(fileVersions)
        .values({
          fileId: file.id,
          versionNumber: 1,
          storagePath: input.storagePath,
          sizeBytes: input.sizeBytes,
          checksum: input.checksum,
          createdByUserId: input.userId,
        })
        .returning();
      await commitStorageOperation(tx, operation);
      return { file, version };
    });
  }

  async createCopies(input: {
    userId: string;
    workspaceId: string | null;
    files: readonly CopyFileRecord[];
    operation: DriveStorageOperationLease;
  }) {
    return this.database.transaction(async (tx) => {
      const total = input.files.reduce((sum, file) => sum + file.sizeBytes, 0n);
      await this.adjustQuota(tx, input.userId, input.workspaceId, total);
      const created: { file: DriveFile; version: DriveVersion }[] = [];
      for (const inputFile of input.files) {
        const {
          sourceFileId: _sourceFileId,
          sourceChecksum: _sourceChecksum,
          ...fileInput
        } = inputFile;
        const [file] = await tx.insert(driveFiles).values(fileInput).returning();
        const [version] = await tx
          .insert(fileVersions)
          .values({
            fileId: file.id,
            versionNumber: 1,
            storagePath: file.storagePath,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            createdByUserId: input.userId,
          })
          .returning();
        created.push({ file, version });
      }
      await commitStorageOperation(tx, input.operation);
      return created;
    });
  }

  async updateFile(fileId: string, updates: FileUpdate): Promise<DriveFile> {
    const [file] = await this.database
      .update(driveFiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(driveFiles.id, fileId))
      .returning();
    if (!file) throw new DriveError(404, "File not found");
    return file;
  }

  async touchFile(fileId: string): Promise<void> {
    await this.database
      .update(driveFiles)
      .set({ lastAccessedAt: new Date() })
      .where(eq(driveFiles.id, fileId));
  }

  async listVersions(fileId: string) {
    return this.database
      .select({
        id: fileVersions.id,
        fileId: fileVersions.fileId,
        versionNumber: fileVersions.versionNumber,
        storagePath: fileVersions.storagePath,
        sizeBytes: fileVersions.sizeBytes,
        checksum: fileVersions.checksum,
        createdByUserId: fileVersions.createdByUserId,
        createdAt: fileVersions.createdAt,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(fileVersions)
      .leftJoin(users, eq(fileVersions.createdByUserId, users.id))
      .where(eq(fileVersions.fileId, fileId))
      .orderBy(desc(fileVersions.versionNumber));
  }

  async createVersion(
    input: NewVersionRecord,
    operation: DriveStorageOperationLease,
  ): Promise<DriveVersion> {
    return this.database.transaction(async (tx) => {
      const [locked] = await tx
        .select({ version: driveFiles.version, workspaceId: driveFiles.workspaceId })
        .from(driveFiles)
        .where(eq(driveFiles.id, input.fileId))
        .for("update")
        .limit(1);
      if (!locked) throw new DriveError(404, "File not found");
      await this.adjustQuota(tx, input.userId, locked.workspaceId, input.sizeBytes);
      const [latest] = await tx
        .select({ versionNumber: fileVersions.versionNumber })
        .from(fileVersions)
        .where(eq(fileVersions.fileId, input.fileId))
        .orderBy(desc(fileVersions.versionNumber))
        .limit(1);
      const versionNumber = (latest?.versionNumber ?? locked.version) + 1;
      const [version] = await tx
        .insert(fileVersions)
        .values({
          fileId: input.fileId,
          versionNumber,
          storagePath: input.storagePath,
          sizeBytes: input.sizeBytes,
          checksum: input.checksum,
          createdByUserId: input.userId,
        })
        .returning();
      await tx
        .update(driveFiles)
        .set({
          storagePath: input.storagePath,
          sizeBytes: input.sizeBytes,
          checksum: input.checksum,
          mimeType: input.mimeType,
          extension: input.extension,
          version: versionNumber,
          updatedAt: new Date(),
        })
        .where(eq(driveFiles.id, input.fileId));
      await commitStorageOperation(tx, operation);
      return version;
    });
  }

  async moveItems(input: {
    userId: string;
    files: readonly MoveFileInput[];
    folders: readonly MoveFolderInput[];
  }) {
    const folderTrees = await Promise.all(
      input.folders.map(async (folder) => ({
        ...folder,
        treeIds: await this.folders.collectFolderTree(folder.folderId),
      })),
    );
    return this.database.transaction(async (tx) => {
      const movedFiles: DriveFile[] = [];
      const movedFolders: DriveFolder[] = [];
      const directFileIds = new Set(input.files.map(({ fileId }) => fileId));
      for (const folder of folderTrees) {
        const treeFiles = await tx
          .select()
          .from(driveFiles)
          .where(inArray(driveFiles.folderId, [...folder.treeIds]));
        treeFiles.forEach(({ id }) => directFileIds.delete(id));
        await this.transferQuotaForFiles(tx, treeFiles, folder.targetWorkspaceId, input.userId);
        await tx
          .update(driveFolders)
          .set({
            workspaceId: folder.targetWorkspaceId,
            userId: folder.targetOwnerId,
            updatedAt: new Date(),
          })
          .where(inArray(driveFolders.id, [...folder.treeIds]));
        if (treeFiles.length > 0) {
          await tx
            .update(driveFiles)
            .set({
              workspaceId: folder.targetWorkspaceId,
              userId: folder.targetOwnerId,
              updatedAt: new Date(),
            })
            .where(
              inArray(
                driveFiles.id,
                treeFiles.map(({ id }) => id),
              ),
            );
        }
        const [root] = await tx
          .update(driveFolders)
          .set({ parentFolderId: folder.targetFolderId, updatedAt: new Date() })
          .where(eq(driveFolders.id, folder.folderId))
          .returning();
        if (root) movedFolders.push(root);
      }
      for (const file of input.files.filter(({ fileId }) => directFileIds.has(fileId))) {
        const [current] = await tx
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.id, file.fileId))
          .for("update")
          .limit(1);
        if (!current) throw new DriveError(404, "File not found");
        await this.transferQuotaForFiles(tx, [current], file.targetWorkspaceId, input.userId);
        const [updated] = await tx
          .update(driveFiles)
          .set({
            name: file.name,
            folderId: file.targetFolderId,
            workspaceId: file.targetWorkspaceId,
            userId: file.targetOwnerId,
            updatedAt: new Date(),
          })
          .where(eq(driveFiles.id, file.fileId))
          .returning();
        movedFiles.push(updated);
      }
      return { files: movedFiles, folders: movedFolders };
    });
  }

  async deleteItemsWithStorageOperation(input: {
    userId: string;
    fileIds: readonly string[];
    folderIds: readonly string[];
    idempotencyKey: string;
  }): Promise<{
    filesDeleted: number;
    foldersDeleted: number;
    storageOperationId: string;
  }> {
    const treeIds = (
      await Promise.all(input.folderIds.map((folderId) => this.folders.collectFolderTree(folderId)))
    ).flat();
    const nested = await this.folders.listFilesInFolders(treeIds);
    const fileIds = [...new Set([...input.fileIds, ...nested.map(({ id }) => id)])];
    return this.database.transaction(async (tx) => {
      if (fileIds.length > 0) {
        await tx
          .select({ id: driveFiles.id })
          .from(driveFiles)
          .where(inArray(driveFiles.id, fileIds))
          .for("update");
      }
      const objects = await this.storageObjectsForFileIds(fileIds, tx);
      const [operation] = await tx
        .insert(driveStorageOperations)
        .values({
          idempotencyKey: input.idempotencyKey,
          state: "cleanup",
          payload: {
            actions: objects.map(({ path }) => ({
              kind: "delete" as const,
              destinationPath: path,
            })),
          },
        })
        .returning({ id: driveStorageOperations.id });
      if (!operation) throw new Error("Failed to persist Drive delete operation");
      const files =
        fileIds.length > 0
          ? await tx.select().from(driveFiles).where(inArray(driveFiles.id, fileIds))
          : [];
      await this.releaseQuotaForFiles(tx, files, input.userId);
      if (fileIds.length > 0) await tx.delete(driveFiles).where(inArray(driveFiles.id, fileIds));
      if (treeIds.length > 0) {
        await tx.delete(driveFolders).where(inArray(driveFolders.id, treeIds));
      }
      return {
        filesDeleted: fileIds.length,
        foldersDeleted: new Set(treeIds).size,
        storageOperationId: operation.id,
      };
    });
  }

  private async storageObjectsForFileIds(
    fileIds: readonly string[],
    executor: SqlExecutor = this.database,
  ): Promise<readonly StorageObjectRecord[]> {
    if (fileIds.length === 0) return [];
    const [current, versions] = await Promise.all([
      executor
        .select({ path: driveFiles.storagePath, contentType: driveFiles.mimeType })
        .from(driveFiles)
        .where(inArray(driveFiles.id, [...fileIds])),
      executor
        .select({
          path: fileVersions.storagePath,
          contentType: driveFiles.mimeType,
        })
        .from(fileVersions)
        .innerJoin(driveFiles, eq(fileVersions.fileId, driveFiles.id))
        .where(inArray(fileVersions.fileId, [...fileIds])),
    ]);
    return [...new Map([...current, ...versions].map((row) => [row.path, row])).values()];
  }

  private async adjustQuota(
    executor: SqlExecutor,
    userId: string,
    workspaceId: string | null,
    delta: bigint,
  ): Promise<void> {
    if (delta === 0n) return;
    if (workspaceId) {
      const rows = await executor
        .update(workspaces)
        .set({
          storageUsedBytes:
            delta > 0n
              ? sql`${workspaces.storageUsedBytes} + ${delta}`
              : sql`greatest(${workspaces.storageUsedBytes} + ${delta}, 0)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workspaces.id, workspaceId),
            delta > 0n
              ? sql`${workspaces.storageUsedBytes} + ${delta} <= ${workspaces.storageAllocatedBytes}`
              : undefined,
          ),
        )
        .returning({ id: workspaces.id });
      if (rows.length === 0) {
        const [workspace] = await executor
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1);
        if (!workspace) throw new DriveError(404, "Workspace not found");
        throw new DriveError(413, "Workspace storage limit would be exceeded");
      }
      return;
    }
    const rows = await executor
      .update(userProfiles)
      .set({
        storageUsedBytes:
          delta > 0n
            ? sql`${userProfiles.storageUsedBytes} + ${delta}`
            : sql`greatest(${userProfiles.storageUsedBytes} + ${delta}, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userProfiles.userId, userId),
          delta > 0n
            ? sql`${userProfiles.storageUsedBytes} + ${delta} <= ${userProfiles.storageLimitBytes}`
            : undefined,
        ),
      )
      .returning({ userId: userProfiles.userId });
    if (rows.length === 0) {
      const [profile] = await executor
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      if (!profile) throw new DriveError(404, "User profile not found");
      throw new DriveError(413, "Personal storage limit would be exceeded");
    }
  }

  private async storedBytes(executor: SqlExecutor, fileIds: readonly string[]): Promise<bigint> {
    if (fileIds.length === 0) return 0n;
    const [row] = await executor
      .select({ total: sql<string>`coalesce(sum(${fileVersions.sizeBytes}), 0)::text` })
      .from(fileVersions)
      .where(inArray(fileVersions.fileId, [...fileIds]));
    return BigInt(row?.total ?? "0");
  }

  private async transferQuotaForFiles(
    executor: SqlExecutor,
    files: readonly DriveFile[],
    targetWorkspaceId: string | null,
    targetOwnerId: string,
  ): Promise<void> {
    for (const group of groupFilesByStorageScope(files)) {
      const source = group[0];
      if (source.workspaceId === targetWorkspaceId) continue;
      const bytes = await this.storedBytes(
        executor,
        group.map(({ id }) => id),
      );
      await this.adjustQuota(executor, targetOwnerId, targetWorkspaceId, bytes);
      await this.adjustQuota(executor, source.userId, source.workspaceId, -bytes);
    }
  }

  private async releaseQuotaForFiles(
    executor: SqlExecutor,
    files: readonly DriveFile[],
    fallbackUserId: string,
  ): Promise<void> {
    for (const group of groupFilesByStorageScope(files)) {
      const first = group[0];
      const bytes = await this.storedBytes(
        executor,
        group.map(({ id }) => id),
      );
      await this.adjustQuota(executor, first.userId || fallbackUserId, first.workspaceId, -bytes);
    }
  }
}
