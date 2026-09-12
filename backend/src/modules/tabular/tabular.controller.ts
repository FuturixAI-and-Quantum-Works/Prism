import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { createSSESession } from "../../lib/sseHelpers.js";
import type { TabularService } from "./tabular.service.js";
import { TabularError, type TabularActor, type TabularRunOperation } from "./tabular.types.js";
import {
  chatParamsSchema,
  chatRequestSchema,
  clearCellsSchema,
  createReviewSchema,
  generateSchema,
  listReviewsSchema,
  promptSchema,
  reconnectQuerySchema,
  regenerateCellSchema,
  reviewIdParamsSchema,
  updateReviewSchema,
} from "./tabular.validators.js";

function actor(res: Response): TabularActor {
  return {
    userId: res.locals.auth.user.id,
    email: res.locals.auth.user.email.toLowerCase(),
  };
}

function errorResponse(error: unknown, res: Response): void {
  if (res.headersSent) return;
  if (error instanceof TabularError) {
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

export function createTabularController(service: TabularService) {
  const stream = async (
    req: Request,
    res: Response,
    operation: TabularRunOperation,
    enqueue: boolean,
  ): Promise<void> => {
    const { reviewId } = reviewIdParamsSchema.parse(req.params);
    let runId: string;
    let afterSequence = 0;
    if (enqueue) {
      const headerKey = req.header("Idempotency-Key")?.trim();
      const run =
        operation === "generate"
          ? await service.enqueueRun(actor(res), reviewId, {
              ...generateInput(req, headerKey),
              target: { kind: "review" },
            })
          : await service.enqueueRun(actor(res), reviewId, regenerateInput(req, headerKey));
      runId = run.id;
    } else {
      const query = reconnectQuerySchema.parse(req.query);
      runId = query.run_id ?? (await service.latestRun(actor(res), reviewId, operation)).id;
      const lastEventId = Number(req.header("Last-Event-ID"));
      afterSequence =
        "after" in req.query
          ? query.after
          : Number.isInteger(lastEventId) && lastEventId >= 0
            ? lastEventId
            : 0;
    }
    res.setHeader("X-Tabular-Run-Id", runId);
    const sse = createSSESession(req, res);
    try {
      const result = await service.streamRun(actor(res), reviewId, {
        runId,
        operation,
        afterSequence,
        signal: sse.signal,
        onEvent: (event, sequence) => {
          res.write(`id: ${sequence}\n`);
          sse.writer.event(event);
        },
      });
      if (result.kind === "failed") sse.writer.error(result.error);
      if (result.kind === "cancelled") sse.writer.error("Tabular run cancelled");
    } catch (error) {
      if (!sse.signal.aborted) {
        sse.writer.error(error instanceof Error ? error.message : String(error));
      }
    } finally {
      sse.finish();
    }
  };

  const cancel = (operation: TabularRunOperation) =>
    endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const query = reconnectQuerySchema.parse(req.query);
      res.json(await service.cancelRun(actor(res), reviewId, operation, query.run_id));
    });

  return {
    list: endpoint(async (req, res) => {
      const query = listReviewsSchema.parse(req.query);
      res.json(await service.listReviews(actor(res), query.project_id));
    }),
    create: endpoint(async (req, res) => {
      const body = createReviewSchema.parse(req.body);
      res.status(201).json(
        await service.createReview(actor(res), {
          title: body.title,
          documentIds: body.document_ids,
          columns: body.columns_config,
          workflowId: body.workflow_id,
          projectId: body.project_id,
        }),
      );
    }),
    prompt: endpoint(async (req, res) => {
      const body = promptSchema.parse(req.body);
      res.json(
        await service.generatePrompt(actor(res), {
          title: body.title,
          format: body.format,
          documentName: body.documentName,
          tags: body.tags,
        }),
      );
    }),
    get: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      res.json(await service.getReview(actor(res), reviewId));
    }),
    people: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      res.json(await service.getPeople(actor(res), reviewId));
    }),
    update: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const body = updateReviewSchema.parse(req.body);
      res.json(
        await service.updateReview(actor(res), reviewId, {
          title: body.title,
          documentIds: body.document_ids,
          columns: body.columns_config,
          projectId: body.project_id,
          shares: body.shares,
        }),
      );
    }),
    remove: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      await service.deleteReview(actor(res), reviewId);
      res.status(204).send();
    }),
    clearCells: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const body = clearCellsSchema.parse(req.body ?? {});
      await service.clearCells(actor(res), reviewId, body.document_ids);
      res.status(204).send();
    }),
    startGenerate: endpoint((req, res) => stream(req, res, "generate", true)),
    reconnectGenerate: endpoint((req, res) => stream(req, res, "generate", false)),
    cancelGenerate: cancel("generate"),
    regenerate: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const body = regenerateCellSchema.parse(req.body);
      const run = await service.enqueueRun(actor(res), reviewId, {
        idempotencyKey: req.header("Idempotency-Key")?.trim() || body.idempotency_key,
        target: {
          kind: "cell",
          documentId: body.document_id,
          columnIndex: body.column_index,
        },
      });
      res.setHeader("X-Tabular-Run-Id", run.id);
      const controller = new AbortController();
      const abort = () => controller.abort();
      req.once("aborted", abort);
      res.once("close", abort);
      try {
        const result = await service.waitForCell(actor(res), reviewId, run.id, controller.signal);
        if (!controller.signal.aborted) res.json(result);
      } catch (error) {
        if (!controller.signal.aborted) throw error;
      } finally {
        req.off("aborted", abort);
        res.off("close", abort);
      }
    }),
    reconnectRegenerate: endpoint((req, res) => stream(req, res, "regenerate-cell", false)),
    cancelRegenerate: cancel("regenerate-cell"),
    listChats: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      res.json(await service.listChats(actor(res), reviewId));
    }),
    deleteChat: endpoint(async (req, res) => {
      const { reviewId, chatId } = chatParamsSchema.parse(req.params);
      await service.deleteChat(actor(res), reviewId, chatId);
      res.status(204).send();
    }),
    listChatMessages: endpoint(async (req, res) => {
      const { reviewId, chatId } = chatParamsSchema.parse(req.params);
      res.json(await service.listChatMessages(actor(res), reviewId, chatId));
    }),
    chat: endpoint(async (req, res) => {
      const { reviewId } = reviewIdParamsSchema.parse(req.params);
      const body = chatRequestSchema.parse(req.body);
      if (!body.messages.some((message) => message.role === "user" && message.content?.trim())) {
        throw new TabularError(400, "messages must include a user message");
      }
      await service.authorizeChat(actor(res), reviewId, body.chat_id);
      const sse = createSSESession(req, res);
      try {
        await service.streamChat({
          actor: actor(res),
          reviewId,
          messages: body.messages,
          chatId: body.chat_id,
          reviewTitle: body.review_title,
          projectName: body.project_name,
          signal: sse.signal,
          write: sse.writer.event,
        });
      } catch (error) {
        if (!sse.signal.aborted) {
          sse.writer.error(error instanceof Error ? error.message : String(error));
        }
      } finally {
        sse.finish();
      }
    }),
  };
}

function generateInput(req: Request, headerKey: string | undefined) {
  const body = generateSchema.parse(req.body ?? {});
  return {
    idempotencyKey: headerKey || body.idempotency_key,
    ...(body.model ? { model: body.model } : {}),
  };
}

function regenerateInput(req: Request, headerKey: string | undefined) {
  const body = regenerateCellSchema.parse(req.body);
  return {
    idempotencyKey: headerKey || body.idempotency_key,
    target: {
      kind: "cell" as const,
      documentId: body.document_id,
      columnIndex: body.column_index,
    },
  };
}
