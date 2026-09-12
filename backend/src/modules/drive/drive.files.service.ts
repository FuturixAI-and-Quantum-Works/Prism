import crypto from "node:crypto";
import {
  ObjectNotFoundError,
  parseObjectRef,
  parseSignedReadTtl,
  type ObjectStore,
} from "../../storage/types.js";
import type { DriveActivityRepository } from "./drive.activity.js";
import { checksum, copyName, detectMimeType, fileExtension } from "./drive.helpers.js";
import type {
  CopyFileRecord,
  DriveFileRepository,
  FileListInput,
  FileUpdate,
} from "./drive.repository.js";
import { DriveStorageCoordinator, fileObjectRef } from "./drive.storage.js";
import { DriveError, type DriveActor, type DriveFile } from "./drive.types.js";
import type { DriveAuthorizationPolicy } from "./drive.policy.js";
import type { DriveStorageOperationRepository } from "./drive.reconciliation.js";

export type DriveFileEffects = Readonly<{
  indexVersion(
    fileId: string,
    versionId: string,
    userId: string,
    checksum: string | null,
  ): Promise<void>;
  preview(input: {
    id: string;
    filename: string;
    bytes: ArrayBuffer | null;
    userId: string;
    mimeType: string;
    fileType: string | null;
  }): Promise<unknown>;
}>;

export class DriveFilesService {
  private readonly storageCoordinator: DriveStorageCoordinator;

  constructor(
    private readonly repository: DriveFileRepository,
    private readonly policy: DriveAuthorizationPolicy,
    private readonly activity: DriveActivityRepository,
    private readonly objectStore: ObjectStore,
    operations: DriveStorageOperationRepository,
    private readonly effects: DriveFileEffects,
  ) {
    this.storageCoordinator = new DriveStorageCoordinator(objectStore, operations);
  }

  async list(actor: DriveActor, input: Omit<FileListInput, "userId">) {
    await this.policy.scope(actor, input.workspaceId, "read");
    await this.policy.folderInScope(actor, input.folderId, input.workspaceId, "read");
    return this.repository.listFiles({ ...input, userId: actor.userId });
  }

  async upload(
    actor: DriveActor,
    input: {
      workspaceId: string | null;
      folderId: string | null;
      name: string;
      description: string | null;
      isPrimary: boolean;
      content: ArrayBuffer;
      suppliedMimeType: string | null;
    },
  ): Promise<DriveFile> {
    await this.policy.scope(actor, input.workspaceId, "write");
    await this.policy.folderInScope(actor, input.folderId, input.workspaceId, "write");
    const name = await this.uniqueFileName(
      actor.userId,
      input.workspaceId,
      input.folderId,
      input.name,
    );
    const id = crypto.randomUUID();
    const ref = fileObjectRef(actor.userId, id, name, input.workspaceId);
    const mimeType = detectMimeType(name, input.suppliedMimeType);
    const digest = checksum(input.content);
    const created = await this.storageCoordinator.putThenCommit(
      `drive-upload:${id}`,
      { ref, content: input.content, contentType: mimeType },
      (operation) =>
        this.repository.createFileWithInitialVersion(
          {
            id,
            userId: actor.userId,
            workspaceId: input.workspaceId,
            folderId: input.folderId,
            name,
            description: input.description,
            storagePath: ref,
            sizeBytes: BigInt(input.content.byteLength),
            mimeType,
            extension: fileExtension(name),
            checksum: digest,
            isPrimary: input.isPrimary,
          },
          operation,
        ),
    );
    await this.activity.recordFile(created.file.id, actor.userId, "upload");
    await this.activity.recordWorkspace(input.workspaceId, actor.userId, "file_uploaded", {
      type: "file",
      id: created.file.id,
      name: created.file.name,
    });
    await this.effects.indexVersion(created.file.id, created.version.id, actor.userId, digest);
    return created.file;
  }

  async copy(
    actor: DriveActor,
    input: {
      fileIds: readonly string[];
      targetWorkspaceId: string | null;
      targetFolderId: string | null;
    },
  ): Promise<readonly DriveFile[]> {
    if (input.fileIds.length === 0) throw new DriveError(400, "file_ids is required");
    await this.policy.scope(actor, input.targetWorkspaceId, "write");
    await this.policy.folderInScope(actor, input.targetFolderId, input.targetWorkspaceId, "write");
    const sources = await Promise.all(
      input.fileIds.map((fileId) => this.policy.file(actor, fileId, "read")),
    );
    const reserved = new Set<string>();
    const records: CopyFileRecord[] = [];
    for (const source of sources) {
      const name = await this.uniqueFileName(
        actor.userId,
        input.targetWorkspaceId,
        input.targetFolderId,
        source.name,
        reserved,
      );
      reserved.add(name);
      const id = crypto.randomUUID();
      records.push({
        id,
        sourceFileId: source.id,
        sourceChecksum: source.checksum,
        userId: actor.userId,
        workspaceId: input.targetWorkspaceId,
        folderId: input.targetFolderId,
        name,
        description: source.description,
        storagePath: fileObjectRef(actor.userId, id, name, input.targetWorkspaceId),
        sizeBytes: source.sizeBytes,
        mimeType: source.mimeType,
        extension: source.extension,
        checksum: source.checksum,
        isPrimary: true,
      });
    }
    const copies = records.map((record, index) => ({
      sourceRef: parseObjectRef(sources[index].storagePath),
      destinationRef: parseObjectRef(record.storagePath),
    }));
    const created = await this.storageCoordinator.copyThenCommit(
      `drive-copy:${crypto
        .createHash("sha256")
        .update(records.map(({ id }) => id).join(":"))
        .digest("hex")}`,
      copies,
      (operation) =>
        this.repository.createCopies({
          userId: actor.userId,
          workspaceId: input.targetWorkspaceId,
          files: records,
          operation,
        }),
    );
    for (const [index, item] of created.entries()) {
      const source = sources[index];
      if (!source) continue;
      await this.activity.recordFile(item.file.id, actor.userId, "copy", {
        copied_from: source.id,
      });
      await this.effects.indexVersion(item.file.id, item.version.id, actor.userId, source.checksum);
    }
    await this.activity.recordWorkspace(
      input.targetWorkspaceId,
      actor.userId,
      "files_copied",
      undefined,
      { count: created.length },
    );
    return created.map(({ file }) => file);
  }

  async get(actor: DriveActor, fileId: string): Promise<DriveFile> {
    const file = await this.policy.file(actor, fileId, "read");
    await this.repository.touchFile(file.id);
    await this.activity.recordFile(file.id, actor.userId, "view");
    return file;
  }

  async update(actor: DriveActor, fileId: string, updates: FileUpdate): Promise<DriveFile> {
    const file = await this.policy.file(actor, fileId, "write");
    const folderId = Object.hasOwn(updates, "folderId")
      ? (updates.folderId ?? null)
      : file.folderId;
    if (Object.hasOwn(updates, "folderId")) {
      await this.policy.folderInScope(actor, folderId, file.workspaceId, "write");
    }
    const name = updates.name ?? file.name;
    if (
      await this.repository.fileNameExists({
        userId: actor.userId,
        workspaceId: file.workspaceId,
        folderId,
        name,
        excludeFileId: file.id,
      })
    ) {
      throw new DriveError(409, "A file with this name already exists");
    }
    const updated = await this.repository.updateFile(file.id, updates);
    await this.activity.recordFile(file.id, actor.userId, "edit");
    return updated;
  }

  async remove(actor: DriveActor, fileId: string): Promise<void> {
    const file = await this.policy.file(actor, fileId, "write");
    await this.activity.recordFile(file.id, actor.userId, "delete");
    const result = await this.repository.deleteItemsWithStorageOperation({
      userId: actor.userId,
      fileIds: [file.id],
      folderIds: [],
      idempotencyKey: `drive-delete-file:${file.id}:${crypto.randomUUID()}`,
    });
    await this.storageCoordinator.reconcileDelete(result.storageOperationId);
  }

  async downloadUrl(actor: DriveActor, fileId: string, inline: boolean) {
    const file = await this.policy.file(actor, fileId, "read");
    const url = await this.objectStore.signRead({
      ref: parseObjectRef(file.storagePath),
      ttl: parseSignedReadTtl(3600),
      downloadFilename: file.name,
      disposition: inline ? "inline" : "attachment",
    });
    await this.activity.recordFile(file.id, actor.userId, inline ? "view_url" : "download_url");
    return { url, fileId: file.id, filename: file.name, expiresIn: 3600 };
  }

  async preview(actor: DriveActor, fileId: string): Promise<unknown> {
    const file = await this.policy.file(actor, fileId, "read");
    let bytes: ArrayBuffer | null;
    try {
      bytes = await this.objectStore.get(parseObjectRef(file.storagePath));
    } catch (error) {
      if (!(error instanceof ObjectNotFoundError)) throw error;
      bytes = null;
    }
    return this.effects.preview({
      id: file.id,
      filename: file.name,
      bytes,
      userId: actor.userId,
      mimeType: file.mimeType,
      fileType: file.extension,
    });
  }

  async activityFeed(actor: DriveActor, fileId: string) {
    const file = await this.policy.file(actor, fileId, "read");
    return this.activity.listFile(file.id);
  }

  private async uniqueFileName(
    userId: string,
    workspaceId: string | null,
    folderId: string | null,
    requested: string,
    reserved: ReadonlySet<string> = new Set(),
  ): Promise<string> {
    for (let sequence = 0; sequence < 10_000; sequence += 1) {
      const candidate = copyName(requested, sequence);
      if (
        !reserved.has(candidate) &&
        !(await this.repository.fileNameExists({
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
}
