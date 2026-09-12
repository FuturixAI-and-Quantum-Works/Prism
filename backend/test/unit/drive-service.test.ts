import { describe, expect, it, vi } from "vitest";
import { DrizzleDriveActivityRepository } from "../../src/modules/drive/drive.activity.js";
import { DrizzleDriveFileRepository } from "../../src/modules/drive/drive.file-repository.js";
import { DriveFilesService } from "../../src/modules/drive/drive.files.service.js";
import { DriveAuthorizationPolicy } from "../../src/modules/drive/drive.policy.js";
import type { DriveStorageOperationRepository } from "../../src/modules/drive/drive.reconciliation.js";
import type { DriveFile, DriveVersion } from "../../src/modules/drive/drive.types.js";
import { parseObjectRef, type ObjectRef, type ObjectStore } from "../../src/storage/types.js";

const file: DriveFile = {
  id: "file-1",
  userId: "user-1",
  workspaceId: "workspace-1",
  folderId: null,
  name: "terms.txt",
  description: null,
  storagePath: "workspaces/workspace-1/files/file-1/source.txt",
  sizeBytes: 7n,
  mimeType: "text/plain",
  extension: ".txt",
  checksum: "digest",
  version: 1,
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastAccessedAt: new Date(),
};
const version: DriveVersion = {
  id: "version-1",
  fileId: file.id,
  versionNumber: 1,
  storagePath: file.storagePath,
  sizeBytes: file.sizeBytes,
  checksum: file.checksum,
  createdByUserId: file.userId,
  createdAt: new Date(),
};

function objectStore(): ObjectStore {
  const objects = new Map<ObjectRef, ArrayBuffer>();
  return {
    put: vi.fn(async ({ ref, content }) => {
      objects.set(ref, content);
    }),
    get: vi.fn(async (ref) => {
      const content = objects.get(ref);
      if (!content) throw new Error("missing");
      return content;
    }),
    delete: vi.fn(async (ref) => {
      objects.delete(ref);
    }),
    copy: vi.fn(),
    signRead: vi.fn(async () => "https://example.test/file"),
    health: vi.fn(async () => ({ kind: "healthy" })),
    close: vi.fn(),
  };
}

function operationRepository(): DriveStorageOperationRepository {
  return {
    prepare: vi.fn(async ({ owner }) => ({ id: "operation-1", owner, generation: 1 })),
    abandon: vi.fn(async () => true),
    finishCommitted: vi.fn(async () => true),
    claim: vi.fn(async () => null),
    complete: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    isReferenced: vi.fn(async () => false),
  };
}

describe("DriveFilesService", () => {
  it("authorizes the workspace and folder before querying or writing", async () => {
    const repository: DrizzleDriveFileRepository = Object.create(
      DrizzleDriveFileRepository.prototype,
    );
    const policy: DriveAuthorizationPolicy = Object.create(DriveAuthorizationPolicy.prototype);
    const activity: DrizzleDriveActivityRepository = Object.create(
      DrizzleDriveActivityRepository.prototype,
    );
    const scope = vi.spyOn(policy, "scope").mockResolvedValue();
    const folder = vi.spyOn(policy, "folderInScope").mockResolvedValue(null);
    const nameExists = vi.spyOn(repository, "fileNameExists").mockResolvedValue(false);
    vi.spyOn(repository, "createFileWithInitialVersion").mockResolvedValue({ file, version });
    vi.spyOn(activity, "recordFile").mockResolvedValue();
    vi.spyOn(activity, "recordWorkspace").mockResolvedValue();
    const store = objectStore();
    const indexVersion = vi.fn();
    const service = new DriveFilesService(
      repository,
      policy,
      activity,
      store,
      operationRepository(),
      {
        indexVersion,
        preview: vi.fn(),
      },
    );

    await service.upload(
      { userId: "user-1" },
      {
        workspaceId: "workspace-1",
        folderId: null,
        name: "terms.txt",
        description: null,
        isPrimary: true,
        content: new TextEncoder().encode("content").buffer,
        suppliedMimeType: "text/plain",
      },
    );

    expect(scope).toHaveBeenCalledWith({ userId: "user-1" }, "workspace-1", "write");
    expect(folder).toHaveBeenCalledWith({ userId: "user-1" }, null, "workspace-1", "write");
    expect(scope.mock.invocationCallOrder[0]).toBeLessThan(nameExists.mock.invocationCallOrder[0]);
    expect(store.put).toHaveBeenCalledOnce();
    expect(indexVersion).toHaveBeenCalledWith(file.id, version.id, "user-1", expect.any(String));
  });

  it("checks read access before signing a download URL", async () => {
    const repository: DrizzleDriveFileRepository = Object.create(
      DrizzleDriveFileRepository.prototype,
    );
    const policy: DriveAuthorizationPolicy = Object.create(DriveAuthorizationPolicy.prototype);
    const activity: DrizzleDriveActivityRepository = Object.create(
      DrizzleDriveActivityRepository.prototype,
    );
    const authorize = vi.spyOn(policy, "file").mockResolvedValue(file);
    vi.spyOn(activity, "recordFile").mockResolvedValue();
    const store = objectStore();
    const service = new DriveFilesService(
      repository,
      policy,
      activity,
      store,
      operationRepository(),
      {
        indexVersion: vi.fn(),
        preview: vi.fn(),
      },
    );
    await service.downloadUrl({ userId: "user-1" }, file.id, false);
    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(store.signRead).mock.invocationCallOrder[0],
    );
    expect(store.signRead).toHaveBeenCalledWith(
      expect.objectContaining({ ref: parseObjectRef(file.storagePath) }),
    );
  });
});
