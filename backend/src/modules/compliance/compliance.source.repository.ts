import { asc, eq, inArray } from "drizzle-orm";
import { documents, driveFiles, workspaces, type Database } from "../../db/index.js";
import type {
  ComplianceReviewRepository,
  ComplianceSourceRepository,
} from "./compliance.repository.js";

export function createComplianceSourceRepository(
  database: Database,
  reviews: Pick<ComplianceReviewRepository, "getDetails">,
): ComplianceSourceRepository {
  const repository: ComplianceSourceRepository = {
    async findDocuments(ids) {
      if (ids.length === 0) return [];
      return database
        .select({
          id: documents.id,
          userId: documents.userId,
          projectId: documents.projectId,
          workspaceId: documents.workspaceId,
          filename: documents.filename,
          fileType: documents.fileType,
        })
        .from(documents)
        .where(inArray(documents.id, [...ids]));
    },

    async getWorkspaceName(workspaceId) {
      const [workspace] = await database
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      return workspace?.name ?? null;
    },

    async workspaceHasContent(workspaceId) {
      const [file, document] = await Promise.all([
        database
          .select({ id: driveFiles.id })
          .from(driveFiles)
          .where(eq(driveFiles.workspaceId, workspaceId))
          .limit(1),
        database
          .select({ id: documents.id })
          .from(documents)
          .where(eq(documents.workspaceId, workspaceId))
          .limit(1),
      ]);
      return Boolean(file[0] || document[0]);
    },

    async loadRunInput(review) {
      const details = await reviews.getDetails(review);
      if (!review.workspaceId) {
        return { ...details, workspaceFiles: [], workspaceDocuments: [] };
      }
      const [workspaceFiles, workspaceDocuments] = await Promise.all([
        database
          .select({
            id: driveFiles.id,
            filename: driveFiles.name,
            extension: driveFiles.extension,
            storagePath: driveFiles.storagePath,
          })
          .from(driveFiles)
          .where(eq(driveFiles.workspaceId, review.workspaceId))
          .orderBy(asc(driveFiles.createdAt)),
        repository.findDocuments(
          (
            await database
              .select({ id: documents.id })
              .from(documents)
              .where(eq(documents.workspaceId, review.workspaceId))
              .orderBy(asc(documents.createdAt))
          ).map(({ id }) => id),
        ),
      ]);
      return { ...details, workspaceFiles, workspaceDocuments };
    },
  };

  return repository;
}
