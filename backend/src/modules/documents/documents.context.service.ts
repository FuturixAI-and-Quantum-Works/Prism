import {
  assertDocumentActionAllowed,
  DocumentPermissionError,
} from "./documents.permissions.service.js";
import type { RequestUserContext } from "./documents.models.js";
import { DocumentsRepository } from "./documents.repository.js";
import { DocumentServiceError } from "./documents.service.js";

export class DocumentContextService {
  constructor(readonly repository = new DocumentsRepository()) {}

  private async canRead(actor: RequestUserContext, documentId: string): Promise<boolean> {
    try {
      await assertDocumentActionAllowed(
        documentId,
        actor.userId,
        actor.userEmail ?? undefined,
        "read_document",
      );
      return true;
    } catch (error) {
      if (error instanceof DocumentPermissionError) return false;
      throw error;
    }
  }

  private async readableContextRows(actor: RequestUserContext, documentId: string) {
    const rows = await this.repository.listContextFiles(documentId);
    const readable = [];
    for (const row of rows) {
      if (await this.canRead(actor, row.contextDocumentId)) readable.push(row);
    }
    return readable;
  }

  private async requireTarget(
    actor: RequestUserContext,
    documentId: string,
    write: boolean,
  ): Promise<void> {
    const document = await this.repository.findDocumentById(documentId);
    if (!document) throw new DocumentServiceError(404, "Document not found");
    await assertDocumentActionAllowed(
      documentId,
      actor.userId,
      actor.userEmail ?? undefined,
      write ? "edit_document" : "read_document",
    );
  }

  async list(actor: RequestUserContext, documentId: string) {
    await this.requireTarget(actor, documentId, false);
    const readable = await this.readableContextRows(actor, documentId);
    return readable.map((row) => ({
      id: row.id,
      context_document_id: row.contextDocumentId,
      filename: row.filename,
      file_type: row.fileType,
      created_at: row.createdAt,
    }));
  }

  async add(actor: RequestUserContext, documentId: string, contextDocumentId: string) {
    if (documentId === contextDocumentId) {
      throw new DocumentServiceError(400, "A document cannot be its own context file");
    }
    await this.requireTarget(actor, documentId, true);
    const contextDocument = await this.repository.findDocumentById(contextDocumentId);
    if (!contextDocument || !(await this.canRead(actor, contextDocument.id))) {
      throw new DocumentServiceError(404, "Context document not found");
    }
    const result = await this.repository.addContextFile(documentId, contextDocumentId);
    return {
      status: result.created ? 201 : 200,
      body: {
        id: result.row.id,
        context_document_id: result.row.contextDocumentId,
        filename: contextDocument.filename,
        file_type: contextDocument.fileType,
        created_at: result.row.createdAt,
      },
    };
  }

  async remove(
    actor: RequestUserContext,
    documentId: string,
    contextFileId: string,
  ): Promise<void> {
    await this.requireTarget(actor, documentId, true);
    if (!(await this.repository.removeContextFile(documentId, contextFileId))) {
      throw new DocumentServiceError(404, "Context file not found");
    }
  }

  async readableRows(actor: RequestUserContext, documentId: string) {
    await this.requireTarget(actor, documentId, false);
    return this.readableContextRows(actor, documentId);
  }
}
