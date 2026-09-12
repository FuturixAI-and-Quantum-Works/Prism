import { searchRetrievalSources } from "../../retrieval/retrieval.query.js";
import type { ToolExecutionContext, ToolExecutorResult } from "./types.js";

export async function executeSearchSources(
  context: ToolExecutionContext,
  input: { query: string; top_k?: number },
): Promise<ToolExecutorResult> {
  const query = input.query.trim();
  const topK = input.top_k ?? 8;
  if (!query) {
    const output = { ok: false, error: "query is required", results: [], count: 0 };
    return { output, status: "error" };
  }

  const projectId =
    context.scope.kind === "project" || context.scope.kind === "tabular"
      ? context.scope.projectId
      : null;
  const workspaceId = context.scope.kind === "workspace" ? context.scope.workspaceId : null;
  const output = await searchRetrievalSources({
    userId: context.user.id,
    userEmail: context.user.email,
    projectId,
    workspaceId,
    query,
    topK,
  });
  context.write({
    type: "source_results",
    tool_call_id: context.callId,
    query,
    scope: output.scope,
    results: output.results,
    count: output.count,
  });
  return { output, status: output.ok === false ? "error" : "complete" };
}
