import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { createSSESession } from "../../lib/sseHelpers.js";
import type { ComplianceService } from "./compliance.service.js";
import { ComplianceError, type ComplianceActor } from "./compliance.types.js";
import {
  createContentSchema,
  createReviewSchema,
  documentIdParamsSchema,
  listReviewsSchema,
  questionParamsSchema,
  reconnectQuerySchema,
  reviewIdParamsSchema,
  ruleParamsSchema,
  runRequestSchema,
  supportingDocumentParamsSchema,
  supportingDocumentSchema,
  updateContentSchema,
  updateReviewSchema,
  workspaceIdParamsSchema,
} from "./compliance.validators.js";

function actor(res: Response): ComplianceActor {
  return {
    userId: res.locals.auth.user.id,
    email: res.locals.auth.user.email.toLowerCase(),
  };
}

function errorResponse(error: unknown, res: Response): void {
  if (error instanceof ComplianceError) {
    res.status(error.status).json({ detail: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ detail: error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  res.status(500).json({ detail: error instanceof Error ? error.message : String(error) });
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => errorResponse(error, res));
  };
}

export function createComplianceController(service: ComplianceService) {
  const stream = async (
    req: Request,
    res: Response,
    options: Readonly<{ enqueue: boolean }>,
  ): Promise<void> => {
    const { reviewId } = reviewIdParamsSchema.parse(req.params);
    let runId: string | undefined;
    let afterSequence = 0;
    if (options.enqueue) {
      const body = runRequestSchema.parse(req.body ?? {});
      const headerKey = req.header("Idempotency-Key")?.trim();
      const run = await service.enqueueRun(actor(res), reviewId, {
        idempotencyKey: headerKey || body.idempotency_key,
        model: body.model,
      });
      runId = run.id;
    } else {
      const query = reconnectQuerySchema.parse(req.query);
      runId = query.run_id;
      if (!runId) runId = (await service.latestRun(actor(res), reviewId)).id;
      const lastEventId = Number(req.header("Last-Event-ID"));
      afterSequence =
        "after" in req.query
          ? query.after
          : Number.isInteger(lastEventId) && lastEventId >= 0
            ? lastEventId
            : 0;
    }
    res.setHeader("X-Compliance-Run-Id", runId);
    const sse = createSSESession(req, res);
    try {
      const result = await service.streamRun(actor(res), reviewId, {
        runId,
        afterSequence,
        signal: sse.signal,
        onEvent: (event, sequence) => {
          res.write(`id: ${sequence}\n`);
          sse.writer.event(event);
        },
      });
      if (result.kind === "failed") sse.writer.error(result.error);
      if (result.kind === "cancelled") {
        sse.writer.event({ type: "status", status: "failed" });
        sse.writer.error("Compliance run cancelled");
      }
    } catch (error) {
      sse.writer.error(error instanceof Error ? error.message : String(error));
    } finally {
      sse.finish();
    }
  };

  return {
    create: endpoint(async (req, res) => {
      const input = createReviewSchema.parse(req.body);
      const review = await service.createReview(actor(res), {
        primaryDocumentId: input.primary_document_id,
        title: input.title,
        projectId: input.project_id,
        workspaceId: input.workspace_id,
      });
      res.status(201).json(review);
    }),
    list: endpoint(async (req, res) => {
      const query = listReviewsSchema.parse(req.query);
      res.json(
        await service.listReviews(actor(res), {
          projectId: query.project_id,
          workspaceId: query.workspace_id,
        }),
      );
    }),
    forDocument: endpoint(async (req, res) => {
      const { documentId } = documentIdParamsSchema.parse(req.params);
      const details = await service.getReviewForDocument(actor(res), documentId);
      res.json(details);
    }),
    forWorkspace: endpoint(async (req, res) => {
      const { workspaceId } = workspaceIdParamsSchema.parse(req.params);
      const details = await service.getReviewForWorkspace(actor(res), workspaceId);
      res.json(details);
    }),
    get: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const details = await service.getReview(actor(res), reviewId);
      res.json({
        review: details.review,
        primary_document: details.primaryDocument,
        supporting_documents: details.supportingDocs,
        rules: details.rules,
        questions: details.questions,
      });
    }),
    update: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const input = updateReviewSchema.parse(req.body);
      res.json(await service.updateReview(actor(res), reviewId, input.title));
    }),
    remove: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      await service.deleteReview(actor(res), reviewId);
      res.status(204).send();
    }),
    addSupportingDocument: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const { document_id: documentId } = supportingDocumentSchema.parse(req.body);
      res.status(201).json(await service.addSupportingDocument(actor(res), reviewId, documentId));
    }),
    removeSupportingDocument: endpoint(async (req, res) => {
      const { reviewId, docId } = supportingDocumentParamsSchema.parse(req.params);
      await service.removeSupportingDocument(actor(res), reviewId, docId);
      res.status(204).send();
    }),
    addRule: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const { content } = createContentSchema.parse(req.body);
      res.status(201).json(await service.addRule(actor(res), reviewId, content));
    }),
    updateRule: endpoint(async (req, res) => {
      const { reviewId, ruleId } = ruleParamsSchema.parse(req.params);
      const { content } = updateContentSchema.parse(req.body);
      res.json(await service.updateRule(actor(res), reviewId, ruleId, content));
    }),
    removeRule: endpoint(async (req, res) => {
      const { reviewId, ruleId } = ruleParamsSchema.parse(req.params);
      await service.deleteRule(actor(res), reviewId, ruleId);
      res.status(204).send();
    }),
    addQuestion: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const { content } = createContentSchema.parse(req.body);
      res.status(201).json(await service.addQuestion(actor(res), reviewId, content));
    }),
    updateQuestion: endpoint(async (req, res) => {
      const { reviewId, questionId } = questionParamsSchema.parse(req.params);
      const { content } = updateContentSchema.parse(req.body);
      res.json(await service.updateQuestion(actor(res), reviewId, questionId, content));
    }),
    removeQuestion: endpoint(async (req, res) => {
      const { reviewId, questionId } = questionParamsSchema.parse(req.params);
      await service.deleteQuestion(actor(res), reviewId, questionId);
      res.status(204).send();
    }),
    startRun: endpoint((req, res) => stream(req, res, { enqueue: true })),
    reconnectRun: endpoint((req, res) => stream(req, res, { enqueue: false })),
    cancelRun: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const query = reconnectQuerySchema.parse(req.query);
      res.json(await service.cancelRun(actor(res), reviewId, query.run_id));
    }),
  };
}
