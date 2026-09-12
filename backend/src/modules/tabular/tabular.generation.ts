import { z } from "zod";
import type { AiRuntimeContext } from "../../lib/llm/types.js";
import { modelForId } from "../../lib/llm/index.js";
import type { ClaimedJob, WorkHandler, WorkOutcome } from "../../jobs/types.js";
import { mapWithConcurrency, UsagePolicyService } from "../ai/usagePolicy.js";
import type { ContentTextService } from "../content/contentText.service.js";
import { TabularAuthorizationPolicy } from "./tabular.policy.js";
import { tabularDocumentPrompt, tabularExtractionSystemPrompt } from "./tabular.prompts.js";
import type { TabularReviewRepository } from "./tabular.review.repository.js";
import type { TabularRunRepository } from "./tabular.run.repository.js";
import type {
  PersistedTabularEvent,
  TabularActor,
  TabularCellErrorKind,
  TabularCellResult,
  TabularColumn,
  TabularDocument,
  TabularRun,
} from "./tabular.types.js";

const resultSchema = z.object({
  column_index: z.number().int(),
  summary: z.string().default(""),
  flag: z.enum(["green", "grey", "yellow", "red"]).default("grey"),
  reasoning: z.string().default(""),
});

const jobPayloadSchema = z.object({ runId: z.string().uuid() });

type ModelSettings = Readonly<{ tabularModel: string; aiRuntime: AiRuntimeContext }>;

export type TabularGenerationRepositories = Readonly<{
  reviews: Pick<
    TabularReviewRepository,
    "findReview" | "sourceBelongsToReview" | "findDocument" | "findUserEmail"
  >;
  runs: Pick<
    TabularRunRepository,
    | "claimRun"
    | "isRunCancelled"
    | "listRunEvents"
    | "markCellGenerating"
    | "reserveUsage"
    | "completeCell"
    | "completeRun"
  >;
}>;

export type TabularGenerationDependencies = Readonly<{
  repositories: TabularGenerationRepositories;
  policy: TabularAuthorizationPolicy;
  content: ContentTextService;
  usagePolicy: UsagePolicyService;
  getModelSettings: (userId: string) => Promise<ModelSettings>;
  completeText: (input: {
    model: string;
    task: "tabular";
    systemPrompt: string;
    user: string;
    maxTokens: number;
    runtime: AiRuntimeContext;
    signal: AbortSignal;
  }) => Promise<string>;
  completeTextWithInlineFile: (input: {
    model: string;
    task: "tabular";
    systemPrompt: string;
    user: string;
    file: { data: ArrayBuffer; mimeType: string; filename: string };
    maxTokens: number;
    runtime: AiRuntimeContext;
    signal: AbortSignal;
  }) => Promise<string>;
}>;

export class TabularRunCancelledError extends Error {
  constructor() {
    super("Tabular run cancelled");
    this.name = "TabularRunCancelledError";
  }
}

export class TabularFenceLostError extends Error {
  constructor(readonly epoch: number) {
    super("Tabular run lost ownership of a target cell");
    this.name = "TabularFenceLostError";
  }
}

export class TabularWorkerInterruptedError extends Error {
  constructor(
    readonly runId: string,
    readonly epoch: number,
  ) {
    super("Tabular worker interrupted");
    this.name = "TabularWorkerInterruptedError";
  }
}

export class TabularGenerationService {
  constructor(private readonly dependencies: TabularGenerationDependencies) {}

  async execute(runId: string, signal: AbortSignal): Promise<void> {
    const claim = await this.dependencies.repositories.runs.claimRun(runId);
    if (!claim) {
      if (await this.dependencies.repositories.runs.isRunCancelled(runId)) {
        throw new TabularRunCancelledError();
      }
      return;
    }
    const { run, epoch } = claim;
    try {
      if (signal.aborted) throw new TabularWorkerInterruptedError(run.id, epoch);
      if (!(await this.dependencies.repositories.reviews.findReview(run.reviewId))) {
        throw new Error("Tabular review not found");
      }
      const settings = await this.dependencies.getModelSettings(run.userId);
      const model = run.request.requestedModel ?? settings.tabularModel;
      const request = run.request;
      const targets =
        request.operation === "generate"
          ? request.targets.map((target) => ({
              documentId: target.documentId,
              columns: request.columns.filter((column) =>
                target.columnIndexes.includes(column.index),
              ),
            }))
          : [{ documentId: request.documentId, columns: [request.column] }];
      const existingEvents = await this.dependencies.repositories.runs.listRunEvents(run.id, 0);
      const terminalKeys = new Set(
        existingEvents.flatMap(({ event }) =>
          event.type === "cell_update" && (event.status === "done" || event.status === "error")
            ? [`${event.document_id}:${event.column_index}`]
            : [],
        ),
      );
      const pending = targets.flatMap((target) => {
        const columns = target.columns.filter(
          (column) => !terminalKeys.has(`${target.documentId}:${column.index}`),
        );
        return columns.length ? [{ documentId: target.documentId, columns }] : [];
      });
      const targetCellCount = pending.reduce((count, target) => count + target.columns.length, 0);
      const plan = this.dependencies.usagePolicy.tabularPlan(pending.length, targetCellCount);
      await mapWithConcurrency(pending, plan.concurrency, async (target) => {
        await this.processDocument({
          run,
          epoch,
          documentId: target.documentId,
          columns: target.columns,
          model,
          runtime: settings.aiRuntime,
          signal,
          limits: { calls: plan.modelCalls, tokens: plan.outputTokens },
        });
      });
      await this.ensureActive(run.id, epoch, signal);
      if (!(await this.dependencies.repositories.runs.completeRun(run.id, epoch))) {
        await this.throwFenceOrCancellation(run.id, epoch);
      }
    } catch (error) {
      if (signal.aborted && !(error instanceof TabularWorkerInterruptedError)) {
        throw new TabularWorkerInterruptedError(run.id, epoch);
      }
      throw error;
    }
  }

  private async processDocument(input: {
    run: TabularRun;
    epoch: number;
    documentId: string;
    columns: readonly TabularColumn[];
    model: string;
    runtime: AiRuntimeContext;
    signal: AbortSignal;
    limits: { calls: number; tokens: number };
  }): Promise<void> {
    await this.ensureActive(input.run.id, input.epoch, input.signal);
    if (
      !(await this.dependencies.repositories.reviews.sourceBelongsToReview(
        input.run.reviewId,
        input.documentId,
      ))
    ) {
      throw new Error("Tabular review source membership was revoked");
    }
    const email = await this.dependencies.repositories.reviews.findUserEmail(input.run.userId);
    if (!email) throw new Error("Tabular run user identity is unavailable");
    const actor: TabularActor = { userId: input.run.userId, email: email.trim().toLowerCase() };
    const review = await this.dependencies.repositories.reviews.findReview(input.run.reviewId);
    if (!review) throw new Error("Tabular review access was revoked");
    if (
      !(await this.dependencies.policy.allows(
        review,
        actor,
        input.run.operation === "generate" ? "generateCells" : "regenerateCell",
      ))
    ) {
      throw new Error("Tabular review access was revoked");
    }
    const document = await this.dependencies.repositories.reviews.findDocument(input.documentId);
    if (!document || (review.projectId !== null && document.projectId !== review.projectId)) {
      throw new Error("Tabular source is outside the review project");
    }
    if (!(await this.dependencies.policy.allowsDocument(document, actor))) {
      throw new Error("Tabular source document access was revoked");
    }
    let source;
    try {
      source = await this.dependencies.content.read(
        {
          kind: "document",
          id: document.id,
          fileType: document.fileType,
        },
        { signal: input.signal },
      );
    } catch (error) {
      if (input.signal.aborted) {
        throw new TabularWorkerInterruptedError(input.run.id, input.epoch);
      }
      for (const column of input.columns) {
        const marked = await this.dependencies.repositories.runs.markCellGenerating({
          reviewId: input.run.reviewId,
          documentId: document.id,
          columnIndex: column.index,
          runId: input.run.id,
          epoch: input.epoch,
          eventKey: `cell:generating:${document.id}:${column.index}`,
          event: cellEvent(document.id, column.index, null, "generating"),
        });
        if (!marked) await this.throwFenceOrCancellation(input.run.id, input.epoch);
      }
      await this.failColumns(
        input,
        document,
        error instanceof Error ? error.message : String(error),
        "extraction",
      );
      return;
    }
    for (const column of input.columns) {
      const event = cellEvent(document.id, column.index, null, "generating");
      const marked = await this.dependencies.repositories.runs.markCellGenerating({
        reviewId: input.run.reviewId,
        documentId: document.id,
        columnIndex: column.index,
        runId: input.run.id,
        epoch: input.epoch,
        eventKey: `cell:generating:${document.id}:${column.index}`,
        event,
      });
      if (!marked) await this.throwFenceOrCancellation(input.run.id, input.epoch);
    }
    if (
      source.kind === "inline-pdf" &&
      !modelForId(input.model, input.runtime).capabilities.input.pdf
    ) {
      await this.failColumns(
        input,
        document,
        "This PDF has no extractable text and the selected tabular model cannot read PDFs directly.",
        "unsupported-inline-pdf",
      );
      return;
    }
    const maxTokens = Math.min(Math.max(input.columns.length, 1) * 1_024, 8_192);
    const reserved = await this.dependencies.repositories.runs.reserveUsage({
      runId: input.run.id,
      epoch: input.epoch,
      calls: 1,
      outputTokens: maxTokens,
      maxCalls: input.limits.calls,
      maxOutputTokens: input.limits.tokens,
    });
    if (!reserved) throw new Error("Tabular review AI budget exhausted");
    const prompt = tabularDocumentPrompt(
      document.filename,
      input.columns,
      source.kind === "inline-pdf",
    );
    let raw: string;
    try {
      raw =
        source.kind === "text"
          ? await this.dependencies.completeText({
              model: input.model,
              task: "tabular",
              systemPrompt: tabularExtractionSystemPrompt,
              user: `${prompt}\n\n${source.text.slice(0, 120_000)}`,
              maxTokens,
              runtime: input.runtime,
              signal: input.signal,
            })
          : await this.dependencies.completeTextWithInlineFile({
              model: input.model,
              task: "tabular",
              systemPrompt: tabularExtractionSystemPrompt,
              user: prompt,
              file: {
                data: source.bytes,
                mimeType: source.mimeType,
                filename: document.filename,
              },
              maxTokens,
              runtime: input.runtime,
              signal: input.signal,
            });
    } catch (error) {
      if (input.signal.aborted) {
        throw new TabularWorkerInterruptedError(input.run.id, input.epoch);
      }
      throw error;
    }
    const results = parseResults(raw);
    for (const column of input.columns) {
      const result = results.get(column.index);
      if (result) {
        await this.finishCell(input, document, column.index, result, "done");
      } else {
        await this.finishCell(
          input,
          document,
          column.index,
          errorCell("The selected model did not return a value for this cell."),
          "error",
          "missing-model-result",
        );
      }
    }
  }

  private async failColumns(
    input: Parameters<TabularGenerationService["processDocument"]>[0],
    document: TabularDocument,
    message: string,
    errorKind: TabularCellErrorKind,
  ): Promise<void> {
    for (const column of input.columns) {
      await this.finishCell(input, document, column.index, errorCell(message), "error", errorKind);
    }
  }

  private async finishCell(
    input: Parameters<TabularGenerationService["processDocument"]>[0],
    document: TabularDocument,
    columnIndex: number,
    content: TabularCellResult,
    status: "done" | "error",
    errorKind?: TabularCellErrorKind,
  ): Promise<void> {
    const written = await this.dependencies.repositories.runs.completeCell({
      reviewId: input.run.reviewId,
      documentId: document.id,
      columnIndex,
      runId: input.run.id,
      epoch: input.epoch,
      content,
      status,
      eventKey: `cell:${status}:${document.id}:${columnIndex}`,
      event: cellEvent(document.id, columnIndex, content, status),
      errorKind,
    });
    if (!written) await this.throwFenceOrCancellation(input.run.id, input.epoch);
  }

  private async ensureActive(runId: string, epoch: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new TabularWorkerInterruptedError(runId, epoch);
    if (await this.dependencies.repositories.runs.isRunCancelled(runId)) {
      throw new TabularRunCancelledError();
    }
  }

  private async throwFenceOrCancellation(runId: string, epoch: number): Promise<never> {
    if (await this.dependencies.repositories.runs.isRunCancelled(runId)) {
      throw new TabularRunCancelledError();
    }
    throw new TabularFenceLostError(epoch);
  }
}

export function createTabularJobHandler(input: {
  generation: Pick<TabularGenerationService, "execute">;
  repository: Pick<TabularRunRepository, "failActiveRun" | "failRun" | "isRunCancelled">;
}): WorkHandler<ClaimedJob> {
  return async (claim, signal): Promise<WorkOutcome> => {
    const parsed = jobPayloadSchema.safeParse(claim.payload);
    if (!parsed.success) return { kind: "failed", error: "Invalid tabular job payload" };
    try {
      await input.generation.execute(parsed.data.runId, signal);
      return { kind: "succeeded" };
    } catch (error) {
      if (
        (await input.repository.isRunCancelled(parsed.data.runId)) ||
        error instanceof TabularRunCancelledError
      ) {
        return { kind: "failed", error: "Tabular run cancelled" };
      }
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof TabularWorkerInterruptedError) {
        if (claim.attemptNumber < claim.maxAttempts) return { kind: "retry", error: message };
        await input.repository.failRun(error.runId, error.epoch, message);
        return { kind: "failed", error: message };
      }
      if (error instanceof TabularFenceLostError) {
        await input.repository.failRun(parsed.data.runId, error.epoch, message);
        return { kind: "failed", error: message };
      }
      if (claim.attemptNumber < claim.maxAttempts) return { kind: "retry", error: message };
      await input.repository.failActiveRun(parsed.data.runId, message);
      return { kind: "failed", error: message };
    }
  };
}

function cellEvent(
  documentId: string,
  columnIndex: number,
  content: TabularCellResult | null,
  status: "generating" | "done" | "error",
): PersistedTabularEvent {
  return {
    type: "cell_update",
    document_id: documentId,
    column_index: columnIndex,
    content,
    status,
  };
}

function errorCell(reasoning: string): TabularCellResult {
  return { summary: "", flag: "red", reasoning };
}

function parseResults(raw: string): Map<number, TabularCellResult> {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  const values: unknown[] = [];
  try {
    const parsed: unknown = JSON.parse(cleaned);
    values.push(...(Array.isArray(parsed) ? parsed : [parsed]));
  } catch {
    for (const line of cleaned.split(/\r?\n/)) {
      try {
        values.push(JSON.parse(line));
      } catch {
        continue;
      }
    }
  }
  const results = new Map<number, TabularCellResult>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      const nested = Reflect.get(value, "results") ?? Reflect.get(value, "cells");
      if (Array.isArray(nested)) {
        nested.forEach(visit);
        return;
      }
    }
    const parsed = resultSchema.safeParse(value);
    if (!parsed.success) return;
    results.set(parsed.data.column_index, {
      summary: parsed.data.summary.trim() || "Not addressed",
      flag: parsed.data.flag,
      reasoning: parsed.data.reasoning,
    });
  };
  values.forEach(visit);
  return results;
}
