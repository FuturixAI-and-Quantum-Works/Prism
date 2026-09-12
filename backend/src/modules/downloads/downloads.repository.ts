import { eq } from "drizzle-orm";
import {
  db,
  documents,
  documentVersions,
  driveFiles,
  fileVersions,
  type Database,
} from "../../db/index.js";

export type StoredObjectOwner =
  | Readonly<{
      kind: "document";
      document: {
        id: string;
        user_id: string;
        project_id: string | null;
      };
    }>
  | Readonly<{
      kind: "drive-file";
      fileId: string;
    }>;

export interface DownloadsRepository {
  findOwner(storagePath: string): Promise<StoredObjectOwner | null>;
}

export class DrizzleDownloadsRepository implements DownloadsRepository {
  constructor(private readonly database: Database = db) {}

  async findOwner(storagePath: string): Promise<StoredObjectOwner | null> {
    const [version] = await this.database
      .select({ documentId: documentVersions.documentId })
      .from(documentVersions)
      .where(eq(documentVersions.storagePath, storagePath))
      .limit(1);
    if (version) {
      const [document] = await this.database
        .select({
          id: documents.id,
          user_id: documents.userId,
          project_id: documents.projectId,
        })
        .from(documents)
        .where(eq(documents.id, version.documentId))
        .limit(1);
      return document ? { kind: "document", document } : null;
    }

    const [currentFile] = await this.database
      .select({ id: driveFiles.id })
      .from(driveFiles)
      .where(eq(driveFiles.storagePath, storagePath))
      .limit(1);
    if (currentFile) return { kind: "drive-file", fileId: currentFile.id };

    const [storedVersion] = await this.database
      .select({ fileId: fileVersions.fileId })
      .from(fileVersions)
      .where(eq(fileVersions.storagePath, storagePath))
      .limit(1);
    return storedVersion ? { kind: "drive-file", fileId: storedVersion.fileId } : null;
  }
}
