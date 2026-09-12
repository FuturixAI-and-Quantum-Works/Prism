import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentArtifactWriter } from "../../src/modules/documents/documents.artifacts.js";
import { DocumentsRepository } from "../../src/modules/documents/documents.repository.js";
import {
  type DocumentConversionPort,
  DocumentsService,
} from "../../src/modules/documents/documents.service.js";

const storage = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));
const sideEffects = vi.hoisted(() => ({
  activity: vi.fn(async () => undefined),
  membership: vi.fn(async () => undefined),
  index: vi.fn(async () => undefined),
}));

vi.mock("../../src/lib/storage.js", async (load) => {
  const actual = await load<typeof import("../../src/lib/storage.js")>();
  return { ...actual, ...storage };
});
vi.mock("../../src/modules/documents/documents.metadata.js", () => ({
  extractDocumentMetadata: vi.fn(async () => ({ pageCount: 1, structureTree: null })),
}));
vi.mock("../../src/modules/documents/documents.permissions.service.js", () => ({
  assertDocumentActionAllowed: vi.fn(async () => undefined),
  ensureDrafterMembership: sideEffects.membership,
}));
vi.mock("../../src/modules/documents/documents.activity.service.js", () => ({
  recordDocumentActivity: sideEffects.activity,
}));
vi.mock("../../src/modules/retrieval/retrieval.indexing.js", () => ({
  checksumBuffer: vi.fn(() => "checksum"),
  queueDocumentVersionIndex: sideEffects.index,
}));

const userId = "00000000-0000-4000-8000-000000000001";
const documentId = "00000000-0000-4000-8000-000000000002";
const converter: DocumentConversionPort = {
  capabilities: {
    conversions: ["doc-to-pdf", "docx-to-pdf", "html-to-pdf"],
    maxInputBytes: 1_024,
    maxOutputBytes: 1_024,
    adapters: [],
  },
  convert: vi.fn(async () => Buffer.from("pdf")),
};
const request = {
  kind: "initial",
  userId,
  documentId,
  filename: "contract.docx",
  fileType: "docx",
  content: Buffer.from("docx"),
  generated: false,
  pdfRenditionPolicy: "best-effort",
} as const;
const document = {
  id: documentId,
  projectId: null,
  workspaceId: null,
  userId,
  folderId: null,
  filename: "contract.pdf",
  fileType: "pdf",
  sizeBytes: 3,
  pageCount: 1,
  structureTree: null,
  status: "ready",
  lifecycleStatus: "DRAFT" as const,
  currentVersionId: "00000000-0000-4000-8000-000000000003",
  attached: false,
  isPrimary: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("DocumentArtifactWriter cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.uploadFile.mockResolvedValue(undefined);
    storage.deleteFile.mockResolvedValue(undefined);
    sideEffects.activity.mockResolvedValue(undefined);
    sideEffects.membership.mockResolvedValue(undefined);
    sideEffects.index.mockResolvedValue(undefined);
  });

  it("immediately deletes every attempted path after a pre-commit upload failure", async () => {
    const writeError = new Error("write acknowledgement failed");
    storage.uploadFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(writeError);
    const schedule = vi.fn(async () => undefined);
    const writer = new DocumentArtifactWriter(converter, schedule);

    const result = writer.write(request, vi.fn());

    await expect(result).rejects.toBe(writeError);
    expect(storage.deleteFile.mock.calls.map(([path]) => path)).toEqual(
      storage.uploadFile.mock.calls.map(([path]) => path),
    );
    expect(schedule).not.toHaveBeenCalled();
  });

  it("enqueues only failed immediate deletes and preserves the write error", async () => {
    const writeError = new Error("upload failed");
    const deleteError = new Error("delete failed");
    storage.uploadFile.mockRejectedValueOnce(writeError);
    storage.deleteFile.mockRejectedValueOnce(deleteError);
    const schedule = vi.fn(async () => undefined);
    const writer = new DocumentArtifactWriter(converter, schedule);

    const result = writer.write(request, vi.fn());

    await expect(result).rejects.toBe(writeError);
    expect(schedule).toHaveBeenCalledWith({
      operationId: expect.any(String),
      documentId,
      paths: [storage.uploadFile.mock.calls[0]?.[0]],
      delayMs: 0,
    });
  });

  it("queues every attempted path after persistence rejection without inline deletion", async () => {
    const persistenceError = new Error("commit state unknown");
    const schedule = vi.fn(async () => undefined);
    const writer = new DocumentArtifactWriter(converter, schedule);

    const result = writer.write(request, async () => {
      throw persistenceError;
    });

    await expect(result).rejects.toBe(persistenceError);
    expect(storage.deleteFile).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith({
      operationId: expect.any(String),
      documentId,
      paths: storage.uploadFile.mock.calls.map(([path]) => path),
      delayMs: 5_000,
    });
  });

  it("preserves cleanup failures in a typed aggregate when scheduling also fails", async () => {
    const writeError = new Error("upload failed");
    const deleteError = new Error("delete failed");
    const schedulingError = new Error("queue failed");
    storage.uploadFile.mockRejectedValueOnce(writeError);
    storage.deleteFile.mockRejectedValueOnce(deleteError);
    const writer = new DocumentArtifactWriter(
      converter,
      vi.fn(async () => {
        throw schedulingError;
      }),
    );

    const error = await writer.write(request, vi.fn()).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      name: "DocumentArtifactCleanupError",
      originalError: writeError,
      deleteFailures: [
        {
          path: storage.uploadFile.mock.calls[0]?.[0],
          error: deleteError,
        },
      ],
      schedulingError,
    });
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([writeError, deleteError, schedulingError]);
  });

  it.each([
    ["activity", sideEffects.activity],
    ["membership", sideEffects.membership],
    ["index", sideEffects.index],
  ])("does not compensate committed bytes when %s recording fails", async (_name, failure) => {
    const repository = new DocumentsRepository();
    vi.spyOn(repository, "createWithInitialVersion").mockResolvedValue(document);
    const schedule = vi.fn(async () => undefined);
    const service = new DocumentsService(
      repository,
      converter,
      new DocumentArtifactWriter(converter, schedule),
    );
    const sideEffectError = new Error("post-commit side effect failed");
    failure.mockRejectedValueOnce(sideEffectError);

    const result = service.upload({
      userId,
      userEmail: "owner@example.com",
      filename: "contract.pdf",
      buffer: Buffer.from("pdf"),
    });

    await expect(result).rejects.toBe(sideEffectError);
    expect(storage.deleteFile).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });
});
