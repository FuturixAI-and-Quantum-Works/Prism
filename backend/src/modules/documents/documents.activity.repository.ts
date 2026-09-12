import { desc, eq, inArray } from "drizzle-orm";
import { db, documentActivity, documentEdits, users, type Database } from "../../db/index.js";

export class DocumentActivityRepository {
  constructor(private readonly database: Database = db) {}

  async record(input: {
    documentId: string;
    userId: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    targetName: string | null;
    details: Record<string, unknown> | null;
  }): Promise<void> {
    await this.database.insert(documentActivity).values(input);
  }

  list(documentId: string) {
    return this.database
      .select({
        id: documentActivity.id,
        documentId: documentActivity.documentId,
        userId: documentActivity.userId,
        action: documentActivity.action,
        targetType: documentActivity.targetType,
        targetId: documentActivity.targetId,
        targetName: documentActivity.targetName,
        details: documentActivity.details,
        createdAt: documentActivity.createdAt,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(documentActivity)
      .leftJoin(users, eq(documentActivity.userId, users.id))
      .where(eq(documentActivity.documentId, documentId))
      .orderBy(desc(documentActivity.createdAt));
  }

  listEditDetails(editIds: readonly string[]) {
    if (editIds.length === 0) return Promise.resolve([]);
    return this.database
      .select({
        id: documentEdits.id,
        deletedText: documentEdits.deletedText,
        insertedText: documentEdits.insertedText,
        contextBefore: documentEdits.contextBefore,
        contextAfter: documentEdits.contextAfter,
        reason: documentEdits.reason,
        status: documentEdits.status,
      })
      .from(documentEdits)
      .where(inArray(documentEdits.id, [...editIds]));
  }
}
