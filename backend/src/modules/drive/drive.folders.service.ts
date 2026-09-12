import crypto from "node:crypto";
import type { DriveActivityRepository } from "./drive.activity.js";
import { copyName } from "./drive.helpers.js";
import type {
  DriveFileRepository,
  DriveFolderRepository,
  FolderListInput,
  FolderUpdate,
} from "./drive.repository.js";
import { DriveStorageCoordinator } from "./drive.storage.js";
import { DriveError, type DriveActor, type DriveFile, type DriveFolder } from "./drive.types.js";
import type { DriveAuthorizationPolicy } from "./drive.policy.js";
import type { ObjectStore } from "../../storage/types.js";
import type { DriveStorageOperationRepository } from "./drive.reconciliation.js";

export class DriveFoldersService {
  private readonly storage: DriveStorageCoordinator;

  constructor(
    private readonly folders: DriveFolderRepository,
    private readonly files: Pick<
      DriveFileRepository,
      "fileNameExists" | "moveItems" | "deleteItemsWithStorageOperation"
    >,
    private readonly policy: DriveAuthorizationPolicy,
    private readonly activity: DriveActivityRepository,
    objectStore: ObjectStore,
    operations: DriveStorageOperationRepository,
  ) {
    this.storage = new DriveStorageCoordinator(objectStore, operations);
  }

  async list(actor: DriveActor, input: Omit<FolderListInput, "userId">) {
    await this.policy.scope(actor, input.workspaceId, "read");
    await this.policy.folderInScope(actor, input.parentFolderId, input.workspaceId, "read");
    return this.folders.listFolders({ ...input, userId: actor.userId });
  }

  async create(
    actor: DriveActor,
    input: {
      workspaceId: string | null;
      parentFolderId: string | null;
      name: string;
      description: string | null;
    },
  ): Promise<DriveFolder> {
    await this.policy.scope(actor, input.workspaceId, "write");
    await this.policy.folderInScope(actor, input.parentFolderId, input.workspaceId, "write");
    await this.assertUnique(actor.userId, input.workspaceId, input.parentFolderId, input.name);
    const folder = await this.folders.createFolder({ ...input, userId: actor.userId });
    await this.activity.recordWorkspace(input.workspaceId, actor.userId, "folder_created", {
      type: "folder",
      id: folder.id,
      name: folder.name,
    });
    return folder;
  }

  get(actor: DriveActor, folderId: string): Promise<DriveFolder> {
    return this.policy.folder(actor, folderId, "read");
  }

  async update(actor: DriveActor, folderId: string, updates: FolderUpdate): Promise<DriveFolder> {
    const folder = await this.policy.folder(actor, folderId, "write");
    const parentFolderId = Object.hasOwn(updates, "parentFolderId")
      ? (updates.parentFolderId ?? null)
      : folder.parentFolderId;
    if (Object.hasOwn(updates, "parentFolderId")) {
      await this.policy.folderInScope(actor, parentFolderId, folder.workspaceId, "write");
      if (!(await this.folders.folderMoveIsAcyclic(folder.id, parentFolderId))) {
        throw new DriveError(400, "Cannot move a folder into itself or a descendant");
      }
    }
    await this.assertUnique(
      actor.userId,
      folder.workspaceId,
      parentFolderId,
      updates.name ?? folder.name,
      folder.id,
    );
    return this.folders.updateFolder(folder.id, updates);
  }

  async remove(actor: DriveActor, folderId: string): Promise<void> {
    const folder = await this.policy.folder(actor, folderId, "write");
    await this.authorizeTree(actor, folder.id);
    const result = await this.files.deleteItemsWithStorageOperation({
      userId: actor.userId,
      fileIds: [],
      folderIds: [folder.id],
      idempotencyKey: `drive-delete-folder:${folder.id}:${crypto.randomUUID()}`,
    });
    await this.storage.reconcileDelete(result.storageOperationId);
    await this.activity.recordWorkspace(folder.workspaceId, actor.userId, "folder_deleted", {
      type: "folder",
      id: folder.id,
      name: folder.name,
    });
  }

  async moveItems(
    actor: DriveActor,
    input: {
      fileIds: readonly string[];
      folderIds: readonly string[];
      targetWorkspaceId: string | null;
      targetFolderId: string | null;
    },
  ) {
    if (input.fileIds.length === 0 && input.folderIds.length === 0) {
      throw new DriveError(400, "No items to move");
    }
    await this.policy.scope(actor, input.targetWorkspaceId, "write");
    await this.policy.folderInScope(actor, input.targetFolderId, input.targetWorkspaceId, "write");
    const files = await Promise.all(
      input.fileIds.map((fileId) => this.policy.file(actor, fileId, "write")),
    );
    const folders = await Promise.all(
      input.folderIds.map((folderId) => this.policy.folder(actor, folderId, "write")),
    );
    for (const folder of folders) {
      await this.authorizeTree(actor, folder.id);
      if (!(await this.folders.folderMoveIsAcyclic(folder.id, input.targetFolderId))) {
        throw new DriveError(400, "Cannot move a folder into itself or a descendant");
      }
      await this.assertUnique(
        actor.userId,
        input.targetWorkspaceId,
        input.targetFolderId,
        folder.name,
        folder.id,
      );
    }
    const reserved = new Set<string>();
    const moves = [];
    for (const file of files) {
      const name = await this.uniqueFileName(
        actor.userId,
        input.targetWorkspaceId,
        input.targetFolderId,
        file.name,
        reserved,
      );
      reserved.add(name);
      moves.push({
        fileId: file.id,
        name,
        targetWorkspaceId: input.targetWorkspaceId,
        targetFolderId: input.targetFolderId,
        targetOwnerId: input.targetWorkspaceId ? file.userId : actor.userId,
      });
    }
    const result = await this.files.moveItems({
      userId: actor.userId,
      files: moves,
      folders: folders.map((folder) => ({
        folderId: folder.id,
        targetWorkspaceId: input.targetWorkspaceId,
        targetFolderId: input.targetFolderId,
        targetOwnerId: input.targetWorkspaceId ? folder.userId : actor.userId,
      })),
    });
    await this.recordMoves(actor, files, folders, result.files, input.targetWorkspaceId);
    return result;
  }

  async deleteItems(
    actor: DriveActor,
    input: { fileIds: readonly string[]; folderIds: readonly string[] },
  ) {
    if (input.fileIds.length === 0 && input.folderIds.length === 0) {
      throw new DriveError(400, "No items to delete");
    }
    await Promise.all(input.fileIds.map((fileId) => this.policy.file(actor, fileId, "write")));
    for (const folderId of input.folderIds) {
      await this.policy.folder(actor, folderId, "write");
      await this.authorizeTree(actor, folderId);
    }
    const result = await this.files.deleteItemsWithStorageOperation({
      ...input,
      userId: actor.userId,
      idempotencyKey: `drive-delete-items:${crypto.randomUUID()}`,
    });
    await this.storage.reconcileDelete(result.storageOperationId);
    return {
      filesDeleted: result.filesDeleted,
      foldersDeleted: result.foldersDeleted,
    };
  }

  private async authorizeTree(actor: DriveActor, folderId: string): Promise<void> {
    const folderIds = await this.folders.collectFolderTree(folderId);
    const files = await this.folders.listFilesInFolders(folderIds);
    await Promise.all([
      ...folderIds.map((id) => this.policy.folder(actor, id, "write")),
      ...files.map((file) => this.policy.file(actor, file.id, "write")),
    ]);
  }

  private async assertUnique(
    userId: string,
    workspaceId: string | null,
    parentFolderId: string | null,
    name: string,
    excludeFolderId?: string,
  ): Promise<void> {
    if (
      await this.folders.folderNameExists({
        userId,
        workspaceId,
        parentFolderId,
        name,
        excludeFolderId,
      })
    ) {
      throw new DriveError(409, "A folder with this name already exists");
    }
  }

  private async uniqueFileName(
    userId: string,
    workspaceId: string | null,
    folderId: string | null,
    requested: string,
    reserved: ReadonlySet<string>,
  ): Promise<string> {
    for (let sequence = 0; sequence < 10_000; sequence += 1) {
      const candidate = copyName(requested, sequence);
      if (
        !reserved.has(candidate) &&
        !(await this.files.fileNameExists({
          userId,
          workspaceId,
          folderId,
          name: candidate,
        }))
      ) {
        return candidate;
      }
    }
    throw new DriveError(409, "Unable to generate a unique file name");
  }

  private async recordMoves(
    actor: DriveActor,
    sources: readonly DriveFile[],
    folders: readonly DriveFolder[],
    moved: readonly DriveFile[],
    targetWorkspaceId: string | null,
  ): Promise<void> {
    for (const [index, file] of sources.entries()) {
      const target = moved[index];
      await this.activity.recordFile(file.id, actor.userId, "move", {
        target_folder_id: target?.folderId ?? null,
        target_workspace_id: targetWorkspaceId,
      });
      await this.activity.recordWorkspace(file.workspaceId, actor.userId, "file_moved_out", {
        type: "file",
        id: file.id,
        name: file.name,
      });
      await this.activity.recordWorkspace(targetWorkspaceId, actor.userId, "file_moved_in", {
        type: "file",
        id: file.id,
        name: target?.name ?? file.name,
      });
    }
    for (const folder of folders) {
      await this.activity.recordWorkspace(folder.workspaceId, actor.userId, "folder_moved_out", {
        type: "folder",
        id: folder.id,
        name: folder.name,
      });
      await this.activity.recordWorkspace(targetWorkspaceId, actor.userId, "folder_moved_in", {
        type: "folder",
        id: folder.id,
        name: folder.name,
      });
    }
  }
}
