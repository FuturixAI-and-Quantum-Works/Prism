import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DrizzleDriveStorageOperationRepository } from "../../src/modules/drive/drive.reconciliation.js";

const databaseSchema = `
  CREATE TABLE files (
    id uuid PRIMARY KEY,
    storage_path varchar(1000) NOT NULL
  );
  CREATE TABLE file_versions (
    id uuid PRIMARY KEY,
    storage_path varchar(1000) NOT NULL
  );
  CREATE TABLE document_versions (
    id uuid PRIMARY KEY,
    storage_path varchar(1000) NOT NULL,
    pdf_storage_path varchar(1000)
  );
  CREATE TABLE drive_storage_operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key varchar(255) NOT NULL UNIQUE,
    state varchar(32) DEFAULT 'prepared' NOT NULL,
    payload jsonb NOT NULL,
    lease_generation integer DEFAULT 0 NOT NULL,
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

describe("DrizzleDriveStorageOperationRepository", () => {
  let pglite: PGlite;
  let repository: DrizzleDriveStorageOperationRepository;

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(databaseSchema);
    repository = new DrizzleDriveStorageOperationRepository(drizzle(pglite, { schema }));
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("advances a cleanup lease fence and rejects duplicate completion", async () => {
    const lease = await repository.prepare({
      idempotencyKey: "upload:one",
      owner: "request",
      leaseDurationMs: 30_000,
      cleanupGraceMs: 0,
      payload: {
        actions: [
          {
            kind: "put",
            destinationPath: "drive/user/files/one/source.txt",
            contentType: "text/plain",
          },
        ],
      },
    });
    expect(await repository.abandon(lease)).toBe(true);
    const claim = await repository.claim({
      owner: "worker",
      leaseDurationMs: 30_000,
      operationId: lease.id,
    });
    expect(claim?.lease.generation).toBe(2);
    expect(await repository.complete(claim!.lease, "cleanup")).toBe(true);
    expect(await repository.complete(claim!.lease, "cleanup")).toBe(false);
    expect(
      await repository.claim({
        owner: "duplicate-worker",
        leaseDurationMs: 30_000,
        operationId: lease.id,
      }),
    ).toBeNull();
  });

  it("claims committed operations before completing them", async () => {
    const lease = await repository.prepare({
      idempotencyKey: "upload:committed",
      owner: "request",
      leaseDurationMs: 30_000,
      cleanupGraceMs: 60_000,
      payload: { actions: [] },
    });
    await pglite.query(
      `UPDATE drive_storage_operations
       SET
         state = 'committed',
         locked_until = '2000-01-01T00:00:00Z',
         available_at = '2000-01-01T00:00:00Z'
       WHERE id = $1`,
      [lease.id],
    );
    const claim = await repository.claim({
      owner: "worker",
      leaseDurationMs: 30_000,
      operationId: lease.id,
    });
    expect(claim?.state).toBe("committed");
    expect(claim?.lease.generation).toBe(2);
    expect(await repository.complete(claim!.lease, "committed")).toBe(true);
  });

  it("releases failed cleanup for a later worker", async () => {
    const lease = await repository.prepare({
      idempotencyKey: "upload:retry",
      owner: "request",
      leaseDurationMs: 30_000,
      cleanupGraceMs: 60_000,
      payload: { actions: [] },
    });
    await repository.abandon(lease);
    const first = await repository.claim({
      owner: "worker-one",
      leaseDurationMs: 30_000,
      operationId: lease.id,
    });
    expect(first).not.toBeNull();
    await repository.retry(first!.lease, "storage unavailable", new Date());
    await pglite.query(
      "UPDATE drive_storage_operations SET available_at = '2000-01-01T00:00:00Z' WHERE id = $1",
      [lease.id],
    );
    const retried = await pglite.query<{
      state: string;
      locked_by: string | null;
      locked_until: Date | null;
      attempts: number;
    }>(
      "SELECT state, locked_by, locked_until, attempts FROM drive_storage_operations WHERE id = $1",
      [lease.id],
    );
    expect(retried.rows[0]).toMatchObject({
      state: "cleanup",
      locked_by: null,
      locked_until: null,
      attempts: 1,
    });
    const second = await repository.claim({
      owner: "worker-two",
      leaseDurationMs: 30_000,
      operationId: lease.id,
    });
    expect(second?.lease.generation).toBe(3);
  });

  it("persists the cleanup horizon across deferred claims", async () => {
    const lease = await repository.prepare({
      idempotencyKey: "upload:horizon",
      owner: "request",
      leaseDurationMs: 30_000,
      cleanupGraceMs: 60_000,
      payload: { actions: [] },
    });
    await repository.abandon(lease);
    const first = await repository.claim({
      owner: "worker-one",
      leaseDurationMs: 30_000,
      operationId: lease.id,
    });
    expect(first?.cleanupUntil).toBeInstanceOf(Date);
    if (!first?.cleanupUntil) throw new Error("Expected cleanup horizon");
    const nextCheck = new Date(first.cleanupUntil.getTime() - 1);
    await expect(repository.deferCleanup(first.lease, nextCheck)).resolves.toBe(true);
    await expect(
      repository.claim({
        owner: "worker-two",
        leaseDurationMs: 30_000,
        operationId: lease.id,
      }),
    ).resolves.toBeNull();
    await pglite.query(
      "UPDATE drive_storage_operations SET available_at = '2000-01-01T00:00:00Z' WHERE id = $1",
      [lease.id],
    );
    const second = await repository.claim({
      owner: "worker-two",
      leaseDurationMs: 30_000,
      operationId: lease.id,
    });
    expect(second?.cleanupUntil).toEqual(first.cleanupUntil);
  });

  it("detects references from current files and historical versions", async () => {
    await pglite.query("INSERT INTO files (id, storage_path) VALUES ($1, $2)", [
      "00000000-0000-4000-8000-000000000001",
      "drive/current.txt",
    ]);
    await pglite.query("INSERT INTO file_versions (id, storage_path) VALUES ($1, $2)", [
      "00000000-0000-4000-8000-000000000002",
      "drive/version.txt",
    ]);
    await pglite.query(
      `INSERT INTO document_versions (
        id, storage_path, pdf_storage_path
      ) VALUES ($1, 'documents/source.docx', 'documents/source.pdf')`,
      ["00000000-0000-4000-8000-000000000003"],
    );
    await expect(repository.isReferenced("drive/current.txt")).resolves.toBe(true);
    await expect(repository.isReferenced("drive/version.txt")).resolves.toBe(true);
    await expect(repository.isReferenced("documents/source.docx")).resolves.toBe(true);
    await expect(repository.isReferenced("documents/source.pdf")).resolves.toBe(true);
    await expect(repository.isReferenced("drive/orphan.txt")).resolves.toBe(false);
  });
});
