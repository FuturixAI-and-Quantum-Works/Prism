import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  documentContextFiles,
  documentEdits,
  documentVersions,
  documents,
  projectSubfolders,
  type Database,
} from "../../db/index.js";

export type DocumentRecord = typeof documents.$inferSelect;
export type DocumentVersionRecord = typeof documentVersions.$inferSelect;
export type NewDocumentRecord = typeof documents.$inferInsert;

export type InitialDocumentWrite = Readonly<{
  document: NewDocumentRecord & { id: string };
  version: Omit<typeof documentVersions.$inferInsert, "documentId">;
}>;

export type AppendVersionWrite = Readonly<{
  documentId: string;
  storagePath: string;
  pdfStoragePath: string | null;
  source: string;
  displayName: string | null;
  filename?: string;
  sizeBytes: number;
}>;

export class DocumentsRepository {
  constructor(private readonly database: Database = db) {}

  async findDocumentById(documentId: string): Promise<DocumentRecord | null> {
    const [doc] = await this.database
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return doc ?? null;
  }

  async findProjectFolder(projectId: string, folderId: string) {
    const [folder] = await this.database
      .select({
        id: projectSubfolders.id,
        projectId: projectSubfolders.projectId,
        parentFolderId: projectSubfolders.parentFolderId,
      })
      .from(projectSubfolders)
      .where(and(eq(projectSubfolders.id, folderId), eq(projectSubfolders.projectId, projectId)))
      .limit(1);
    return folder ?? null;
  }

  listProjectDocuments(projectId: string): Promise<DocumentRecord[]> {
    return this.database
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.attached, false)))
      .orderBy(asc(documents.createdAt));
  }

  listWorkspaceDocuments(workspaceId: string): Promise<DocumentRecord[]> {
    return this.database
      .select()
      .from(documents)
      .where(and(eq(documents.workspaceId, workspaceId), eq(documents.attached, false)))
      .orderBy(asc(documents.createdAt));
  }

  listAccessibleDocuments(documentIds: readonly string[]): Promise<DocumentRecord[]> {
    if (documentIds.length === 0) return Promise.resolve([]);
    return this.database
      .select()
      .from(documents)
      .where(and(inArray(documents.id, [...documentIds]), eq(documents.attached, false)))
      .orderBy(desc(documents.createdAt));
  }

  async createWithInitialVersion(input: InitialDocumentWrite): Promise<DocumentRecord> {
    return this.database.transaction(async (tx) => {
      const [document] = await tx.insert(documents).values(input.document).returning();
      if (!document) throw new Error("Failed to create document record");
      const [version] = await tx
        .insert(documentVersions)
        .values({ ...input.version, documentId: document.id })
        .returning({ id: documentVersions.id });
      if (!version) throw new Error("Failed to create document version");
      const [ready] = await tx
        .update(documents)
        .set({
          currentVersionId: version.id,
          status: "ready",
          updatedAt: new Date(),
        })
        .where(eq(documents.id, document.id))
        .returning();
      if (!ready) throw new Error("Failed to finalize document");
      return ready;
    });
  }

  async updateDocument(
    documentId: string,
    updates: Partial<typeof documents.$inferInsert>,
  ): Promise<DocumentRecord | null> {
    const [updated] = await this.database
      .update(documents)
      .set(updates)
      .where(eq(documents.id, documentId))
      .returning();
    return updated ?? null;
  }

  async listVersions(documentId: string): Promise<DocumentVersionRecord[]> {
    return this.database
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(documentVersions.createdAt);
  }

  async findActiveVersion(
    documentId: string,
    versionId?: string | null,
  ): Promise<DocumentVersionRecord | null> {
    if (versionId) {
      const [version] = await this.database
        .select()
        .from(documentVersions)
        .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
        .limit(1);
      return version ?? null;
    }
    const [document] = await this.database
      .select({ currentVersionId: documents.currentVersionId })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!document?.currentVersionId) return null;
    const [version] = await this.database
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.id, document.currentVersionId))
      .limit(1);
    return version ?? null;
  }

  async isArtifactPathReferenced(path: string): Promise<boolean> {
    const [version] = await this.database
      .select({ id: documentVersions.id })
      .from(documentVersions)
      .where(or(eq(documentVersions.storagePath, path), eq(documentVersions.pdfStoragePath, path)))
      .limit(1);
    return Boolean(version);
  }

  async appendVersion(input: AppendVersionWrite): Promise<DocumentVersionRecord> {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`);
      const [latest] = await tx
        .select({ versionNumber: documentVersions.versionNumber })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, input.documentId))
        .orderBy(desc(documentVersions.versionNumber))
        .limit(1);
      const [version] = await tx
        .insert(documentVersions)
        .values({
          documentId: input.documentId,
          storagePath: input.storagePath,
          pdfStoragePath: input.pdfStoragePath,
          source: input.source,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          displayName: input.displayName,
        })
        .returning();
      if (!version) throw new Error("Failed to record document version");
      const [updated] = await tx
        .update(documents)
        .set({
          currentVersionId: version.id,
          filename: input.filename,
          sizeBytes: input.sizeBytes,
          status: "ready",
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))
        .returning({ id: documents.id });
      if (!updated) throw new Error("Document not found");
      return version;
    });
  }

  async renameVersion(
    documentId: string,
    versionId: string,
    displayName: string | null,
  ): Promise<DocumentVersionRecord | null> {
    const [version] = await this.database
      .update(documentVersions)
      .set({ displayName })
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
      .returning();
    return version ?? null;
  }

  async deleteDocument(documentId: string): Promise<readonly string[] | null> {
    return this.database.transaction(async (tx) => {
      const [document] = await tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      if (!document) return null;
      const versions = await tx
        .select({
          storagePath: documentVersions.storagePath,
          pdfStoragePath: documentVersions.pdfStoragePath,
        })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));
      await tx.delete(documents).where(eq(documents.id, documentId));
      return [
        ...new Set(
          versions.flatMap(({ storagePath, pdfStoragePath }) =>
            [storagePath, pdfStoragePath].filter(
              (path): path is string => typeof path === "string" && path.length > 0,
            ),
          ),
        ),
      ];
    });
  }

  async listContextFiles(documentId: string) {
    return this.database
      .select({
        id: documentContextFiles.id,
        contextDocumentId: documentContextFiles.contextDocumentId,
        createdAt: documentContextFiles.createdAt,
        filename: documents.filename,
        fileType: documents.fileType,
      })
      .from(documentContextFiles)
      .innerJoin(documents, eq(documents.id, documentContextFiles.contextDocumentId))
      .where(eq(documentContextFiles.documentId, documentId));
  }

  async addContextFile(documentId: string, contextDocumentId: string) {
    return this.database.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(documentContextFiles)
        .where(
          and(
            eq(documentContextFiles.documentId, documentId),
            eq(documentContextFiles.contextDocumentId, contextDocumentId),
          ),
        )
        .limit(1);
      if (existing) return { created: false, row: existing } as const;
      const [row] = await tx
        .insert(documentContextFiles)
        .values({ documentId, contextDocumentId })
        .returning();
      if (!row) throw new Error("Failed to attach context document");
      return { created: true, row } as const;
    });
  }

  async removeContextFile(documentId: string, contextFileId: string): Promise<boolean> {
    const deleted = await this.database
      .delete(documentContextFiles)
      .where(
        and(
          eq(documentContextFiles.id, contextFileId),
          eq(documentContextFiles.documentId, documentId),
        ),
      )
      .returning({ id: documentContextFiles.id });
    return deleted.length > 0;
  }

  async findEdit(documentId: string, editId: string) {
    const [edit] = await this.database
      .select()
      .from(documentEdits)
      .where(and(eq(documentEdits.id, editId), eq(documentEdits.documentId, documentId)))
      .limit(1);
    return edit ?? null;
  }

  async resolveEdit(
    documentId: string,
    editId: string,
    status: "accepted" | "rejected",
  ): Promise<number> {
    return this.database.transaction(async (tx) => {
      const [updated] = await tx
        .update(documentEdits)
        .set({ status, resolvedAt: new Date() })
        .where(
          and(
            eq(documentEdits.id, editId),
            eq(documentEdits.documentId, documentId),
            eq(documentEdits.status, "pending"),
          ),
        )
        .returning({ id: documentEdits.id });
      if (!updated) {
        const [existing] = await tx
          .select({ id: documentEdits.id })
          .from(documentEdits)
          .where(and(eq(documentEdits.id, editId), eq(documentEdits.documentId, documentId)))
          .limit(1);
        if (!existing) throw new Error("Edit not found");
      }
      const [remaining] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(documentEdits)
        .where(and(eq(documentEdits.documentId, documentId), eq(documentEdits.status, "pending")));
      return remaining?.count ?? 0;
    });
  }
}
