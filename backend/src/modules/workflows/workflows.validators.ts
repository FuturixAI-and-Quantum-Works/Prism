import { z } from "zod";

const workflowType = z.enum(["assistant", "tabular"], {
  error: "type must be 'assistant' or 'tabular'",
});

const requiredTitle = z.preprocess(
  (value) => value ?? "",
  z.string().trim().min(1, "title is required"),
);

export const createWorkflowSchema = z.object({
  title: requiredTitle,
  type: workflowType,
  prompt_md: z.string().optional(),
  columns_config: z.unknown().optional(),
  practice: z.string().nullable().optional(),
});

export const updateWorkflowSchema = z.object({
  title: z.string().optional(),
  prompt_md: z.string().optional(),
  columns_config: z.unknown().optional(),
  practice: z.string().nullable().optional(),
});

export const workflowIdSchema = z.object({
  workflowId: z.string().min(1),
});

export const listWorkflowsSchema = z.object({
  type: workflowType.optional(),
});

export const hideWorkflowSchema = z.object({
  workflow_id: z.string().trim().min(1, "workflow_id is required"),
});

export const shareWorkflowSchema = z.object({
  emails: z.array(z.string()).min(1, "emails is required"),
  allow_edit: z.boolean().optional().default(false),
});
