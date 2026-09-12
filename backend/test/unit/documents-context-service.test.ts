import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentContextService } from "../../src/modules/documents/documents.context.service.js";
import { DocumentsRepository } from "../../src/modules/documents/documents.repository.js";

const access = vi.hoisted(() => {
  class DocumentPermissionError extends Error {}
  return {
    assertDocumentActionAllowed: vi.fn(),
    DocumentPermissionError,
  };
});

vi.mock("../../src/modules/documents/documents.permissions.service.js", () => ({
  assertDocumentActionAllowed: access.assertDocumentActionAllowed,
  DocumentPermissionError: access.DocumentPermissionError,
}));

const actor = {
  userId: "00000000-0000-4000-8000-000000000001",
  userEmail: "reader@example.com",
};
const target = {
  id: "00000000-0000-4000-8000-000000000002",
  projectId: null,
  workspaceId: null,
  userId: actor.userId,
  folderId: null,
  filename: "target.docx",
  fileType: "docx",
  sizeBytes: 10,
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

describe("DocumentContextService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.assertDocumentActionAllowed.mockResolvedValue(undefined);
  });

  it("filters context documents the actor cannot still read", async () => {
    const repository = new DocumentsRepository();
    vi.spyOn(repository, "findDocumentById").mockResolvedValue(target);
    vi.spyOn(repository, "listContextFiles").mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000003",
        contextDocumentId: "00000000-0000-4000-8000-000000000004",
        createdAt: new Date(),
        filename: "secret.docx",
        fileType: "docx",
        userId: "00000000-0000-4000-8000-000000000005",
        projectId: null,
      },
    ]);
    access.assertDocumentActionAllowed
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new access.DocumentPermissionError("denied"));

    await expect(new DocumentContextService(repository).list(actor, target.id)).resolves.toEqual(
      [],
    );
  });

  it("checks read access to the source before attaching it", async () => {
    const repository = new DocumentsRepository();
    const source = {
      ...target,
      id: "00000000-0000-4000-8000-000000000004",
      userId: "00000000-0000-4000-8000-000000000005",
    };
    vi.spyOn(repository, "findDocumentById")
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(source);
    const add = vi.spyOn(repository, "addContextFile");
    access.assertDocumentActionAllowed
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new access.DocumentPermissionError("denied"));

    await expect(
      new DocumentContextService(repository).add(actor, target.id, source.id),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(add).not.toHaveBeenCalled();
  });
});
