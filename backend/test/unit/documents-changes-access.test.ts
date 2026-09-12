import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DocumentPermissionError,
  assertDocumentActionAllowed,
} from "../../src/modules/documents/documents.permissions.service.js";
import { DocumentChangesService } from "../../src/modules/documents/documents.changes.service.js";
import { DocumentsRepository } from "../../src/modules/documents/documents.repository.js";

const changeRequests = vi.hoisted(() => ({
  approveChangeRequest: vi.fn(
    async (input: { requestId: string; documentId: string; reviewedByUserId: string }) => {
      if (input.documentId !== "document-1") {
        throw new Error("Change request not found");
      }
      return {
        id: input.requestId,
        documentId: input.documentId,
        requestedByUserId: "requester-1",
        changeType: "edit",
        status: "approved",
        reviewedAt: new Date(),
        reviewNotes: null,
      };
    },
  ),
  createDocumentChangeRequest: vi.fn(),
  listPendingChangeRequests: vi.fn(async () => []),
  rejectChangeRequest: vi.fn(
    async (input: { requestId: string; documentId: string; reviewedByUserId: string }) => ({
      id: input.requestId,
      documentId: input.documentId,
      requestedByUserId: "requester-1",
      changeType: "edit",
      status: "rejected",
      reviewedAt: new Date(),
      reviewNotes: null,
    }),
  ),
}));
const permissions = vi.hoisted(() => ({
  assertDocumentActionAllowed: vi.fn(async () => undefined),
}));

vi.mock("../../src/lib/changeRequests.js", () => changeRequests);
vi.mock("../../src/modules/documents/documents.permissions.service.js", async (load) => {
  const actual =
    await load<typeof import("../../src/modules/documents/documents.permissions.service.js")>();
  return { ...actual, ...permissions };
});
vi.mock("../../src/modules/documents/documents.activity.service.js", () => ({
  recordDocumentActivity: vi.fn(async () => undefined),
}));

const actor = { userId: "owner-1", userEmail: "owner@example.com" };
const document = {
  id: "document-1",
  projectId: null,
  workspaceId: null,
  userId: actor.userId,
  folderId: null,
  filename: "contract.docx",
  fileType: "docx",
  sizeBytes: 1,
  pageCount: null,
  structureTree: null,
  status: "ready",
  lifecycleStatus: "DRAFT" as const,
  currentVersionId: null,
  attached: false,
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function service(): DocumentChangesService {
  const repository = new DocumentsRepository();
  vi.spyOn(repository, "findDocumentById").mockResolvedValue(document);
  return new DocumentChangesService(repository);
}

describe("DocumentChangesService access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses explicit owner actions for listing and reviewing change requests", async () => {
    const instance = service();

    await instance.listRequests(actor, document.id);
    await instance.reviewRequest(actor, document.id, "request-1", "approve");

    expect(assertDocumentActionAllowed).toHaveBeenNthCalledWith(
      1,
      document.id,
      actor.userId,
      actor.userEmail,
      "list_change_requests",
    );
    expect(assertDocumentActionAllowed).toHaveBeenNthCalledWith(
      2,
      document.id,
      actor.userId,
      actor.userEmail,
      "review_change_request",
    );
    expect(changeRequests.approveChangeRequest).toHaveBeenCalledWith({
      requestId: "request-1",
      documentId: document.id,
      reviewedByUserId: actor.userId,
      reviewNotes: undefined,
    });
  });

  it("cannot review a change request through a different document URL", async () => {
    const instance = service();
    const otherDocumentId = "document-2";

    await expect(
      instance.reviewRequest(actor, otherDocumentId, "request-1", "approve"),
    ).rejects.toThrow("Change request not found");
    expect(changeRequests.approveChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request-1",
        documentId: otherDocumentId,
      }),
    );
  });

  it("binds rejection transitions to the authorized document", async () => {
    await service().reviewRequest(actor, document.id, "request-1", "reject", "Not ready");

    expect(changeRequests.rejectChangeRequest).toHaveBeenCalledWith({
      requestId: "request-1",
      documentId: document.id,
      reviewedByUserId: actor.userId,
      reviewNotes: "Not ready",
    });
  });

  it("does not reveal or query change requests after a hidden-resource denial", async () => {
    permissions.assertDocumentActionAllowed.mockRejectedValueOnce(
      new DocumentPermissionError(404, "Document not found"),
    );

    await expect(service().listRequests(actor, document.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(changeRequests.listPendingChangeRequests).not.toHaveBeenCalled();
  });
});
