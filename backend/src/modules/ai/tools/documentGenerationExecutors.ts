import { eq } from "drizzle-orm";
import { db, documents, documentVersions } from "../../../db/index.js";
import { buildDownloadUrl } from "../../../lib/downloadTokens.js";
import { loadActiveVersion } from "../../../lib/documentVersions.js";
import { convertedPdfKey, downloadFile, storageKey, uploadFile } from "../../../lib/storage.js";
import { resolveDocLabel } from "./documentContent.js";
import { generateDocx } from "./docxOperations.js";
import type { ToolExecutionContext } from "./types.js";

export async function executeGenerateDocx(
  context: ToolExecutionContext,
  input: {
    title: string;
    landscape?: boolean;
    sections: {
      heading?: string;
      level?: number;
      content?: string;
      pageBreak?: boolean;
      table?: { headers: string[]; rows: string[][] };
    }[];
  },
): Promise<void> {
  const { title, sections, landscape = false } = input;
  console.info("[generate_docx] started");
  const previewFilename = `${
    title
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .slice(0, 64) || "document"
  }.docx`;
  context.write({ type: "doc_created_start", filename: previewFilename });
  const result = await generateDocx(title, sections, context.user.id, {
    landscape,
    projectId:
      context.scope.kind === "project" || context.scope.kind === "tabular"
        ? context.scope.projectId
        : null,
  });
  let newDocLabel: string | null = null;
  if ("filename" in result) {
    const existingLabels = new Set(Object.keys(context.documents.index));
    let index = 0;
    while (existingLabels.has(`doc-${index}`)) index++;
    newDocLabel = `doc-${index}`;
    context.documents.index[newDocLabel] = {
      document_id: result.document_id,
      filename: result.filename,
    };
    context.documents.store.set(newDocLabel, {
      storage_path: result.storage_path,
      file_type: "docx",
      filename: result.filename,
    });
    context.write({
      type: "doc_created",
      filename: result.filename,
      download_url: result.download_url,
      document_id: result.document_id,
      version_id: result.version_id,
      version_number: result.version_number,
    });
    context.events.docsCreated.push({
      filename: result.filename,
      download_url: result.download_url,
      document_id: result.document_id,
      version_id: result.version_id,
      version_number: result.version_number,
    });
  } else {
    context.write({ type: "doc_created", filename: previewFilename, download_url: "" });
  }
  const safeToolResult =
    "filename" in result
      ? {
          filename: result.filename,
          document_id: result.document_id,
          version_id: result.version_id,
          version_number: result.version_number,
          message: result.message,
        }
      : result;
  const toolResultPayload = newDocLabel
    ? {
        ...safeToolResult,
        doc_id: newDocLabel,
        next_required_action: `Before writing your final response, call read_document with doc_id "${newDocLabel}". Describe and cite the generated document using doc_id "${newDocLabel}", not the source/template document.`,
      }
    : safeToolResult;
  context.events.toolResults.push({
    role: "tool",
    tool_call_id: context.callId,
    content: JSON.stringify(toolResultPayload),
  });
}

export async function executeReplicateDocument(
  context: ToolExecutionContext,
  input: { doc_id: string; count?: number; new_filename?: string },
): Promise<void> {
  const requestedFilename = input.new_filename?.trim() || null;
  const requestedCount = input.count ?? 1;
  const sourceLabel =
    resolveDocLabel(input.doc_id, context.documents.store, context.documents.index) ?? input.doc_id;
  const sourceInfo = context.documents.store.get(sourceLabel);
  const sourceIndexed = context.documents.index[sourceLabel];
  const sourceFilename = sourceInfo?.filename ?? input.doc_id;
  context.write({
    type: "doc_replicate_start",
    filename: sourceFilename,
    count: requestedCount,
  });
  const fail = (error: string) => {
    context.write({
      type: "doc_replicated",
      filename: sourceFilename,
      count: requestedCount,
      copies: [],
      error,
    });
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify({ ok: false, error }),
    });
  };
  if (!sourceInfo || !sourceIndexed) {
    fail(`Document '${input.doc_id}' not found in this project.`);
    return;
  }
  if (context.scope.kind !== "project") {
    fail("replicate_document is only available in project chats.");
    return;
  }

  const projectId = context.scope.projectId;
  try {
    const active = await loadActiveVersion(sourceIndexed.document_id);
    const sourcePath = active?.storage_path ?? sourceInfo.storage_path;
    const sourcePdfPath = active?.pdf_storage_path ?? null;
    const raw = await downloadFile(sourcePath);
    const pdfBytes = sourcePdfPath ? await downloadFile(sourcePdfPath) : null;
    if (!raw) {
      fail("Could not read the source document's bytes from storage.");
      return;
    }

    const extension = sourceInfo.filename.match(/\.[^./\\]+$/)?.[0] ?? "";
    const baseStem = requestedFilename
      ? requestedFilename.replace(/\.[^./\\]+$/, "")
      : sourceInfo.filename.replace(/\.[^./\\]+$/, "");
    const filenames = Array.from({ length: requestedCount }, (_, index) => {
      const suffix =
        requestedCount === 1 ? (requestedFilename ? "" : " (copy)") : ` (${index + 1})`;
      return `${baseStem}${suffix}${extension}`;
    });
    const documentRows = filenames.map((filename) => ({
      projectId,
      userId: context.user.id,
      filename,
      fileType: sourceInfo.file_type,
      sizeBytes: raw.byteLength,
      status: "ready" as const,
    }));
    let replicatedDocuments: { id: string; filename: string }[];
    try {
      replicatedDocuments = await db.insert(documents).values(documentRows).returning({
        id: documents.id,
        filename: documents.filename,
      });
    } catch (error) {
      fail(
        `Failed to record replicated documents: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      return;
    }
    if (replicatedDocuments.length === 0) {
      fail("No documents were inserted");
      return;
    }

    const contentType =
      sourceInfo.file_type === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const uploadJobs: Promise<unknown>[] = [];
    const storageKeys: string[] = [];
    const pdfStorageKeys: (string | null)[] = [];
    for (const document of replicatedDocuments) {
      const key = storageKey(context.user.id, document.id, document.filename);
      storageKeys.push(key);
      uploadJobs.push(uploadFile(key, raw, contentType));
      if (pdfBytes) {
        const pdfKey = convertedPdfKey(context.user.id, document.id);
        pdfStorageKeys.push(pdfKey);
        uploadJobs.push(uploadFile(pdfKey, pdfBytes, "application/pdf"));
      } else {
        pdfStorageKeys.push(null);
      }
    }
    await Promise.all(uploadJobs);

    const versionRows = replicatedDocuments.map((document, index) => ({
      documentId: document.id,
      storagePath: storageKeys[index],
      pdfStoragePath: pdfStorageKeys[index],
      source: "upload" as const,
      versionNumber: 1,
      displayName: document.filename,
    }));
    let insertedVersions: { id: string; documentId: string }[];
    try {
      insertedVersions = await db.insert(documentVersions).values(versionRows).returning({
        id: documentVersions.id,
        documentId: documentVersions.documentId,
      });
    } catch (error) {
      fail(
        `Failed to record replicated document versions: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      return;
    }
    if (insertedVersions.length !== replicatedDocuments.length) {
      fail("Version count mismatch");
      return;
    }

    const versionByDocumentId = new Map(
      insertedVersions.map((version) => [version.documentId, version.id]),
    );
    await Promise.all(
      replicatedDocuments.map((document) =>
        db
          .update(documents)
          .set({ currentVersionId: versionByDocumentId.get(document.id) })
          .where(eq(documents.id, document.id)),
      ),
    );

    const existingLabels = new Set(Object.keys(context.documents.index));
    let nextLabelIndex = 0;
    const copies: {
      new_filename: string;
      document_id: string;
      version_id: string;
    }[] = [];
    const toolPayloadCopies: {
      doc_id: string;
      document_id: string;
      version_id: string;
      filename: string;
      download_url: string;
    }[] = [];
    for (let index = 0; index < replicatedDocuments.length; index++) {
      const document = replicatedDocuments[index];
      const key = storageKeys[index];
      const versionId = versionByDocumentId.get(document.id);
      if (!versionId) {
        fail(`No version was recorded for replicated document '${document.id}'.`);
        return;
      }
      while (existingLabels.has(`doc-${nextLabelIndex}`)) nextLabelIndex++;
      const slug = `doc-${nextLabelIndex}`;
      existingLabels.add(slug);
      context.documents.index[slug] = {
        document_id: document.id,
        filename: document.filename,
      };
      context.documents.store.set(slug, {
        storage_path: key,
        file_type: sourceInfo.file_type,
        filename: document.filename,
      });
      copies.push({
        new_filename: document.filename,
        document_id: document.id,
        version_id: versionId,
      });
      toolPayloadCopies.push({
        doc_id: slug,
        document_id: document.id,
        version_id: versionId,
        filename: document.filename,
        download_url: buildDownloadUrl(key, document.filename),
      });
    }
    context.write({
      type: "doc_replicated",
      filename: sourceFilename,
      count: copies.length,
      copies,
    });
    context.events.docsReplicated.push({
      filename: sourceFilename,
      count: copies.length,
      copies,
    });
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify({
        ok: true,
        count: copies.length,
        copies: toolPayloadCopies,
      }),
    });
  } catch (error) {
    fail(`replicate_document failed: ${String(error)}`);
  }
}
