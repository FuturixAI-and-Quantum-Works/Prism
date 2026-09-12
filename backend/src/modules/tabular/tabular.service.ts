import { createHash, randomUUID } from "node:crypto";
import type { StreamDataEvent } from "@prism/protocol";
import type { QueueRepository } from "../../jobs/types.js";
import { UsagePolicyError, UsagePolicyService } from "../ai/usagePolicy.js";
import {
  getReviewCapabilities,
  TabularAuthorizationPolicy,
  type ReviewCapabilities,
} from "./tabular.policy.js";
import type { TabularCellRepository } from "./tabular.cell.repository.js";
import type { TabularChatRepository } from "./tabular.chat.repository.js";
import type { TabularReviewRepository } from "./tabular.review.repository.js";
import type { TabularRunRepository } from "./tabular.run.repository.js";
import {
  TabularActiveRunConflictError,
  TabularError,
  TabularRunConflictError,
  type PersistedTabularEvent,
  type TabularActor,
  type TabularCellErrorKind,
  type TabularCellResult,
  type TabularColumn,
  type TabularReview,
  type TabularRun,
  type TabularRunOperation,
  type TabularRunRequest,
} from "./tabular.types.js";

type StreamResult =
  | Readonly<{ kind: "completed" }>
  | Readonly<{ kind: "failed"; error: string }>
  | Readonly<{ kind: "cancelled" }>
  | Readonly<{ kind: "disconnected" }>;

export type TabularServiceDependencies = Readonly<{
  filterAccessibleDocumentIds: (
    documentIds: readonly string[],
    userId: string,
    email: string,
  ) => Promise<readonly string[]>;
  generatePrompt: (
    userId: string,
    input: {
      title: string;
      format?: string;
      documentName?: string;
      tags?: readonly string[];
    },
  ) => Promise<string>;
  streamChat: (input: {
    actor: TabularActor;
    review: TabularReview;
    messages: readonly Readonly<{
      role: "user" | "assistant";
      content?: string | null;
    }>[];
    chatId?: string;
    reviewTitle?: string;
    projectName?: string;
    signal: AbortSignal;
    write: (event: StreamDataEvent) => void;
  }) => Promise<void>;
}>;

export type TabularServiceRepositories = Readonly<{
  reviews: TabularReviewRepository;
  cells: TabularCellRepository;
  chats: TabularChatRepository;
  runs: TabularRunRepository;
}>;

export class TabularService {
  constructor(
    private readonly repositories: TabularServiceRepositories,
    private readonly policy: TabularAuthorizationPolicy,
    private readonly queue: Pick<QueueRepository, "cancelJob">,
    private readonly usagePolicy: UsagePolicyService,
    private readonly dependencies: TabularServiceDependencies,
    private readonly wait: (
      milliseconds: number,
      signal: AbortSignal,
    ) => Promise<void> = waitForPoll,
  ) {}

  async listReviews(actor: TabularActor, projectId?: string): Promise<readonly unknown[]> {
    const reviewIds = await this.policy.listReviewIds(actor);
    return this.repositories.reviews.listVisibleReviews({
      reviewIds,
      ...(projectId ? { projectId } : {}),
    });
  }

  async createReview(
    actor: TabularActor,
    input: {
      title?: string;
      documentIds: readonly string[];
      columns: readonly TabularColumn[];
      workflowId?: string;
      projectId?: string;
    },
  ): Promise<unknown> {
    if (input.projectId) {
      const role = await this.policy.projectRole(input.projectId, actor);
      if (!role) throw new TabularError(404, "Project not found");
      if (!getReviewCapabilities(role).assignProject) {
        throw new TabularError(403, "You do not have permission to assign this project");
      }
    }
    const documentIds = await this.allowedDocuments(input.documentIds, actor, input.projectId);
    return this.repositories.reviews.createReview({
      userId: actor.userId,
      title: input.title ?? null,
      projectId: input.projectId ?? null,
      workflowId: input.workflowId ?? null,
      columns: input.columns,
      documentIds,
    });
  }

  async getReview(actor: TabularActor, reviewId: string): Promise<unknown> {
    const { review, role } = await this.requireReviewWithRole(actor, reviewId, "read");
    return this.repositories.reviews.reviewDetails(review, actor.userId, role);
  }

  async getPeople(actor: TabularActor, reviewId: string): Promise<unknown> {
    const review = await this.requireReview(actor, reviewId, "read");
    return this.repositories.reviews.reviewPeople(review);
  }

  async updateReview(
    actor: TabularActor,
    reviewId: string,
    input: {
      title?: string | null;
      documentIds?: readonly string[];
      columns?: readonly TabularColumn[];
      projectId?: string | null;
      shares?: readonly Readonly<{
        email: string;
        role: "admin" | "editor" | "viewer";
      }>[];
    },
  ): Promise<unknown> {
    const review = await this.requireReview(actor, reviewId, "editReview");
    const role = await this.policy.roleFor(review, actor);
    if (!role) throw new TabularError(404, "Review not found");
    const capabilities = getReviewCapabilities(role);
    if (input.projectId !== undefined && !capabilities.assignProject) {
      throw new TabularError(403, "You do not have permission to assign this review");
    }
    if (input.projectId) {
      const destinationRole = await this.policy.projectRole(input.projectId, actor);
      if (!destinationRole) throw new TabularError(404, "Project not found");
      if (!getReviewCapabilities(destinationRole).assignProject) {
        throw new TabularError(403, "You do not have permission to assign this project");
      }
    }
    if (input.shares !== undefined && !capabilities.manageSharing) {
      throw new TabularError(403, "You do not have permission to manage sharing");
    }
    const effectiveProjectId = input.projectId === undefined ? review.projectId : input.projectId;
    const currentSources =
      input.documentIds !== undefined || input.projectId !== undefined
        ? await this.repositories.reviews.listReviewDocuments(reviewId)
        : [];
    let documentIds: readonly string[] | undefined;
    if (input.documentIds !== undefined) {
      const existing = new Set(currentSources.map(({ id }) => id));
      const newIds = input.documentIds.filter((id) => !existing.has(id));
      const allowedNewIds = await this.allowedDocuments(
        newIds,
        actor,
        effectiveProjectId ?? undefined,
      );
      const allowed = new Set([...existing, ...allowedNewIds]);
      documentIds = input.documentIds.filter(
        (id, index) => allowed.has(id) && input.documentIds?.indexOf(id) === index,
      );
    }
    if (input.projectId) {
      const resultingIds = documentIds ?? currentSources.map(({ id }) => id);
      const resultingDocuments = await this.repositories.reviews.findDocuments(resultingIds);
      if (
        resultingDocuments.length !== resultingIds.length ||
        resultingDocuments.some((document) => document.projectId !== input.projectId)
      ) {
        throw new TabularError(400, "Review sources must belong to the assigned project");
      }
    }
    const shares =
      input.shares === undefined
        ? undefined
        : [
            ...new Map(
              input.shares.map((share) => [
                share.email.trim().toLowerCase(),
                { email: share.email.trim().toLowerCase(), role: share.role },
              ]),
            ).values(),
          ];
    const updated = await this.repositories.reviews.updateReview({
      reviewId,
      updates: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.columns !== undefined ? { columnsConfig: [...input.columns] } : {}),
        ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      },
      ...(shares === undefined
        ? {}
        : { shareReplacement: { shares, sharedByUserId: actor.userId } }),
      ...(documentIds === undefined ? {} : { documentIds }),
      ...(input.columns === undefined ? {} : { columns: input.columns }),
    });
    if (!updated) throw new TabularError(404, "Review not found");
    return updated;
  }

  async deleteReview(actor: TabularActor, reviewId: string): Promise<void> {
    await this.requireReview(actor, reviewId, "deleteReview");
    await this.repositories.reviews.deleteReview(reviewId);
  }

  async clearCells(
    actor: TabularActor,
    reviewId: string,
    documentIds?: readonly string[],
  ): Promise<void> {
    await this.requireReview(actor, reviewId, "editCells");
    await this.repositories.cells.clearCells(reviewId, documentIds);
  }

  async generatePrompt(
    actor: TabularActor,
    input: {
      title: string;
      format?: string;
      documentName?: string;
      tags?: readonly string[];
    },
  ): Promise<{ prompt: string; source: "llm" }> {
    try {
      return {
        prompt: await this.dependencies.generatePrompt(actor.userId, input),
        source: "llm",
      };
    } catch {
      throw new TabularError(502, "Failed to generate prompt from LLM");
    }
  }

  async listChats(actor: TabularActor, reviewId: string): Promise<readonly unknown[]> {
    await this.requireReview(actor, reviewId, "useOwnChats");
    return this.repositories.chats.listChats(reviewId, actor.userId);
  }

  async deleteChat(actor: TabularActor, reviewId: string, chatId: string): Promise<void> {
    await this.requireReview(actor, reviewId, "useOwnChats");
    await this.repositories.chats.deleteChat(reviewId, chatId, actor.userId);
  }

  async listChatMessages(
    actor: TabularActor,
    reviewId: string,
    chatId: string,
  ): Promise<readonly unknown[]> {
    await this.requireReview(actor, reviewId, "useOwnChats");
    if (!(await this.repositories.chats.findOwnedChat(reviewId, chatId, actor.userId))) {
      throw new TabularError(404, "Chat not found");
    }
    return this.repositories.chats.listChatMessages(chatId);
  }

  async streamChat(input: {
    actor: TabularActor;
    reviewId: string;
    messages: readonly Readonly<{
      role: "user" | "assistant";
      content?: string | null;
    }>[];
    chatId?: string;
    reviewTitle?: string;
    projectName?: string;
    signal: AbortSignal;
    write: (event: StreamDataEvent) => void;
  }): Promise<void> {
    const lastUser = [...input.messages]
      .reverse()
      .find((message) => message.role === "user" && message.content?.trim());
    if (!lastUser) throw new TabularError(400, "messages must include a user message");
    const review = await this.authorizeChat(input.actor, input.reviewId, input.chatId);
    await this.dependencies.streamChat({ ...input, review });
  }

  async authorizeChat(
    actor: TabularActor,
    reviewId: string,
    chatId?: string,
  ): Promise<TabularReview> {
    const review = await this.requireReview(actor, reviewId, "useOwnChats");
    if (chatId && !(await this.repositories.chats.findOwnedChat(reviewId, chatId, actor.userId))) {
      throw new TabularError(404, "Chat not found");
    }
    return review;
  }

  async enqueueRun(
    actor: TabularActor,
    reviewId: string,
    input: Readonly<{
      idempotencyKey?: string;
      model?: string;
      target:
        | Readonly<{ kind: "review" }>
        | Readonly<{ kind: "cell"; documentId: string; columnIndex: number }>;
    }>,
  ): Promise<TabularRun> {
    const capability = input.target.kind === "cell" ? "regenerateCell" : "generateCells";
    const review = await this.requireReview(actor, reviewId, capability);
    const operation = input.target.kind === "cell" ? "regenerate-cell" : "generate";
    const requestHash = hashRequestIntent(input.target, input.model);
    if (input.idempotencyKey) {
      const existing = await this.repositories.runs.findRunByIdempotency({
        reviewId,
        userId: actor.userId,
        operation,
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new TabularError(409, "Idempotency key was already used for a different request");
        }
        return existing.jobId ? existing : this.repositories.runs.ensureRunJob(existing.id);
      }
    }
    const columns = parseColumns(review.columnsConfig);
    if (!columns.length) throw new TabularError(400, "No columns configured");
    const documents = await this.repositories.reviews.listReviewDocuments(review.id);
    if (!(await this.policy.allowsReviewDocuments(review, documents, actor))) {
      throw new TabularError(404, "Review not found");
    }
    const cells = await this.repositories.cells.listCells(review.id);
    let request: TabularRunRequest;
    if (input.target.kind === "cell") {
      const target = input.target;
      const column = columns.find(({ index }) => index === target.columnIndex);
      if (!column) throw new TabularError(400, "Column not found");
      if (!documents.some(({ id }) => id === target.documentId)) {
        throw new TabularError(404, "Document not found");
      }
      if (
        !cells.some(
          (cell) =>
            cell.documentId === target.documentId && cell.columnIndex === target.columnIndex,
        )
      ) {
        throw new TabularError(404, "Cell not found");
      }
      request = {
        operation: "regenerate-cell",
        sourceDocumentIds: documents.map(({ id }) => id),
        documentId: target.documentId,
        column,
        requestedModel: input.model ?? null,
      };
    } else {
      const targets = documents.flatMap((document) => {
        const indexes = columns
          .filter((column) => {
            const cell = cells.find(
              (candidate) =>
                candidate.documentId === document.id && candidate.columnIndex === column.index,
            );
            return !cell || cell.status !== "done" || !cell.content;
          })
          .map(({ index }) => index);
        return indexes.length ? [{ documentId: document.id, columnIndexes: indexes }] : [];
      });
      const neededIndexes = new Set(targets.flatMap(({ columnIndexes }) => columnIndexes));
      request = {
        operation: "generate",
        sourceDocumentIds: documents.map(({ id }) => id),
        columns: columns.filter(({ index }) => neededIndexes.has(index)),
        targets,
        requestedModel: input.model ?? null,
      };
    }
    const targetCount =
      request.operation === "generate"
        ? request.targets.reduce((count, target) => count + target.columnIndexes.length, 0)
        : 1;
    try {
      this.usagePolicy.assertTabularRequest(
        request.operation === "generate" ? request.targets.length : 1,
        targetCount,
      );
    } catch (error) {
      if (error instanceof UsagePolicyError) throw new TabularError(429, error.message);
      throw error;
    }
    const idempotencyKey = input.idempotencyKey ?? randomUUID();
    let result;
    try {
      result = await this.repositories.runs.createOrGetRun({
        reviewId,
        userId: actor.userId,
        idempotencyKey,
        request,
        requestHash,
      });
    } catch (error) {
      if (
        error instanceof TabularRunConflictError ||
        error instanceof TabularActiveRunConflictError
      ) {
        throw new TabularError(409, error.message);
      }
      throw error;
    }
    if (!result.created && result.run.requestHash !== requestHash) {
      throw new TabularError(409, "Idempotency key was already used for a different request");
    }
    return result.run.jobId ? result.run : this.repositories.runs.ensureRunJob(result.run.id);
  }

  async latestRun(
    actor: TabularActor,
    reviewId: string,
    operation: TabularRunOperation,
  ): Promise<TabularRun> {
    await this.requireReview(actor, reviewId, "read");
    const run = await this.repositories.runs.findLatestRun(reviewId, actor.userId, operation);
    if (!run) throw new TabularError(404, "Tabular run not found");
    return run;
  }

  async cancelRun(
    actor: TabularActor,
    reviewId: string,
    operation: TabularRunOperation,
    runId?: string,
  ): Promise<TabularRun> {
    const capability = operation === "generate" ? "generateCells" : "regenerateCell";
    await this.requireReview(actor, reviewId, capability);
    const run = runId
      ? await this.repositories.runs.findRun(runId, reviewId, actor.userId)
      : await this.repositories.runs.findLatestRun(reviewId, actor.userId, operation);
    if (!run || run.operation !== operation) throw new TabularError(404, "Tabular run not found");
    if (!isTerminal(run.status)) {
      await this.repositories.runs.cancelRun(run.id);
      if (run.jobId) await this.queue.cancelJob(run.jobId);
    }
    const current = await this.repositories.runs.findRun(run.id, reviewId, actor.userId);
    if (!current) throw new TabularError(404, "Tabular run not found");
    return current;
  }

  async waitForCell(
    actor: TabularActor,
    reviewId: string,
    runId: string,
    signal: AbortSignal,
  ): Promise<TabularCellResult> {
    let result: TabularCellResult | undefined;
    const terminal = await this.streamRun(actor, reviewId, {
      runId,
      operation: "regenerate-cell",
      afterSequence: 0,
      signal,
      onEvent(event, _sequence, errorKind) {
        if (event.type !== "cell_update" || event.status === "generating" || !event.content) return;
        const content = parseCellResult(event.content);
        if (event.status === "error") {
          throw new TabularError(regenerateErrorStatus(errorKind), content.reasoning);
        }
        result = content;
      },
    });
    if (terminal.kind === "failed") throw new TabularError(502, terminal.error);
    if (terminal.kind === "cancelled") throw new TabularError(409, "Tabular run cancelled");
    if (terminal.kind === "disconnected") throw new TabularError(499, "Client disconnected");
    if (!result) throw new TabularError(500, "Generation failed");
    return result;
  }

  async streamRun(
    actor: TabularActor,
    reviewId: string,
    input: {
      runId?: string;
      operation: TabularRunOperation;
      afterSequence: number;
      signal: AbortSignal;
      onEvent: (
        event: PersistedTabularEvent,
        sequence: number,
        errorKind: TabularCellErrorKind | null,
      ) => void;
    },
  ): Promise<StreamResult> {
    await this.requireReview(actor, reviewId, "read");
    let run = input.runId
      ? await this.repositories.runs.findRun(input.runId, reviewId, actor.userId)
      : await this.repositories.runs.findLatestRun(reviewId, actor.userId, input.operation);
    if (!run || run.operation !== input.operation) {
      throw new TabularError(404, "Tabular run not found");
    }
    let sequence = input.afterSequence;
    while (!input.signal.aborted) {
      const events = await this.repositories.runs.listRunEvents(run.id, sequence);
      for (const record of events) {
        input.onEvent(record.event, record.sequence, record.errorKind);
        sequence = record.sequence;
      }
      run = await this.repositories.runs.findRun(run.id, reviewId, actor.userId);
      if (!run) throw new TabularError(404, "Tabular run not found");
      if (isTerminal(run.status)) {
        const finalEvents = await this.repositories.runs.listRunEvents(run.id, sequence);
        for (const record of finalEvents) {
          input.onEvent(record.event, record.sequence, record.errorKind);
        }
        if (run.status === "completed") return { kind: "completed" };
        if (run.status === "failed") {
          return { kind: "failed", error: run.error ?? "Tabular generation failed" };
        }
        return { kind: "cancelled" };
      }
      await this.wait(250, input.signal);
    }
    return { kind: "disconnected" };
  }

  private async allowedDocuments(
    ids: readonly string[],
    actor: TabularActor,
    projectId?: string,
  ): Promise<readonly string[]> {
    const allowed = await this.dependencies.filterAccessibleDocumentIds(
      ids,
      actor.userId,
      actor.email,
    );
    const allowedSet = new Set(allowed);
    const ordered = ids.filter((id, index) => allowedSet.has(id) && ids.indexOf(id) === index);
    if (projectId) {
      const documents = await this.repositories.reviews.findDocuments(ordered);
      const inProject = new Set(
        documents
          .filter((document) => document.projectId === projectId)
          .map((document) => document.id),
      );
      return ordered.filter((id) => inProject.has(id));
    }
    return ordered;
  }

  private async requireReview(
    actor: TabularActor,
    reviewId: string,
    capability: keyof ReviewCapabilities,
  ): Promise<TabularReview> {
    return (await this.requireReviewWithRole(actor, reviewId, capability)).review;
  }

  private async requireReviewWithRole(
    actor: TabularActor,
    reviewId: string,
    capability: keyof ReviewCapabilities,
  ): Promise<{ review: TabularReview; role: string }> {
    const review = await this.repositories.reviews.findReview(reviewId);
    if (!review) throw new TabularError(404, "Review not found");
    const role = await this.policy.roleFor(review, actor);
    if (!role) throw new TabularError(404, "Review not found");
    if (!getReviewCapabilities(role)[capability]) {
      throw new TabularError(403, capabilityError(capability));
    }
    return { review, role };
  }
}

function parseColumns(value: unknown): readonly TabularColumn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const index = Reflect.get(entry, "index");
    const name = Reflect.get(entry, "name");
    const prompt = Reflect.get(entry, "prompt");
    const format = Reflect.get(entry, "format");
    const tags = Reflect.get(entry, "tags");
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      typeof name !== "string" ||
      typeof prompt !== "string" ||
      (format !== undefined && typeof format !== "string") ||
      (tags !== undefined &&
        (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")))
    ) {
      return [];
    }
    return [
      {
        index,
        name,
        prompt,
        ...(format === undefined ? {} : { format }),
        ...(tags === undefined ? {} : { tags }),
      },
    ];
  });
}

function hashRequestIntent(
  target:
    | Readonly<{ kind: "review" }>
    | Readonly<{ kind: "cell"; documentId: string; columnIndex: number }>,
  model: string | undefined,
): string {
  return createHash("sha256")
    .update(JSON.stringify({ target, requestedModel: model ?? null }))
    .digest("hex");
}

function isTerminal(status: TabularRun["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function parseCellResult(value: unknown): TabularCellResult {
  if (!value || typeof value !== "object") throw new TabularError(500, "Generation failed");
  const summary = Reflect.get(value, "summary");
  const flag = Reflect.get(value, "flag");
  const reasoning = Reflect.get(value, "reasoning");
  if (
    typeof summary !== "string" ||
    (flag !== "green" && flag !== "grey" && flag !== "yellow" && flag !== "red") ||
    typeof reasoning !== "string"
  ) {
    throw new TabularError(500, "Generation failed");
  }
  return { summary, flag, reasoning };
}

function regenerateErrorStatus(errorKind: TabularCellErrorKind | null): number {
  if (errorKind === "extraction" || errorKind === "unsupported-inline-pdf") return 422;
  if (errorKind === "missing-model-result") return 500;
  return 502;
}

function capabilityError(capability: keyof ReviewCapabilities): string {
  if (capability === "read") return "You do not have permission to read this review";
  if (capability === "useOwnChats") {
    return "You do not have permission to use chats for this review";
  }
  if (capability === "deleteReview") {
    return "You do not have permission to delete this review";
  }
  return "You do not have permission to modify this review";
}

function waitForPoll(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
