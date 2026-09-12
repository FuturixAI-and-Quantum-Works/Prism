import { z } from "zod";

const id = z.string().trim().min(1);
const columnSchema = z.object({
  index: z.number().int().nonnegative(),
  name: z.string(),
  prompt: z.string(),
  format: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const reviewIdParamsSchema = z.object({ reviewId: id });

export const regenerateCellSchema = z.object({
  document_id: id,
  column_index: z.number().int().nonnegative(),
  idempotency_key: z.string().trim().min(1).max(180).optional(),
});

export const generateSchema = z.object({
  idempotency_key: z.string().trim().min(1).max(180).optional(),
  model: z.string().trim().min(1).optional(),
});

export const reconnectQuerySchema = z.object({
  after: z.coerce.number().int().nonnegative().default(0),
  run_id: id.optional(),
});

export const createReviewSchema = z.object({
  title: z.string().optional(),
  document_ids: z.array(id),
  columns_config: z.array(columnSchema),
  workflow_id: id.optional(),
  project_id: id.optional(),
});

export const updateReviewSchema = z
  .object({
    title: z.string().nullable().optional(),
    document_ids: z.array(id).optional(),
    columns_config: z.array(columnSchema).optional(),
    project_id: id.nullable().optional(),
    shares: z
      .array(
        z.object({
          email: z
            .string()
            .trim()
            .email()
            .transform((email) => email.toLowerCase()),
          role: z.enum(["admin", "editor", "viewer"]),
        }),
      )
      .optional(),
  })
  .strict();

export const listReviewsSchema = z.object({ project_id: id.optional() });
export const clearCellsSchema = z.object({ document_ids: z.array(id).optional() });
export const chatParamsSchema = z.object({ reviewId: id, chatId: id });
export const promptSchema = z
  .object({
    title: z.string().optional(),
    column_name: z.string().optional(),
    format: z.string().optional(),
    documentName: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .transform((input, context) => {
    const title = (input.title ?? input.column_name ?? "").trim();
    if (!title) {
      context.addIssue({ code: "custom", message: "title is required" });
      return z.NEVER;
    }
    return { ...input, title };
  });

export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().nullable().optional(),
    }),
  ),
  chat_id: id.optional(),
  review_title: z.string().optional(),
  project_name: z.string().optional(),
});

export const tabularRunRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("generate"),
    sourceDocumentIds: z.array(id),
    columns: z.array(columnSchema),
    targets: z.array(
      z.object({ documentId: id, columnIndexes: z.array(z.number().int().nonnegative()) }),
    ),
    requestedModel: z.string().nullable(),
  }),
  z.object({
    operation: z.literal("regenerate-cell"),
    sourceDocumentIds: z.array(id),
    documentId: id,
    column: columnSchema,
    requestedModel: z.string().nullable(),
  }),
]);
