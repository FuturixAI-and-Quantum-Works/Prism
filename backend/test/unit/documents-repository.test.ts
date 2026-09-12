import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DocumentsRepository } from "../../src/modules/documents/documents.repository.js";

const databaseSchema = `
  CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid,
    workspace_id uuid,
    user_id uuid NOT NULL,
    folder_id uuid,
    filename varchar(500) NOT NULL,
    file_type varchar(20),
    size_bytes integer,
    page_count integer,
    structure_tree jsonb,
    status varchar(50) DEFAULT 'processing',
    lifecycle_status text DEFAULT 'DRAFT' NOT NULL,
    current_version_id uuid,
    attached boolean DEFAULT false NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    storage_path varchar(1000) NOT NULL,
    pdf_storage_path varchar(1000),
    source varchar(50),
    version_number integer,
    display_name varchar(500),
    created_at timestamp DEFAULT now() NOT NULL
  );
  ALTER TABLE documents ADD CONSTRAINT documents_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;
  CREATE TABLE document_context_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    context_document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(document_id, context_document_id)
  );
`;

describe("DocumentsRepository transactions", () => {
  let pglite: PGlite;
  let repository: DocumentsRepository;

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(databaseSchema);
    const database = drizzle(pglite, { schema });
    repository = new DocumentsRepository(database as never);
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("creates a ready document and initial version atomically", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const created = await repository.createWithInitialVersion({
      document: {
        id,
        userId: "00000000-0000-4000-8000-000000000002",
        filename: "contract.pdf",
        fileType: "pdf",
        status: "processing",
      },
      version: {
        storagePath: "documents/user/document/source.pdf",
        pdfStoragePath: "documents/user/document/source.pdf",
        source: "upload",
        versionNumber: 1,
        displayName: "contract.pdf",
      },
    });

    expect(created).toMatchObject({
      id,
      status: "ready",
      filename: "contract.pdf",
    });
    expect(created.currentVersionId).toBeTruthy();
    await expect(repository.listVersions(id)).resolves.toHaveLength(1);
  });

  it("deduplicates context attachments inside the transaction", async () => {
    const targetId = "00000000-0000-4000-8000-000000000001";
    const contextId = "00000000-0000-4000-8000-000000000002";
    for (const id of [targetId, contextId]) {
      await repository.createWithInitialVersion({
        document: {
          id,
          userId: "00000000-0000-4000-8000-000000000003",
          filename: `${id}.pdf`,
          fileType: "pdf",
        },
        version: {
          storagePath: `${id}.pdf`,
          pdfStoragePath: `${id}.pdf`,
          source: "upload",
          versionNumber: 1,
          displayName: `${id}.pdf`,
        },
      });
    }

    await expect(repository.addContextFile(targetId, contextId)).resolves.toMatchObject({
      created: true,
    });
    await expect(repository.addContextFile(targetId, contextId)).resolves.toMatchObject({
      created: false,
    });
  });

  it("finds source and PDF artifact references", async () => {
    const id = "00000000-0000-4000-8000-000000000010";
    await repository.createWithInitialVersion({
      document: {
        id,
        userId: "00000000-0000-4000-8000-000000000011",
        filename: "contract.docx",
        fileType: "docx",
      },
      version: {
        storagePath: "documents/user/document/source.docx",
        pdfStoragePath: "converted-pdfs/user/document.pdf",
        source: "upload",
        versionNumber: 1,
        displayName: "contract.docx",
      },
    });

    await expect(
      repository.isArtifactPathReferenced("documents/user/document/source.docx"),
    ).resolves.toBe(true);
    await expect(
      repository.isArtifactPathReferenced("converted-pdfs/user/document.pdf"),
    ).resolves.toBe(true);
    await expect(repository.isArtifactPathReferenced("documents/unreferenced.pdf")).resolves.toBe(
      false,
    );
  });
});
