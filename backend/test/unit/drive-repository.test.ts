import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DrizzleDriveFileRepository } from "../../src/modules/drive/drive.file-repository.js";
import { DrizzleDriveFolderRepository } from "../../src/modules/drive/drive.folder-repository.js";
import { DrizzleDriveWorkspaceRepository } from "../../src/modules/drive/drive.workspace-repository.js";

const databaseSchema = `
  CREATE TABLE users (
    id uuid PRIMARY KEY,
    email varchar(255) NOT NULL UNIQUE,
    full_name varchar(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE user_profiles (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name varchar(255),
    country varchar(100),
    jurisdiction varchar(255),
    organization varchar(255),
    professional_role varchar(100),
    role varchar(20) DEFAULT 'viewer' NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    storage_limit_bytes bigint DEFAULT 15 NOT NULL,
    storage_used_bytes bigint DEFAULT 0 NOT NULL CHECK (storage_used_bytes >= 0),
    message_credits_used integer DEFAULT 0 NOT NULL,
    credits_reset_date timestamp,
    tier varchar(50) DEFAULT 'Free' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    description text,
    storage_allocated_bytes bigint DEFAULT 15 NOT NULL,
    storage_used_bytes bigint DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE workspace_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role varchar(20) DEFAULT 'viewer' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(workspace_id, user_id)
  );
  CREATE TABLE folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    description text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE files (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
    name varchar(500) NOT NULL,
    description text,
    storage_path varchar(1000) NOT NULL UNIQUE,
    size_bytes bigint NOT NULL,
    mime_type varchar(255) NOT NULL,
    extension varchar(32),
    checksum varchar(128),
    version integer DEFAULT 1 NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    last_accessed_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE file_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    storage_path varchar(1000) NOT NULL,
    size_bytes bigint NOT NULL,
    checksum varchar(128),
    created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(file_id, version_number)
  );
  CREATE TABLE documents (
    id uuid PRIMARY KEY,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE
  );
  CREATE TABLE document_versions (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    storage_path varchar(1000) NOT NULL,
    pdf_storage_path varchar(1000)
  );
  CREATE TABLE drive_storage_operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key varchar(255) NOT NULL UNIQUE,
    state varchar(32) DEFAULT 'prepared' NOT NULL,
    payload jsonb NOT NULL,
    lease_generation integer DEFAULT 1 NOT NULL,
    locked_by varchar(255),
    locked_until timestamp,
    attempts integer DEFAULT 0 NOT NULL,
    available_at timestamp DEFAULT now() NOT NULL,
    cleanup_grace_ms integer DEFAULT 0 NOT NULL,
    cleanup_until timestamp,
    completed_at timestamp,
    last_error text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
`;

describe("Drive repository transactions", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  let pglite: PGlite;
  let repository: DrizzleDriveFileRepository;
  let workspaceRepository: DrizzleDriveWorkspaceRepository;

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(databaseSchema);
    await pglite.query(
      "INSERT INTO users (id, email, full_name) VALUES ($1, 'owner@example.com', 'Owner')",
      [userId],
    );
    await pglite.query("INSERT INTO user_profiles (user_id, storage_limit_bytes) VALUES ($1, 15)", [
      userId,
    ]);
    const database = drizzle(pglite, { schema });
    repository = new DrizzleDriveFileRepository(
      database,
      new DrizzleDriveFolderRepository(database),
    );
    workspaceRepository = new DrizzleDriveWorkspaceRepository(database);
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("commits the file, initial version, and quota reservation together", async () => {
    await repository.createFileWithInitialVersion(
      fileInput("file-1", "one.txt", 6n),
      await operation("00000000-0000-4000-8000-000000000101"),
    );
    const usage = await pglite.query<{ storage_used_bytes: bigint }>(
      "SELECT storage_used_bytes FROM user_profiles WHERE user_id = $1",
      [userId],
    );
    const versions = await pglite.query<{ count: bigint }>("SELECT count(*) FROM file_versions");
    const operationState = await pglite.query<{ state: string }>(
      "SELECT state FROM drive_storage_operations WHERE id = $1",
      ["00000000-0000-4000-8000-000000000101"],
    );
    expect(Number(usage.rows[0]?.storage_used_bytes)).toBe(6);
    expect(Number(versions.rows[0]?.count)).toBe(1);
    expect(operationState.rows[0]?.state).toBe("committed");
  });

  it("rolls quota back when a later write in the transaction fails", async () => {
    await repository.createFileWithInitialVersion(
      fileInput("file-1", "same.txt", 6n),
      await operation("00000000-0000-4000-8000-000000000102"),
    );
    await expect(
      repository.createFileWithInitialVersion(
        fileInput("file-2", "same.txt", 2n),
        await operation("00000000-0000-4000-8000-000000000103"),
      ),
    ).rejects.toThrow();
    const usage = await pglite.query<{ storage_used_bytes: bigint }>(
      "SELECT storage_used_bytes FROM user_profiles WHERE user_id = $1",
      [userId],
    );
    expect(Number(usage.rows[0]?.storage_used_bytes)).toBe(6);
  });

  it("rejects an over-quota upload without creating metadata", async () => {
    await expect(
      repository.createFileWithInitialVersion(
        fileInput("file-1", "large.txt", 16n),
        await operation("00000000-0000-4000-8000-000000000104"),
      ),
    ).rejects.toMatchObject({ status: 413 });
    const files = await pglite.query<{ count: bigint }>("SELECT count(*) FROM files");
    expect(Number(files.rows[0]?.count)).toBe(0);
  });

  it("rejects a metadata commit after its storage lease expires", async () => {
    const lease = await operation("00000000-0000-4000-8000-000000000108");
    await pglite.query(
      "UPDATE drive_storage_operations SET locked_until = '2000-01-01T00:00:00Z' WHERE id = $1",
      [lease.id],
    );
    await expect(
      repository.createFileWithInitialVersion(fileInput("file-1", "late.txt", 6n), lease),
    ).rejects.toThrow("lease was lost");
    const files = await pglite.query<{ count: bigint }>("SELECT count(*) FROM files");
    expect(Number(files.rows[0]?.count)).toBe(0);
  });

  it("allows only one concurrent reservation when both would exceed quota", async () => {
    const results = await Promise.allSettled([
      repository.createFileWithInitialVersion(
        fileInput("file-1", "one.txt", 10n, "one.txt"),
        await operation("00000000-0000-4000-8000-000000000105"),
      ),
      repository.createFileWithInitialVersion(
        fileInput("file-2", "two.txt", 10n, "two.txt"),
        await operation("00000000-0000-4000-8000-000000000106"),
      ),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
    const usage = await pglite.query<{ storage_used_bytes: bigint }>(
      "SELECT storage_used_bytes FROM user_profiles WHERE user_id = $1",
      [userId],
    );
    expect(Number(usage.rows[0]?.storage_used_bytes)).toBe(10);
  });

  it("moves and releases version quota in the same metadata transactions", async () => {
    const workspaceId = "00000000-0000-4000-8000-000000000021";
    const created = await repository.createFileWithInitialVersion(
      fileInput("file-1", "one.txt", 6n),
      await operation("00000000-0000-4000-8000-000000000107"),
    );
    await pglite.query(
      "INSERT INTO workspaces (id, owner_id, name, storage_allocated_bytes) VALUES ($1, $2, 'Team', 15)",
      [workspaceId, userId],
    );
    await repository.moveItems({
      userId,
      files: [
        {
          fileId: created.file.id,
          name: created.file.name,
          targetWorkspaceId: workspaceId,
          targetFolderId: null,
          targetOwnerId: userId,
        },
      ],
      folders: [],
    });
    const movedUsage = await pglite.query<{
      personal: bigint;
      workspace: bigint;
    }>(
      `SELECT
        (SELECT storage_used_bytes FROM user_profiles WHERE user_id = $1) AS personal,
        (SELECT storage_used_bytes FROM workspaces WHERE id = $2) AS workspace`,
      [userId, workspaceId],
    );
    expect(Number(movedUsage.rows[0]?.personal)).toBe(0);
    expect(Number(movedUsage.rows[0]?.workspace)).toBe(6);

    await repository.deleteItemsWithStorageOperation({
      userId,
      fileIds: [created.file.id],
      folderIds: [],
      idempotencyKey: "delete-file-1",
    });
    const released = await pglite.query<{ storage_used_bytes: bigint }>(
      "SELECT storage_used_bytes FROM workspaces WHERE id = $1",
      [workspaceId],
    );
    const deleteOperation = await pglite.query<{
      state: string;
      payload: { actions: unknown[] };
    }>(
      "SELECT state, payload FROM drive_storage_operations WHERE idempotency_key = 'delete-file-1'",
    );
    expect(Number(released.rows[0]?.storage_used_bytes)).toBe(0);
    expect(deleteOperation.rows[0]?.state).toBe("cleanup");
    expect(deleteOperation.rows[0]?.payload.actions).toHaveLength(1);
  });

  it("persists Drive and document object cleanup before deleting a workspace", async () => {
    const workspaceId = "00000000-0000-4000-8000-000000000022";
    const documentId = "00000000-0000-4000-8000-000000000031";
    await pglite.query("INSERT INTO workspaces (id, owner_id, name) VALUES ($1, $2, 'Team')", [
      workspaceId,
      userId,
    ]);
    await repository.createFileWithInitialVersion(
      { ...fileInput("file-1", "one.txt", 6n), workspaceId },
      await operation("00000000-0000-4000-8000-000000000109"),
    );
    await pglite.query("INSERT INTO documents (id, workspace_id) VALUES ($1, $2)", [
      documentId,
      workspaceId,
    ]);
    await pglite.query(
      `INSERT INTO document_versions (
        id, document_id, storage_path, pdf_storage_path
      ) VALUES ($1, $2, 'documents/source.docx', 'documents/source.pdf')`,
      ["00000000-0000-4000-8000-000000000032", documentId],
    );

    const operationId = await workspaceRepository.deleteWorkspaceWithStorageOperation(
      workspaceId,
      "delete-workspace",
    );

    const cleanup = await pglite.query<{ payload: { actions: { destinationPath: string }[] } }>(
      "SELECT payload FROM drive_storage_operations WHERE id = $1",
      [operationId],
    );
    expect(
      cleanup.rows[0]?.payload.actions.map(({ destinationPath }) => destinationPath).sort(),
    ).toEqual(["documents/source.docx", "documents/source.pdf", "drive/user/shared.txt"]);
    const workspaces = await pglite.query<{ count: bigint }>(
      "SELECT count(*) FROM workspaces WHERE id = $1",
      [workspaceId],
    );
    expect(Number(workspaces.rows[0]?.count)).toBe(0);
  });

  function fileInput(id: string, name: string, sizeBytes: bigint, path = "shared.txt") {
    return {
      id: `00000000-0000-4000-8000-${id === "file-1" ? "000000000011" : "000000000012"}`,
      userId,
      workspaceId: null,
      folderId: null,
      name,
      description: null,
      storagePath: `drive/user/${path}`,
      sizeBytes,
      mimeType: "text/plain",
      extension: ".txt",
      checksum: "checksum",
      isPrimary: true,
    };
  }

  async function operation(id: string) {
    const owner = `owner:${id}`;
    await pglite.query(
      `INSERT INTO drive_storage_operations (
        id, idempotency_key, payload, locked_by, locked_until
      ) VALUES ($1, $2, '{"actions":[]}'::jsonb, $3, now() + interval '1 hour')`,
      [id, `operation:${id}`, owner],
    );
    return { id, owner, generation: 1 };
  }
});
