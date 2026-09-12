import { eq } from "drizzle-orm";
import { db, documents, type Database } from "../../db/index.js";

export type RulebookSampleDocument = Readonly<{
  id: string;
  filename: string;
  fileType: string | null;
}>;

export interface RulebookRepository {
  findSampleDocument(documentId: string): Promise<RulebookSampleDocument | null>;
}

export class DrizzleRulebookRepository implements RulebookRepository {
  constructor(private readonly database: Database = db) {}

  async findSampleDocument(documentId: string): Promise<RulebookSampleDocument | null> {
    const [document] = await this.database
      .select({
        id: documents.id,
        filename: documents.filename,
        fileType: documents.fileType,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return document ?? null;
  }
}
