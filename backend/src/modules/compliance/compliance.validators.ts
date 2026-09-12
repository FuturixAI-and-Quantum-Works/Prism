import { z } from "zod";

const id = z.string().trim().min(1);
const optionalId = id.nullish().transform((value) => value ?? undefined);
const optionalText = z
  .string()
  .trim()
  .max(255)
  .nullish()
  .transform((value) => value ?? undefined);

export const createReviewSchema = z
  .object({
    primary_document_id: optionalId,
    title: optionalText,
    project_id: optionalId,
    workspace_id: optionalId,
  })
  .superRefine((value, context) => {
    if (value.project_id && value.workspace_id) {
      context.addIssue({
        code: "custom",
        message: "project_id and workspace_id cannot be combined",
      });
    }
    if (!value.primary_document_id && !value.workspace_id) {
      context.addIssue({ code: "custom", message: "primary_document_id is required" });
    }
  });

export const listReviewsSchema = z.object({
  project_id: optionalId,
  workspace_id: optionalId,
});

export const updateReviewSchema = z.object({
  title: optionalText,
});

export const supportingDocumentSchema = z.object({
  document_id: id,
});

export const createContentSchema = z.object({
  content: z.string().trim().default(""),
});

export const updateContentSchema = z.object({
  content: z.string().trim().optional(),
});

export const runRequestSchema = z.object({
  model: z.string().trim().min(1).optional(),
  idempotency_key: z.string().trim().min(1).max(180).optional(),
});

export const reconnectQuerySchema = z.object({
  after: z.coerce.number().int().nonnegative().default(0),
  run_id: optionalId,
});

export const reviewIdParamsSchema = z.object({ reviewId: id });
export const documentIdParamsSchema = z.object({ documentId: id });
export const workspaceIdParamsSchema = z.object({ workspaceId: id });
export const supportingDocumentParamsSchema = z.object({ reviewId: id, docId: id });
export const ruleParamsSchema = z.object({ reviewId: id, ruleId: id });
export const questionParamsSchema = z.object({ reviewId: id, questionId: id });
