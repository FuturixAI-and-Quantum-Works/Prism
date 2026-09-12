import type { ToolExecutionContext, ToolExecutorResult } from "./types.js";

export async function executeListWorkflows(
  context: ToolExecutionContext,
  _input: Record<string, never>,
): Promise<ToolExecutorResult> {
  const list = Array.from(context.workflows.entries()).map(([id, workflow]) => ({
    id,
    title: workflow.title,
  }));
  return { output: list };
}

export async function executeReadWorkflow(
  context: ToolExecutionContext,
  input: { workflow_id: string },
): Promise<ToolExecutorResult> {
  const workflow = context.workflows.get(input.workflow_id);
  if (workflow) {
    context.write({
      type: "workflow_applied",
      workflow_id: input.workflow_id,
      title: workflow.title,
    });
    context.events.workflowsApplied.push({
      workflow_id: input.workflow_id,
      title: workflow.title,
    });
  }
  const content = workflow ? workflow.prompt_md : `Workflow '${input.workflow_id}' not found.`;
  return { output: content, content };
}
