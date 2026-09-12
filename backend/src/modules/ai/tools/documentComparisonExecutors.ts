import { computeLineDiff, readDocumentContent, resolveDocLabel } from "./documentContent.js";
import type { ToolExecutionContext } from "./types.js";

export async function executeCompareDocuments(
  context: ToolExecutionContext,
  input: {
    doc_id_a: string;
    doc_id_b: string;
    comparison_type?: "full" | "structural" | "semantic";
  },
): Promise<void> {
  const comparisonType = input.comparison_type ?? "full";
  const docIdA =
    resolveDocLabel(input.doc_id_a, context.documents.store, context.documents.index) ??
    input.doc_id_a;
  const docIdB =
    resolveDocLabel(input.doc_id_b, context.documents.store, context.documents.index) ??
    input.doc_id_b;
  const docInfoA = context.documents.store.get(docIdA);
  const docInfoB = context.documents.store.get(docIdB);
  const indexedA = context.documents.index[docIdA];
  const indexedB = context.documents.index[docIdB];
  if (!docInfoA || !indexedA) {
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify({ ok: false, error: `Document '${input.doc_id_a}' not found.` }),
    });
    return;
  }
  if (!docInfoB || !indexedB) {
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify({ ok: false, error: `Document '${input.doc_id_b}' not found.` }),
    });
    return;
  }
  try {
    const textA = await readDocumentContent(
      docIdA,
      context.documents.store,
      context.write,
      context.documents.index,
      { signal: context.signal },
    );
    const textB = await readDocumentContent(
      docIdB,
      context.documents.store,
      context.write,
      context.documents.index,
      { signal: context.signal },
    );
    const differences = computeLineDiff(textA, textB);
    const summary = {
      added: differences.filter((d) => d.type === "added").length,
      removed: differences.filter((d) => d.type === "removed").length,
      modified: differences.filter((d) => d.type === "modified").length,
    };
    const result = {
      ok: true,
      doc_a: { doc_id: docIdA, filename: docInfoA.filename },
      doc_b: { doc_id: docIdB, filename: docInfoB.filename },
      comparison_type: comparisonType,
      summary,
      differences: differences.slice(0, 50),
      truncated: differences.length > 50,
    };
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify(result),
    });
  } catch (error) {
    context.events.toolResults.push({
      role: "tool",
      tool_call_id: context.callId,
      content: JSON.stringify({
        ok: false,
        error: `Failed to compare documents: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
    });
  }
}
