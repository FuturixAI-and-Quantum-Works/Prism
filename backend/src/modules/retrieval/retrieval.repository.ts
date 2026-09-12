import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  db,
  documents,
  documentVersions,
  driveFiles,
  fileVersions,
  projects,
  ragCollections,
  ragSourceIndexEntries,
  workspaces,
  type Database,
} from "../../db/index.js";
import type {
  NormalizedRetrievalError,
  RetrievalIndexInput,
  RetrievalScope,
  RetrievalSourceStatus,
} from "./retrieval.types.js";

export class RetrievalRepository {
  constructor(private readonly database: Database = db) {}

  async findCollection(scope: RetrievalScope) {
    const [collection] = await this.database
      .select()
      .from(ragCollections)
      .where(and(eq(ragCollections.scopeType, scope.type), eq(ragCollections.scopeId, scope.id)))
      .limit(1);
    return collection ?? null;
  }

  async findCollectionSummary(scope: RetrievalScope) {
    const [collection] = await this.database
      .select({
        id: ragCollections.id,
        collectionName: ragCollections.collectionName,
        displayName: ragCollections.displayName,
      })
      .from(ragCollections)
      .where(and(eq(ragCollections.scopeType, scope.type), eq(ragCollections.scopeId, scope.id)))
      .limit(1);
    return collection ?? null;
  }

  async countIndexedSources(scope: RetrievalScope): Promise<number> {
    const [row] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(ragSourceIndexEntries)
      .where(
        and(
          eq(ragSourceIndexEntries.scopeType, scope.type),
          eq(ragSourceIndexEntries.scopeId, scope.id),
          eq(ragSourceIndexEntries.status, "indexed"),
        ),
      );
    return Number(row?.count ?? 0);
  }

  async upsertCollection(scope: RetrievalScope, collectionName: string) {
    const [collection] = await this.database
      .insert(ragCollections)
      .values({
        scopeType: scope.type,
        scopeId: scope.id,
        ownerUserId: scope.ownerUserId ?? null,
        collectionName,
        displayName: scope.name,
      })
      .onConflictDoUpdate({
        target: [ragCollections.scopeType, ragCollections.scopeId],
        set: { collectionName, displayName: scope.name, updatedAt: new Date() },
      })
      .returning();
    return collection;
  }

  async upsertSource(
    input: RetrievalIndexInput,
    collectionId: string | null,
    status: RetrievalSourceStatus,
    unsupportedReason: string | null,
  ) {
    const error = unsupportedReason
      ? {
          lastError: unsupportedReason,
          lastErrorCode: "unsupported_file_format",
          lastErrorCategory: "source_format",
          lastErrorDetails: { filename: input.filename, mime_type: input.mimeType },
        }
      : {
          lastError: null,
          lastErrorCode: null,
          lastErrorCategory: null,
          lastErrorDetails: null,
        };
    const values = {
      collectionId,
      scopeType: input.scope.type,
      scopeId: input.scope.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      versionId: input.versionId,
      userId: input.userId,
      projectId: input.projectId ?? null,
      workspaceId: input.workspaceId ?? null,
      filename: input.filename,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      checksum: input.checksum ?? null,
      status,
      ...error,
      retryable: false,
      retryAfterSeconds: null,
      indexedAt: null,
      updatedAt: new Date(),
    };
    const [entry] = await this.database
      .insert(ragSourceIndexEntries)
      .values(values)
      .onConflictDoUpdate({
        target: [
          ragSourceIndexEntries.sourceType,
          ragSourceIndexEntries.sourceId,
          ragSourceIndexEntries.versionId,
        ],
        set: values,
      })
      .returning();
    return entry;
  }

  async markIndexed(entryId: string, collectionId: string) {
    const [entry] = await this.database
      .update(ragSourceIndexEntries)
      .set({
        collectionId,
        status: "indexed",
        lastError: null,
        lastErrorCode: null,
        lastErrorCategory: null,
        lastErrorDetails: null,
        retryable: false,
        retryAfterSeconds: null,
        indexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ragSourceIndexEntries.id, entryId))
      .returning();
    return entry;
  }

  async markFailed(
    entryId: string,
    status: Extract<RetrievalSourceStatus, "failed" | "skipped_unsupported">,
    error: NormalizedRetrievalError,
  ) {
    const [entry] = await this.database
      .update(ragSourceIndexEntries)
      .set({
        status,
        lastError: error.summary,
        lastErrorCode: error.code,
        lastErrorCategory: error.category,
        lastErrorDetails: error.details,
        retryable: error.retryable,
        retryAfterSeconds: error.retryAfterSeconds,
        updatedAt: new Date(),
      })
      .where(eq(ragSourceIndexEntries.id, entryId))
      .returning();
    return entry;
  }

  findScopeEntriesByVersionIds(scope: RetrievalScope, versionIds: readonly string[]) {
    if (versionIds.length === 0) return Promise.resolve([]);
    return this.database
      .select()
      .from(ragSourceIndexEntries)
      .where(
        and(
          eq(ragSourceIndexEntries.scopeType, scope.type),
          eq(ragSourceIndexEntries.scopeId, scope.id),
          inArray(ragSourceIndexEntries.versionId, [...versionIds]),
        ),
      );
  }

  listAccessibleSources(
    userId: string,
    projectIds: readonly string[],
    workspaceIds: readonly string[],
  ) {
    const conditions = [
      and(
        eq(ragSourceIndexEntries.userId, userId),
        isNull(ragSourceIndexEntries.projectId),
        isNull(ragSourceIndexEntries.workspaceId),
      ),
      projectIds.length ? inArray(ragSourceIndexEntries.projectId, [...projectIds]) : undefined,
      workspaceIds.length
        ? inArray(ragSourceIndexEntries.workspaceId, [...workspaceIds])
        : undefined,
    ].filter((condition) => condition !== undefined);
    return this.database
      .select({
        entry: ragSourceIndexEntries,
        collectionName: ragCollections.collectionName,
        collectionDisplayName: ragCollections.displayName,
      })
      .from(ragSourceIndexEntries)
      .leftJoin(ragCollections, eq(ragSourceIndexEntries.collectionId, ragCollections.id))
      .where(or(...conditions))
      .orderBy(desc(ragSourceIndexEntries.updatedAt));
  }

  async findDocumentVersion(documentId: string, versionId: string) {
    const [row] = await this.database
      .select({
        id: documents.id,
        userId: documents.userId,
        projectId: documents.projectId,
        workspaceId: documents.workspaceId,
        filename: documents.filename,
        fileType: documents.fileType,
        storagePath: documentVersions.storagePath,
      })
      .from(documents)
      .innerJoin(documentVersions, eq(documentVersions.id, versionId))
      .where(eq(documents.id, documentId))
      .limit(1);
    return row ?? null;
  }

  async findDriveFileVersion(fileId: string, versionId: string) {
    const [row] = await this.database
      .select({
        id: driveFiles.id,
        userId: driveFiles.userId,
        workspaceId: driveFiles.workspaceId,
        name: driveFiles.name,
        mimeType: driveFiles.mimeType,
        storagePath: fileVersions.storagePath,
        checksum: fileVersions.checksum,
      })
      .from(driveFiles)
      .innerJoin(fileVersions, eq(fileVersions.id, versionId))
      .where(eq(driveFiles.id, fileId))
      .limit(1);
    return row ?? null;
  }

  listBackfillDocuments(
    projectIds: readonly string[],
    workspaceIds: readonly string[],
    userId: string,
  ) {
    const conditions = [
      and(eq(documents.userId, userId), isNull(documents.projectId), isNull(documents.workspaceId)),
      projectIds.length ? inArray(documents.projectId, [...projectIds]) : undefined,
      workspaceIds.length ? inArray(documents.workspaceId, [...workspaceIds]) : undefined,
    ].filter((condition) => condition !== undefined);
    return this.database
      .select({
        id: documents.id,
        userId: documents.userId,
        projectId: documents.projectId,
        workspaceId: documents.workspaceId,
        filename: documents.filename,
        fileType: documents.fileType,
        versionId: documentVersions.id,
        storagePath: documentVersions.storagePath,
      })
      .from(documents)
      .innerJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
      .where(or(...conditions));
  }

  listBackfillDriveFiles(workspaceIds: readonly string[], userId: string) {
    const conditions = [
      and(eq(driveFiles.userId, userId), isNull(driveFiles.workspaceId)),
      workspaceIds.length ? inArray(driveFiles.workspaceId, [...workspaceIds]) : undefined,
    ].filter((condition) => condition !== undefined);
    return this.database
      .select({
        id: driveFiles.id,
        userId: driveFiles.userId,
        workspaceId: driveFiles.workspaceId,
        name: driveFiles.name,
        mimeType: driveFiles.mimeType,
        versionId: fileVersions.id,
        storagePath: fileVersions.storagePath,
        checksum: fileVersions.checksum,
      })
      .from(driveFiles)
      .innerJoin(
        fileVersions,
        and(
          eq(fileVersions.fileId, driveFiles.id),
          eq(fileVersions.versionNumber, driveFiles.version),
        ),
      )
      .where(or(...conditions));
  }

  async findWorkspaceScope(workspaceId: string, fallbackOwnerId: string): Promise<RetrievalScope> {
    const [workspace] = await this.database
      .select({ name: workspaces.name, ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return {
      type: "workspace",
      id: workspaceId,
      name: workspace?.name ?? "workspace",
      ownerUserId: workspace?.ownerId ?? fallbackOwnerId,
    };
  }

  async findProjectScope(projectId: string, fallbackOwnerId: string): Promise<RetrievalScope> {
    const [project] = await this.database
      .select({ name: projects.name, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return {
      type: "project",
      id: projectId,
      name: project?.name ?? "project",
      ownerUserId: project?.userId ?? fallbackOwnerId,
    };
  }
}

export const retrievalRepository = new RetrievalRepository();
