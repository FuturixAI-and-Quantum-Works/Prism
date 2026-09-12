import { accessAuthority } from "../access/access.composition.js";
import { DocumentActivityRepository } from "./documents.activity.repository.js";
import type { RequestUserContext } from "./documents.models.js";

type ActivityRows = Awaited<ReturnType<DocumentActivityRepository["list"]>>;
type EditDetailRows = Awaited<ReturnType<DocumentActivityRepository["listEditDetails"]>>;

type DocumentActivityStore = {
  record(input: Parameters<DocumentActivityRepository["record"]>[0]): Promise<void>;
  list(documentId: string): PromiseLike<ActivityRows>;
  listEditDetails(editIds: readonly string[]): PromiseLike<EditDetailRows>;
};

function changeMetadata(
  deletedText: string | null,
  insertedText: string | null,
): Readonly<{
  kind: "addition" | "deletion" | "replacement" | "none";
  inserted_character_count: number;
  deleted_character_count: number;
}> {
  const insertedCharacterCount = insertedText?.length ?? 0;
  const deletedCharacterCount = deletedText?.length ?? 0;
  const kind =
    insertedCharacterCount > 0 && deletedCharacterCount > 0
      ? "replacement"
      : insertedCharacterCount > 0
        ? "addition"
        : deletedCharacterCount > 0
          ? "deletion"
          : "none";
  return {
    kind,
    inserted_character_count: insertedCharacterCount,
    deleted_character_count: deletedCharacterCount,
  };
}

export class DocumentActivityService {
  constructor(
    private readonly repository: DocumentActivityStore = new DocumentActivityRepository(),
  ) {}

  record(
    documentId: string,
    userId: string | null,
    action: string,
    target?: { type?: string; id?: string; name?: string },
    details?: Record<string, unknown>,
  ): Promise<void> {
    return this.repository.record({
      documentId,
      userId,
      action,
      targetType: target?.type ?? null,
      targetId: target?.id ?? null,
      targetName: target?.name ?? null,
      details: details ?? null,
    });
  }

  async list(actor: RequestUserContext, documentId: string) {
    const decision = await accessAuthority.decide({
      actor: { userId: actor.userId, email: actor.userEmail?.toLowerCase() ?? "" },
      resource: { kind: "document", id: documentId },
      action: "read_document",
    });
    if (!decision.allowed) {
      throw Object.assign(new Error("Document not found"), { statusCode: 404 });
    }
    const rows = await this.repository.list(documentId);
    const editIds = rows.flatMap((row) =>
      row.targetType === "edit" && row.targetId ? [row.targetId] : [],
    );
    const editDetails = new Map(
      (await this.repository.listEditDetails(editIds)).map((edit) => [
        edit.id,
        {
          deleted_text: edit.deletedText,
          inserted_text: edit.insertedText,
          context_before: edit.contextBefore,
          context_after: edit.contextAfter,
          reason: edit.reason,
          status: edit.status,
        },
      ]),
    );
    return rows.map((row) => {
      const edit = row.targetId ? editDetails.get(row.targetId) : undefined;
      return {
        id: row.id,
        document_id: row.documentId,
        user_id: row.userId,
        user_email: row.userEmail,
        user_name: row.userName,
        action: row.action,
        target_type: row.targetType,
        target_id: row.targetId,
        target_name: row.targetName,
        details: row.details,
        created_at: row.createdAt,
        edit_details: edit ?? null,
        change_metadata: edit ? changeMetadata(edit.deleted_text, edit.inserted_text) : null,
      };
    });
  }
}

export const documentActivityService = new DocumentActivityService();

export const recordDocumentActivity = documentActivityService.record.bind(documentActivityService);
