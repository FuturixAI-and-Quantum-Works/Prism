import { and, eq, desc } from "drizzle-orm";
import { db, documentChangeRequests, documents, users } from "../db/index.js";
import {
  createDocumentChangeRequestAttentionItem,
  resolveAttentionItemsBySource,
} from "./attention.js";

export class ChangeRequestError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ChangeRequestError";
  }
}

export async function createDocumentChangeRequest(input: {
  documentId: string;
  requestedByUserId: string;
  versionId?: string | null;
  changeType: string;
  changeSummary?: string;
  changeDetails?: Record<string, unknown>;
}): Promise<typeof documentChangeRequests.$inferSelect> {
  const [document] = await db
    .select({ id: documents.id, filename: documents.filename, userId: documents.userId })
    .from(documents)
    .where(eq(documents.id, input.documentId))
    .limit(1);

  if (!document) {
    throw new ChangeRequestError(404, "Document not found");
  }

  const [requester] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, input.requestedByUserId))
    .limit(1);

  const requesterName = requester?.fullName || requester?.email || "Unknown user";

  const [request] = await db
    .insert(documentChangeRequests)
    .values({
      documentId: input.documentId,
      requestedByUserId: input.requestedByUserId,
      versionId: input.versionId ?? null,
      changeType: input.changeType,
      changeSummary: input.changeSummary ?? null,
      changeDetails: input.changeDetails ?? null,
    })
    .returning();

  const uniqueAdminIds = [document.userId].filter((id) => id !== input.requestedByUserId);

  await Promise.all(
    uniqueAdminIds.map((adminUserId) =>
      createDocumentChangeRequestAttentionItem({
        userId: adminUserId,
        changeRequestId: request.id,
        documentId: document.id,
        documentName: document.filename,
        requesterName,
        changeType: input.changeType,
        changeSummary: input.changeSummary,
      }),
    ),
  );

  return request;
}

export async function approveChangeRequest(input: {
  requestId: string;
  documentId: string;
  reviewedByUserId: string;
  reviewNotes?: string;
}): Promise<typeof documentChangeRequests.$inferSelect> {
  const [request] = await db
    .select()
    .from(documentChangeRequests)
    .where(
      and(
        eq(documentChangeRequests.id, input.requestId),
        eq(documentChangeRequests.documentId, input.documentId),
      ),
    )
    .limit(1);

  if (!request) {
    throw new ChangeRequestError(404, "Change request not found");
  }

  if (request.status !== "pending") {
    throw new ChangeRequestError(400, "Change request has already been processed");
  }

  const [updated] = await db
    .update(documentChangeRequests)
    .set({
      status: "approved",
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentChangeRequests.id, input.requestId),
        eq(documentChangeRequests.documentId, input.documentId),
        eq(documentChangeRequests.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new ChangeRequestError(400, "Change request has already been processed");
  }

  await resolveAttentionItemsBySource("document_change_request", input.requestId);

  return updated;
}

export async function rejectChangeRequest(input: {
  requestId: string;
  documentId: string;
  reviewedByUserId: string;
  reviewNotes?: string;
}): Promise<typeof documentChangeRequests.$inferSelect> {
  const [request] = await db
    .select()
    .from(documentChangeRequests)
    .where(
      and(
        eq(documentChangeRequests.id, input.requestId),
        eq(documentChangeRequests.documentId, input.documentId),
      ),
    )
    .limit(1);

  if (!request) {
    throw new ChangeRequestError(404, "Change request not found");
  }

  if (request.status !== "pending") {
    throw new ChangeRequestError(400, "Change request has already been processed");
  }

  const [updated] = await db
    .update(documentChangeRequests)
    .set({
      status: "rejected",
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentChangeRequests.id, input.requestId),
        eq(documentChangeRequests.documentId, input.documentId),
        eq(documentChangeRequests.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new ChangeRequestError(400, "Change request has already been processed");
  }

  await resolveAttentionItemsBySource("document_change_request", input.requestId);

  return updated;
}

export async function listPendingChangeRequests(documentId: string) {
  return db
    .select({
      id: documentChangeRequests.id,
      documentId: documentChangeRequests.documentId,
      requestedByUserId: documentChangeRequests.requestedByUserId,
      versionId: documentChangeRequests.versionId,
      changeType: documentChangeRequests.changeType,
      changeSummary: documentChangeRequests.changeSummary,
      changeDetails: documentChangeRequests.changeDetails,
      status: documentChangeRequests.status,
      createdAt: documentChangeRequests.createdAt,
      requesterEmail: users.email,
      requesterName: users.fullName,
    })
    .from(documentChangeRequests)
    .innerJoin(users, eq(documentChangeRequests.requestedByUserId, users.id))
    .where(
      and(
        eq(documentChangeRequests.documentId, documentId),
        eq(documentChangeRequests.status, "pending"),
      ),
    )
    .orderBy(desc(documentChangeRequests.createdAt));
}
