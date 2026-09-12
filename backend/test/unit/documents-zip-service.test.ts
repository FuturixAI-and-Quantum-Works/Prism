import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentArtifactWriter } from "../../src/modules/documents/documents.artifacts.js";
import {
  type DocumentVersionRecord,
  DocumentsRepository,
} from "../../src/modules/documents/documents.repository.js";
import {
  type DocumentConversionPort,
  DocumentsService,
} from "../../src/modules/documents/documents.service.js";

const storage = vi.hoisted(() => ({
  downloadFile: vi.fn(),
}));
const permissions = vi.hoisted(() => ({
  assertDocumentActionAllowed: vi.fn(async () => undefined),
}));

vi.mock("../../src/lib/storage.js", async (load) => {
  const actual = await load<typeof import("../../src/lib/storage.js")>();
  return { ...actual, downloadFile: storage.downloadFile };
});
vi.mock("../../src/modules/documents/documents.permissions.service.js", () => ({
  assertDocumentActionAllowed: permissions.assertDocumentActionAllowed,
  ensureDrafterMembership: vi.fn(async () => undefined),
}));
vi.mock("../../src/modules/documents/documents.activity.service.js", () => ({
  recordDocumentActivity: vi.fn(async () => undefined),
}));
vi.mock("../../src/modules/retrieval/retrieval.indexing.js", () => ({
  checksumBuffer: vi.fn(() => "checksum"),
  queueDocumentVersionIndex: vi.fn(async () => undefined),
}));

const actor = {
  userId: "00000000-0000-4000-8000-000000000099",
  userEmail: "owner@example.com",
};
const ids = {
  missing: "00000000-0000-4000-8000-000000000001",
  inaccessible: "00000000-0000-4000-8000-000000000002",
  noVersion: "00000000-0000-4000-8000-000000000003",
  noBytes: "00000000-0000-4000-8000-000000000004",
  readFailed: "00000000-0000-4000-8000-000000000005",
  success: "00000000-0000-4000-8000-000000000006",
  duplicateName: "00000000-0000-4000-8000-000000000007",
  unsafeName: "00000000-0000-4000-8000-000000000008",
  reportName: "00000000-0000-4000-8000-000000000009",
} as const;

const converter: DocumentConversionPort = {
  capabilities: {
    conversions: ["doc-to-pdf", "docx-to-pdf", "html-to-pdf"],
    maxInputBytes: 1_024,
    maxOutputBytes: 1_024,
    adapters: [],
  },
  convert: vi.fn(async () => Buffer.from("converted")),
};

function document(id: string, filename = `${id}.pdf`) {
  return {
    id,
    projectId: null,
    workspaceId: null,
    userId: actor.userId,
    folderId: null,
    filename,
    fileType: filename.split(".").pop() ?? "pdf",
    sizeBytes: 3,
    pageCount: null,
    structureTree: null,
    status: "ready",
    lifecycleStatus: "DRAFT" as const,
    currentVersionId: `${id.slice(0, -1)}a`,
    attached: false,
    isPrimary: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function version(documentId: string, storagePath = `documents/${documentId}/source.pdf`) {
  return {
    id: `${documentId.slice(0, -1)}a`,
    documentId,
    storagePath,
    pdfStoragePath: null,
    source: "upload",
    versionNumber: 1,
    displayName: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  } satisfies DocumentVersionRecord;
}

function service(repository: DocumentsRepository): DocumentsService {
  return new DocumentsService(
    repository,
    converter,
    new DocumentArtifactWriter(
      converter,
      vi.fn(async () => undefined),
    ),
  );
}

async function reportFrom(bytes: Buffer) {
  const archive = await JSZip.loadAsync(bytes);
  const report = archive.file("download-report.json");
  if (!report) throw new Error("Expected download report");
  return {
    archive,
    report: JSON.parse(await report.async("string")) as unknown,
  };
}

describe("DocumentsService.downloadZip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.assertDocumentActionAllowed.mockResolvedValue(undefined);
  });

  it("returns ordered safe partial outcomes for every failure class", async () => {
    const requested = [
      ids.missing,
      ids.inaccessible,
      ids.noVersion,
      ids.noBytes,
      ids.readFailed,
      ids.success,
    ];
    const repository = new DocumentsRepository();
    vi.spyOn(repository, "findDocumentById").mockImplementation(async (id) =>
      id === ids.missing ? null : document(id, id === ids.success ? "contract.pdf" : undefined),
    );
    permissions.assertDocumentActionAllowed.mockImplementation(async (id) => {
      if (id === ids.inaccessible) {
        throw Object.assign(new Error("secret permission detail"), { statusCode: 403 });
      }
    });
    vi.spyOn(repository, "findActiveVersion").mockImplementation(async (id) =>
      id === ids.noVersion ? null : version(id),
    );
    storage.downloadFile.mockImplementation(async (path: string) => {
      if (path.includes(ids.noBytes)) return null;
      if (path.includes(ids.readFailed)) throw new Error(`/private/${ids.readFailed}`);
      return Buffer.from("success");
    });

    const result = await service(repository).downloadZip(actor, {
      documentIds: requested,
      mode: "partial",
    });
    const { archive, report } = await reportFrom(result.bytes);

    expect(result.failures).toEqual([
      { requestIndex: 0, documentId: ids.missing, reason: "unavailable" },
      { requestIndex: 1, documentId: ids.inaccessible, reason: "unavailable" },
      { requestIndex: 2, documentId: ids.noVersion, reason: "no-active-version" },
      { requestIndex: 3, documentId: ids.noBytes, reason: "content-unavailable" },
      { requestIndex: 4, documentId: ids.readFailed, reason: "read-failed" },
    ]);
    expect(report).toEqual({
      schema_version: 1,
      mode: "partial",
      outcomes: [
        {
          request_index: 0,
          document_id: ids.missing,
          status: "failed",
          reason: "unavailable",
        },
        {
          request_index: 1,
          document_id: ids.inaccessible,
          status: "failed",
          reason: "unavailable",
        },
        {
          request_index: 2,
          document_id: ids.noVersion,
          status: "failed",
          reason: "no-active-version",
        },
        {
          request_index: 3,
          document_id: ids.noBytes,
          status: "failed",
          reason: "content-unavailable",
        },
        {
          request_index: 4,
          document_id: ids.readFailed,
          status: "failed",
          reason: "read-failed",
        },
        {
          request_index: 5,
          document_id: ids.success,
          status: "included",
          filename: "contract.pdf",
        },
      ],
    });
    expect(Object.keys(archive.files).sort()).toEqual(["contract.pdf", "download-report.json"]);
    expect(JSON.stringify(report)).not.toContain("secret permission detail");
    expect(JSON.stringify(report)).not.toContain("/private/");
    expect(permissions.assertDocumentActionAllowed).toHaveBeenCalledWith(
      ids.success,
      actor.userId,
      actor.userEmail,
      "export_document",
    );
  });

  it("returns a report-only archive when every partial occurrence fails", async () => {
    const repository = new DocumentsRepository();
    vi.spyOn(repository, "findDocumentById").mockResolvedValue(null);

    const result = await service(repository).downloadZip(actor, {
      documentIds: [ids.missing, ids.missing],
      mode: "partial",
    });
    const { archive, report } = await reportFrom(result.bytes);

    expect(Object.keys(archive.files)).toEqual(["download-report.json"]);
    expect(result.failures).toHaveLength(2);
    expect(report).toMatchObject({
      outcomes: [
        { request_index: 0, document_id: ids.missing, reason: "unavailable" },
        { request_index: 1, document_id: ids.missing, reason: "unavailable" },
      ],
    });
  });

  it("resolves every atomic occurrence before throwing ordered failures", async () => {
    const requested = [ids.missing, ids.noVersion, ids.readFailed];
    const repository = new DocumentsRepository();
    const findDocument = vi
      .spyOn(repository, "findDocumentById")
      .mockImplementation(async (id) => (id === ids.missing ? null : document(id)));
    vi.spyOn(repository, "findActiveVersion").mockImplementation(async (id) =>
      id === ids.noVersion ? null : version(id),
    );
    storage.downloadFile.mockRejectedValue(new Error("storage path must stay private"));

    await expect(
      service(repository).downloadZip(actor, {
        documentIds: requested,
        mode: "atomic",
      }),
    ).rejects.toMatchObject({
      name: "DocumentZipAtomicError",
      statusCode: 422,
      message: "Document archive could not be created",
      failures: [
        { requestIndex: 0, documentId: ids.missing, reason: "unavailable" },
        { requestIndex: 1, documentId: ids.noVersion, reason: "no-active-version" },
        { requestIndex: 2, documentId: ids.readFailed, reason: "read-failed" },
      ],
    });
    expect(findDocument.mock.calls.map(([id]) => id)).toEqual(requested);
  });

  it("allocates deterministic unique names without overwriting duplicate occurrences", async () => {
    const requested = [ids.success, ids.success, ids.duplicateName, ids.unsafeName, ids.reportName];
    const names = new Map([
      [ids.success, "Report.PDF"],
      [ids.duplicateName, "report.pdf"],
      [ids.unsafeName, "folder\\unsafe/\u0001name.docx"],
      [ids.reportName, "download-report.json"],
    ]);
    const repository = new DocumentsRepository();
    vi.spyOn(repository, "findDocumentById").mockImplementation(async (id) =>
      document(id, names.get(id)),
    );
    vi.spyOn(repository, "findActiveVersion").mockImplementation(async (id) => version(id));
    storage.downloadFile.mockImplementation(async (path: string) => Buffer.from(path));
    const documents = service(repository);

    const first = await documents.downloadZip(actor, {
      documentIds: requested,
      mode: "partial",
    });
    const second = await documents.downloadZip(actor, {
      documentIds: requested,
      mode: "partial",
    });
    const { archive, report } = await reportFrom(first.bytes);
    const filenames = Object.keys(archive.files);

    expect(first.bytes).toEqual(second.bytes);
    expect(filenames).toEqual([
      "Report.PDF",
      "Report (2).PDF",
      "report (3).pdf",
      "folder_unsafe_name.docx",
      "download-report (2).json",
      "download-report.json",
    ]);
    expect(new Set(filenames).size).toBe(filenames.length);
    expect(report).toMatchObject({
      outcomes: [
        { request_index: 0, filename: "Report.PDF" },
        { request_index: 1, filename: "Report (2).PDF" },
        { request_index: 2, filename: "report (3).pdf" },
        { request_index: 3, filename: "folder_unsafe_name.docx" },
        { request_index: 4, filename: "download-report (2).json" },
      ],
    });
  });
});
