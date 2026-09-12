import crypto from "node:crypto";
import type { ObjectStore } from "../../storage/types.js";
import type { DriveActivityRepository } from "./drive.activity.js";
import { checksum, detectMimeType, fileExtension } from "./drive.helpers.js";
import type { DriveFileRepository } from "./drive.repository.js";
import { DriveStorageCoordinator, versionObjectRef } from "./drive.storage.js";
import type { DriveActor } from "./drive.types.js";
import type { DriveAuthorizationPolicy } from "./drive.policy.js";
import type { DriveStorageOperationRepository } from "./drive.reconciliation.js";

export type DriveVersionEffects = Readonly<{
  indexVersion(
    fileId: string,
    versionId: string,
    userId: string,
    checksum: string | null,
  ): Promise<void>;
}>;

export class DriveVersionsService {
  private readonly storage: DriveStorageCoordinator;

  constructor(
    private readonly repository: Pick<DriveFileRepository, "listVersions" | "createVersion">,
    private readonly policy: DriveAuthorizationPolicy,
    private readonly activity: DriveActivityRepository,
    objectStore: ObjectStore,
    operations: DriveStorageOperationRepository,
    private readonly effects: DriveVersionEffects,
  ) {
    this.storage = new DriveStorageCoordinator(objectStore, operations);
  }

  async list(actor: DriveActor, fileId: string) {
    const file = await this.policy.file(actor, fileId, "read");
    return {
      currentVersion: file.version,
      versions: await this.repository.listVersions(file.id),
    };
  }

  async create(
    actor: DriveActor,
    fileId: string,
    input: {
      name: string;
      content: ArrayBuffer;
      suppliedMimeType: string | null;
    },
  ) {
    const file = await this.policy.file(actor, fileId, "write");
    const mimeType = detectMimeType(input.name, input.suppliedMimeType);
    const digest = checksum(input.content);
    const ref = versionObjectRef(
      actor.userId,
      file.id,
      `v${file.version + 1}-${crypto.randomUUID()}`,
      input.name,
      file.workspaceId,
    );
    const version = await this.storage.putThenCommit(
      `drive-version:${file.id}:${ref}`,
      { ref, content: input.content, contentType: mimeType },
      (operation) =>
        this.repository.createVersion(
          {
            fileId: file.id,
            userId: actor.userId,
            storagePath: ref,
            sizeBytes: BigInt(input.content.byteLength),
            checksum: digest,
            mimeType,
            extension: fileExtension(input.name),
          },
          operation,
        ),
    );
    await this.activity.recordFile(file.id, actor.userId, "version_uploaded", {
      version_number: version.versionNumber,
      size_bytes: version.sizeBytes.toString(),
    });
    await this.activity.recordWorkspace(
      file.workspaceId,
      actor.userId,
      "file_version_uploaded",
      { type: "file", id: file.id, name: file.name },
      { version_number: version.versionNumber },
    );
    await this.effects.indexVersion(file.id, version.id, actor.userId, digest);
    return version;
  }
}
