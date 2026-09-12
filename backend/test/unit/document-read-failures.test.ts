import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolExecutionContext } from "../../src/modules/ai/tools/types.js";

const mocks = vi.hoisted(() => ({
  decodeDocumentContent: vi.fn(),
  downloadFile: vi.fn(),
  extractDocxBodyText: vi.fn(),
  loadActiveVersion: vi.fn(),
}));

vi.mock("../../src/lib/storage.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/storage.js")>()),
  downloadFile: mocks.downloadFile,
}));

vi.mock("../../src/lib/documentVersions.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/documentVersions.js")>()),
  loadActiveVersion: mocks.loadActiveVersion,
}));

vi.mock("../../src/lib/docxTrackedChangesXml.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/docxTrackedChangesXml.js")>()),
  extractDocxBodyText: mocks.extractDocxBodyText,
}));

vi.mock("../../src/modules/content/documentContent.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/modules/content/documentContent.js")>()),
  decodeDocumentContent: mocks.decodeDocumentContent,
}));

import {
  DocumentReadError,
  readDocumentContent,
} from "../../src/modules/ai/tools/documentContent.js";
import {
  executeFindInDocument,
  executeReadDocument,
} from "../../src/modules/ai/tools/documentReadExecutors.js";
import { createToolRegistry, defineTool } from "../../src/modules/ai/tools/registry.js";
import { createToolExecutionEvents } from "../../src/modules/ai/tools/types.js";

function documentStore() {
  return new Map([
    [
      "doc-1",
      {
        storage_path: "documents/agreement.txt",
        file_type: "text",
        filename: "Agreement.txt",
      },
    ],
  ]);
}

function context(): ToolExecutionContext {
  return {
    callId: "call-1",
    user: { id: "user-1", email: "user@example.com" },
    scope: { kind: "personal" },
    chatId: null,
    write: vi.fn(),
    signal: new AbortController().signal,
    documentCreator: {
      createBlank: vi.fn(),
      createFromBuffer: vi.fn(),
    },
    documents: {
      store: documentStore(),
      index: {
        "doc-1": {
          document_id: "document-1",
          filename: "Agreement.txt",
        },
      },
      turnEdits: new Map(),
    },
    workflows: new Map(),
    tabular: { columns: [], documents: [], cells: new Map() },
    events: createToolExecutionEvents(),
  };
}

describe("document read failures", () => {
  beforeEach(() => {
    mocks.decodeDocumentContent.mockReset();
    mocks.downloadFile.mockReset();
    mocks.extractDocxBodyText.mockReset();
    mocks.loadActiveVersion.mockReset();
    mocks.loadActiveVersion.mockResolvedValue(null);
  });

  it("emits an honest not-found event and throws", async () => {
    const write = vi.fn();

    await expect(
      readDocumentContent("missing", new Map(), write, {}),
    ).rejects.toMatchObject<DocumentReadError>({
      name: "DocumentReadError",
      reason: "not_found",
      docId: "missing",
    });
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith({
      type: "doc_read_failed",
      doc_id: "missing",
      reason: "not_found",
      error: "Document not found.",
    });
  });

  it("emits download failure without doc_read success", async () => {
    mocks.downloadFile.mockResolvedValue(null);
    const write = vi.fn();

    await expect(
      readDocumentContent("doc-1", documentStore(), write, {
        "doc-1": { document_id: "document-1", filename: "Agreement.txt" },
      }),
    ).rejects.toMatchObject<DocumentReadError>({
      reason: "download_failed",
      docId: "doc-1",
      filename: "Agreement.txt",
      documentId: "document-1",
    });
    expect(write.mock.calls.map(([event]) => event)).toEqual([
      {
        type: "doc_read_start",
        filename: "Agreement.txt",
        document_id: "document-1",
      },
      {
        type: "doc_read_failed",
        doc_id: "doc-1",
        filename: "Agreement.txt",
        document_id: "document-1",
        reason: "download_failed",
        error: "Document could not be read.",
      },
    ]);
  });

  it("does not fall back when the active version download fails", async () => {
    mocks.loadActiveVersion.mockResolvedValue({
      storage_path: "documents/active-version.txt",
    });
    mocks.downloadFile
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(Uint8Array.from([65]).buffer);

    await expect(
      readDocumentContent("doc-1", documentStore(), vi.fn(), {
        "doc-1": { document_id: "document-1", filename: "Agreement.txt" },
      }),
    ).rejects.toMatchObject<DocumentReadError>({ reason: "download_failed" });
    expect(mocks.downloadFile).toHaveBeenCalledOnce();
    expect(mocks.downloadFile).toHaveBeenCalledWith("documents/active-version.txt");
  });

  it("classifies decode exceptions and never emits doc_read", async () => {
    mocks.downloadFile.mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer);
    mocks.decodeDocumentContent.mockRejectedValue(new Error("decoder exploded"));
    const write = vi.fn();

    await expect(
      readDocumentContent("doc-1", documentStore(), write),
    ).rejects.toMatchObject<DocumentReadError>({ reason: "decode_failed" });
    expect(write.mock.calls.map(([event]) => event.type)).toEqual([
      "doc_read_start",
      "doc_read_failed",
    ]);
  });

  it("emits doc_read only after a completed decode", async () => {
    mocks.downloadFile.mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer);
    mocks.decodeDocumentContent.mockResolvedValue({ text: "Decoded agreement" });
    const write = vi.fn();

    await expect(readDocumentContent("doc-1", documentStore(), write)).resolves.toBe(
      "Decoded agreement",
    );
    expect(write.mock.calls.map(([event]) => event.type)).toEqual(["doc_read_start", "doc_read"]);
  });

  it("preserves cancellation without reporting a read failure", async () => {
    const controller = new AbortController();
    controller.abort();
    const write = vi.fn();

    await expect(
      readDocumentContent(
        "doc-1",
        documentStore(),
        write,
        {
          "doc-1": { document_id: "document-1", filename: "Agreement.txt" },
        },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: "DocumentContentError", code: "aborted" });
    expect(write.mock.calls.map(([event]) => event.type)).toEqual(["doc_read_start"]);
  });

  it("records failed activity and lets the registry emit an error result", async () => {
    mocks.downloadFile.mockResolvedValue(null);
    const toolContext = context();
    const registry = createToolRegistry([
      defineTool({
        name: "read_document",
        description: "Read a document",
        inputSchema: z.object({ doc_id: z.string() }),
        scopes: ["personal"],
        authorization: { kind: "unrestricted" },
        execute: executeReadDocument,
      }),
    ]);

    await registry.execute(toolContext, {
      id: "call-1",
      name: "read_document",
      input: { doc_id: "doc-1" },
    });

    expect(toolContext.events.docsRead).toEqual([]);
    expect(toolContext.events.docReadFailures).toEqual([
      {
        doc_id: "doc-1",
        filename: "Agreement.txt",
        document_id: "document-1",
        reason: "download_failed",
        error: "Document could not be read.",
      },
    ]);
    expect(toolContext.write).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "tool_result",
        tool: "read_document",
        status: "error",
      }),
    );
  });

  it("emits read failure without successful find activity", async () => {
    mocks.downloadFile.mockResolvedValue(null);
    const toolContext = context();

    await executeFindInDocument(toolContext, {
      doc_id: "doc-1",
      query: "termination",
    });

    expect(toolContext.events.docsFound).toEqual([]);
    expect(vi.mocked(toolContext.write).mock.calls.map(([event]) => event.type)).toEqual([
      "doc_find_start",
      "doc_read_failed",
    ]);
    expect(JSON.parse(toolContext.events.toolResults[0].content)).toMatchObject({
      ok: false,
      error: "Document could not be read.",
    });
  });
});
