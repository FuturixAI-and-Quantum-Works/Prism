import type { workflows, workflowShares } from "../../db/schema/index.js";

export type Workflow = typeof workflows.$inferSelect;
export type WorkflowShare = typeof workflowShares.$inferSelect;

export type WorkflowActor = Readonly<{
  userId: string;
  email: string;
}>;

export type WorkflowType = "assistant" | "tabular";

export type CreateWorkflowInput = Readonly<{
  title: string;
  type: WorkflowType;
  promptMd?: string;
  columnsConfig?: unknown;
  practice?: string | null;
}>;

export type UpdateWorkflowInput = Readonly<{
  title?: string;
  promptMd?: string;
  columnsConfig?: unknown;
  practice?: string | null;
}>;

export class WorkflowError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}
