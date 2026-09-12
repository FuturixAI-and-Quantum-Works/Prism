import {
  citationReminder,
  DocumentReadError,
  extractClausesFromText,
  findInDocumentContent,
  readDocumentContent,
  resolveDocLabel,
} from "./documentContent.js";
import type { ToolExecutionContext } from "./types.js";

function recordReadFailure(context: ToolExecutionContext, error: DocumentReadError): void {
  context.events.docReadFailures.push({
    doc_id: error.docId,
    ...(error.filename ? { filename: error.filename } : {}),
    ...(error.documentId ? { document_id: error.documentId } : {}),
    reason: error.reason,
    error: error.message,
  });
}

export async function executeReadDocument(
  context: ToolExecutionContext,
  input: { doc_id: string },
): Promise<void> {
  const docId =
    resolveDocLabel(input.doc_id, context.documents.store, context.documents.index) ?? input.doc_id;
  let content: string;
  try {
    content = await readDocumentContent(
      docId,
      context.documents.store,
      context.write,
      context.documents.index,
      { signal: context.signal },
    );
  } catch (error) {
    if (error instanceof DocumentReadError) recordReadFailure(context, error);
    throw error;
  }
  const filename = context.documents.store.get(docId)?.filename;
  const documentId = context.documents.index[docId]?.document_id;
  if (filename) context.events.docsRead.push({ filename, document_id: documentId });
  context.events.toolResults.push({
    role: "tool",
    tool_call_id: context.callId,
    content: filename ? `${citationReminder(docId, filename)}\n\n${content}` : content,
  });
}

export async function executeFindInDocument(
  context: ToolExecutionContext,
  input: {
    doc_id: string;
    query: string;
    max_results?: number;
    context_chars?: number;
  },
): Promise<void> {
  const docId =
    resolveDocLabel(input.doc_id, context.documents.store, context.documents.index) ?? input.doc_id;
  const content = await findInDocumentContent({
    docLabel: docId,
    query: input.query,
    maxResults: input.max_results,
    contextChars: input.context_chars,
    docStore: context.documents.store,
    write: context.write,
    docIndex: context.documents.index,
    signal: context.signal,
  });
  const filename = context.documents.store.get(docId)?.filename;
  if (filename) {
    const parsed: unknown = (() => {
      try {
        return JSON.parse(content);
      } catch {
        return null;
      }
    })();
    if (parsed && typeof parsed === "object" && Reflect.get(parsed, "ok") === true) {
      const total = Reflect.get(parsed, "total_matches");
      if (typeof total === "number") {
        context.events.docsFound.push({
          filename,
          query: input.query,
          total_matches: total,
        });
      }
    }
  }
  context.events.toolResults.push({
    role: "tool",
    tool_call_id: context.callId,
    content,
  });
}

export async function executeListDocuments(
  context: ToolExecutionContext,
  _input: Record<string, never>,
): Promise<void> {
  const list = Array.from(context.documents.store.entries()).map(([doc_id, info]) => ({
    doc_id,
    filename: info.filename,
    file_type: info.file_type,
  }));
  context.events.toolResults.push({
    role: "tool",
    tool_call_id: context.callId,
    content: JSON.stringify(list),
  });
}

export async function executeFetchDocuments(
  context: ToolExecutionContext,
  input: { doc_ids: string[] },
): Promise<void> {
  const docIds = input.doc_ids.map(
    (id) => resolveDocLabel(id, context.documents.store, context.documents.index) ?? id,
  );
  const parts: string[] = [];
  for (const docId of docIds) {
    let content: string;
    try {
      content = await readDocumentContent(
        docId,
        context.documents.store,
        context.write,
        context.documents.index,
        { signal: context.signal },
      );
    } catch (error) {
      if (error instanceof DocumentReadError) recordReadFailure(context, error);
      throw error;
    }
    const filename = context.documents.store.get(docId)?.filename ?? docId;
    parts.push(
      `--- ${filename} (${docId}) ---\n${citationReminder(docId, filename)}\n\n${content}`,
    );
    if (context.documents.store.get(docId)) {
      const documentId = context.documents.index[docId]?.document_id;
      context.events.docsRead.push({ filename, document_id: documentId });
    }
  }
  context.events.toolResults.push({
    role: "tool",
    tool_call_id: context.callId,
    content: parts.join("\n\n"),
  });
}

export async function executeExtractClauses(
  context: ToolExecutionContext,
  input: { doc_id: string; clause_types?: string[] },
): Promise<void> {
  const docId =
    resolveDocLabel(input.doc_id, context.documents.store, context.documents.index) ?? input.doc_id;
  const docInfo = context.documents.store.get(docId);
  const indexed = context.documents.index[docId];
  if (!docInfo || !indexed) {
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify({ ok: false, error: `Document '${docId}' not found.` }),
    });
    return;
  }
  try {
    const text = await readDocumentContent(
      docId,
      context.documents.store,
      context.write,
      context.documents.index,
      { signal: context.signal },
    );
    const clauses = extractClausesFromText(text, input.clause_types);
    const result = {
      ok: true,
      doc_id: docId,
      document_id: indexed.document_id,
      filename: docInfo.filename,
      total_clauses: clauses.length,
      clauses,
    };
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify(result),
    });
  } catch (error) {
    if (error instanceof DocumentReadError) recordReadFailure(context, error);
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify({
        ok: false,
        error: `Failed to extract clauses: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
    });
  }
}
