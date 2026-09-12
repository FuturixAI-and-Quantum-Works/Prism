import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DrizzleDownloadsRepository } from "../../src/modules/downloads/downloads.repository.js";
import { DrizzleUsersRepository } from "../../src/modules/users/users.repository.js";

const userId = "00000000-0000-4000-8000-000000000001";
const documentId = "00000000-0000-4000-8000-000000000002";
const fileId = "00000000-0000-4000-8000-000000000003";

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
    storage_limit_bytes bigint DEFAULT 1000 NOT NULL,
    storage_used_bytes bigint DEFAULT 0 NOT NULL,
    message_credits_used integer DEFAULT 0 NOT NULL,
    credits_reset_date timestamp,
    tier varchar(50) DEFAULT 'Free' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE documents (
    id uuid PRIMARY KEY,
    project_id uuid,
    workspace_id uuid,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id uuid,
    filename varchar(500) NOT NULL,
    attached boolean DEFAULT false NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE document_versions (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    storage_path varchar(1000) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE files (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id uuid,
    folder_id uuid,
    name varchar(500) NOT NULL,
    storage_path varchar(1000) NOT NULL UNIQUE,
    size_bytes bigint NOT NULL,
    mime_type varchar(255) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    last_accessed_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE file_versions (
    id uuid PRIMARY KEY,
    file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    storage_path varchar(1000) NOT NULL,
    size_bytes bigint NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  );
`;

describe("downloads and users repositories", () => {
  let pglite: PGlite;
  let downloadsRepository: DrizzleDownloadsRepository;
  let usersRepository: DrizzleUsersRepository;

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(databaseSchema);
    await pglite.query(
      "INSERT INTO users (id, email, full_name) VALUES ($1, 'user@example.com', 'User')",
      [userId],
    );
    const database = drizzle(pglite, { schema });
    downloadsRepository = new DrizzleDownloadsRepository(database);
    usersRepository = new DrizzleUsersRepository(database);
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("resolves document, current drive, and historical drive storage owners", async () => {
    await pglite.query(
      "INSERT INTO documents (id, user_id, filename) VALUES ($1, $2, 'document.docx')",
      [documentId, userId],
    );
    await pglite.query(
      "INSERT INTO document_versions (id, document_id, storage_path) VALUES (gen_random_uuid(), $1, 'documents/current')",
      [documentId],
    );
    await pglite.query(
      "INSERT INTO files (id, user_id, name, storage_path, size_bytes, mime_type) VALUES ($1, $2, 'file.pdf', 'drive/current', 1, 'application/pdf')",
      [fileId, userId],
    );
    await pglite.query(
      "INSERT INTO file_versions (id, file_id, version_number, storage_path, size_bytes) VALUES (gen_random_uuid(), $1, 1, 'drive/history', 1)",
      [fileId],
    );
    await expect(downloadsRepository.findOwner("documents/current")).resolves.toMatchObject({
      kind: "document",
      document: { id: documentId, user_id: userId },
    });
    await expect(downloadsRepository.findOwner("drive/current")).resolves.toEqual({
      kind: "drive-file",
      fileId,
    });
    await expect(downloadsRepository.findOwner("drive/history")).resolves.toEqual({
      kind: "drive-file",
      fileId,
    });
    await expect(downloadsRepository.findOwner("missing")).resolves.toBeNull();
  });

  it("creates, updates, resets, and deletes profile state", async () => {
    await usersRepository.ensureProfile(userId);
    await usersRepository.completeOnboarding(
      userId,
      {
        fullName: "Updated User",
        country: "GB",
        organization: "Prism",
      },
      new Date("2026-09-02T00:00:00.000Z"),
    );
    await usersRepository.updateProfile(
      userId,
      { displayName: "Display", organization: "Futurix" },
      new Date("2026-09-02T01:00:00.000Z"),
    );
    const reset = await usersRepository.resetCredits(
      userId,
      new Date("2026-10-02T00:00:00.000Z"),
      new Date("2026-09-02T02:00:00.000Z"),
    );

    expect(reset).toMatchObject({
      displayName: "Display",
      country: "GB",
      organization: "Futurix",
      onboardingCompleted: true,
      messageCreditsUsed: 0,
    });
    await usersRepository.deleteAccount(userId);
    await expect(usersRepository.findProfile(userId)).resolves.toBeNull();
  });
});
