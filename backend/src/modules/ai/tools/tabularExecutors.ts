import { readTableCells } from "./tableHelpers.js";
import type { ToolExecutionContext, ToolExecutorResult } from "./types.js";

export async function executeReadTableCells(
  context: ToolExecutionContext,
  input: { col_indices?: number[]; row_indices?: number[] },
): Promise<ToolExecutorResult> {
  const { label, content } = readTableCells(context.tabular, {
    columnIndices: input.col_indices,
    rowIndices: input.row_indices,
  });
  context.write({ type: "doc_read_start", filename: label });
  context.write({ type: "doc_read", filename: label });
  context.events.docsRead.push({ filename: label });
  return { output: content, content };
}
