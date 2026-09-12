import { randomUUID } from "node:crypto";
import type { QueueRepository } from "../../jobs/types.js";
import type { AccessAuthority } from "../access/access.authority.js";
import { UsagePolicyError, UsagePolicyService } from "../ai/usagePolicy.js";
import { ComplianceAuthorizationPolicy, getComplianceScope } from "./compliance.policy.js";
import type { ComplianceRepository } from "./compliance.repository.js";
import {
  ComplianceError,
  type ComplianceActor,
  type ComplianceReview,
  type ComplianceReviewDetails,
  type ComplianceRun,
  type PersistedComplianceEvent,
} from "./compliance.types.js";

type StreamResult =
  | Readonly<{ kind: "completed" }>
  | Readonly<{ kind: "failed"; error: string }>
  | Readonly<{ kind: "cancelled" }>
  | Readonly<{ kind: "disconnected" }>;

export class ComplianceService {
  constructor(
    private readonly repository: ComplianceRepository,
    private readonly policy: ComplianceAuthorizationPolicy,
    private readonly authority: AccessAuthority,
    private readonly queue: Pick<QueueRepository, "enqueueJob" | "cancelJob">,
    private readonly usagePolicy: UsagePolicyService,
    private readonly wait: (milliseconds: number, signal: AbortSignal) => Promise<void> = (
      milliseconds,
      signal,
    ) =>
      new Promise((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        const timer = setTimeout(resolve, milliseconds);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      }),
  ) {}

  async createReview(
    actor: ComplianceActor,
    input: {
      primaryDocumentId?: string;
      title?: string;
      projectId?: string;
      workspaceId?: string;
    },
  ): Promise<ComplianceReview> {
    const scope = getComplianceScope(input.projectId, input.workspaceId);
    if (!scope) throw new ComplianceError(400, "project_id and workspace_id cannot be combined");
    if (!(await this.policy.allowsScope(scope, actor, "write"))) {
      throw new ComplianceError(404, "Review scope not found");
    }
    if (
      input.primaryDocumentId &&
      !(await this.policy.allowsDocuments([input.primaryDocumentId], scope, actor, "write"))
    ) {
      throw new ComplianceError(404, "Document not found");
    }
    if (!input.primaryDocumentId && scope.kind !== "workspace") {
      throw new ComplianceError(400, "primary_document_id is required");
    }
    if (
      scope.kind === "workspace" &&
      !(await this.repository.workspaceHasContent(scope.workspaceId))
    ) {
      throw new ComplianceError(
        400,
        "Workspace has no files. Please upload files to the workspace first.",
      );
    }
    const title =
      input.title ??
      (scope.kind === "workspace"
        ? await this.repository.getWorkspaceName(scope.workspaceId)
        : null);
    return this.repository.createReview({
      userId: actor.userId,
      primaryDocumentId: input.primaryDocumentId ?? null,
      title,
      projectId: input.projectId ?? null,
      workspaceId: input.workspaceId ?? null,
    });
  }

  async listReviews(
    actor: ComplianceActor,
    scope: Readonly<{ projectId?: string; workspaceId?: string }>,
  ): Promise<readonly ComplianceReview[]> {
    const reviews = await this.repository.listReviews(scope);
    const decisions = await Promise.all(
      reviews.map((review) =>
        this.authority.decide({
          actor,
          resource: { kind: "compliance-review", id: review.id },
          action: "read",
        }),
      ),
    );
    return reviews.filter((_review, index) => decisions[index].allowed);
  }

  async getReview(actor: ComplianceActor, reviewId: string): Promise<ComplianceReviewDetails> {
    const review = await this.requireReview(actor, reviewId, "read");
    return this.repository.getDetails(review);
  }

  async getReviewForDocument(
    actor: ComplianceActor,
    documentId: string,
  ): Promise<ComplianceReviewDetails> {
    if (!(await this.policy.allowsDocuments([documentId], { kind: "document" }, actor, "read"))) {
      throw new ComplianceError(404, "Document not found");
    }
    const reviews = await this.repository.listReviews({ primaryDocumentId: documentId });
    const review = await this.firstAllowedReview(actor, reviews);
    if (!review) throw new ComplianceError(404, "Review not found");
    return this.repository.getDetails(review);
  }

  async getReviewForWorkspace(
    actor: ComplianceActor,
    workspaceId: string,
  ): Promise<ComplianceReviewDetails> {
    const scope = { kind: "workspace", workspaceId } as const;
    if (!(await this.policy.allowsScope(scope, actor, "read"))) {
      throw new ComplianceError(404, "Workspace not found or access denied");
    }
    const reviews = await this.repository.listReviews({ workspaceId });
    const review = await this.firstAllowedReview(actor, reviews);
    if (!review) throw new ComplianceError(404, "Review not found");
    return this.repository.getDetails(review);
  }

  async updateReview(
    actor: ComplianceActor,
    reviewId: string,
    title: string | undefined,
  ): Promise<ComplianceReview> {
    const review = await this.requireReview(actor, reviewId, "edit");
    if (title === undefined) return review;
    const updated = await this.repository.updateReviewTitle(reviewId, title || null);
    if (!updated) throw new ComplianceError(404, "Review not found");
    return updated;
  }

  async deleteReview(actor: ComplianceActor, reviewId: string): Promise<void> {
    await this.requireReview(actor, reviewId, "edit");
    if (!(await this.repository.deleteReview(reviewId))) {
      throw new ComplianceError(404, "Review not found");
    }
  }

  async addSupportingDocument(
    actor: ComplianceActor,
    reviewId: string,
    documentId: string,
  ): Promise<unknown> {
    const review = await this.requireReview(actor, reviewId, "edit");
    const scope = getComplianceScope(review.projectId, review.workspaceId);
    if (!scope || !(await this.policy.allowsDocuments([documentId], scope, actor, "write"))) {
      throw new ComplianceError(404, "Document not found");
    }
    return this.repository.addSupportingDocument(reviewId, documentId);
  }

  async removeSupportingDocument(
    actor: ComplianceActor,
    reviewId: string,
    documentId: string,
  ): Promise<void> {
    await this.requireReview(actor, reviewId, "edit");
    await this.repository.removeSupportingDocument(reviewId, documentId);
  }

  async addRule(actor: ComplianceActor, reviewId: string, content: string): Promise<unknown> {
    await this.requireReview(actor, reviewId, "edit");
    return this.repository.addRule(reviewId, content);
  }

  async updateRule(
    actor: ComplianceActor,
    reviewId: string,
    ruleId: string,
    content: string | undefined,
  ): Promise<unknown> {
    await this.requireReview(actor, reviewId, "edit");
    const rule = await this.repository.updateRule(reviewId, ruleId, content);
    if (!rule) throw new ComplianceError(404, "Rule not found");
    return rule;
  }

  async deleteRule(actor: ComplianceActor, reviewId: string, ruleId: string): Promise<void> {
    await this.requireReview(actor, reviewId, "edit");
    await this.repository.deleteRule(reviewId, ruleId);
  }

  async addQuestion(actor: ComplianceActor, reviewId: string, content: string): Promise<unknown> {
    await this.requireReview(actor, reviewId, "edit");
    return this.repository.addQuestion(reviewId, content);
  }

  async updateQuestion(
    actor: ComplianceActor,
    reviewId: string,
    questionId: string,
    content: string | undefined,
  ): Promise<unknown> {
    await this.requireReview(actor, reviewId, "edit");
    const question = await this.repository.updateQuestion(reviewId, questionId, content);
    if (!question) throw new ComplianceError(404, "Question not found");
    return question;
  }

  async deleteQuestion(
    actor: ComplianceActor,
    reviewId: string,
    questionId: string,
  ): Promise<void> {
    await this.requireReview(actor, reviewId, "edit");
    await this.repository.deleteQuestion(reviewId, questionId);
  }

  async enqueueRun(
    actor: ComplianceActor,
    reviewId: string,
    input: Readonly<{ idempotencyKey?: string; model?: string }>,
  ): Promise<ComplianceRun> {
    const review = await this.requireReview(actor, reviewId, "run");
    const runInput = await this.repository.loadRunInput(review);
    const scope = getComplianceScope(review.projectId, review.workspaceId);
    const documentIds = runInput.supportingDocs.map(({ documentId }) => documentId);
    if (review.primaryDocumentId) documentIds.push(review.primaryDocumentId);
    if (!scope || !(await this.policy.allowsDocuments(documentIds, scope, actor, "write"))) {
      throw new ComplianceError(404, "Review not found");
    }
    if (runInput.rules.length === 0 && runInput.questions.length === 0) {
      throw new ComplianceError(400, "Add at least one rule or question before running");
    }
    if (!runInput.workspaceFiles.length && !runInput.workspaceDocuments.length) {
      if (!runInput.primaryDocument) throw new ComplianceError(404, "Primary document not found");
    }
    try {
      this.usagePolicy.createComplianceReviewBudget(
        runInput.rules.length,
        runInput.questions.length,
      );
    } catch (error) {
      if (error instanceof UsagePolicyError) throw new ComplianceError(429, error.message);
      throw error;
    }
    const key = input.idempotencyKey ?? randomUUID();
    const run = await this.repository.createOrGetRun({
      reviewId,
      userId: actor.userId,
      idempotencyKey: key,
    });
    if (run.jobId || run.status !== "queued") return run;
    const jobId = await this.queue.enqueueJob({
      kind: "compliance.run",
      payload: {
        runId: run.id,
        reviewId,
        userId: actor.userId,
        requestedModel: input.model ?? null,
      },
      idempotencyKey: `compliance:${actor.userId}:${reviewId}:${key}`,
      actorUserId: actor.userId,
      maxAttempts: 3,
    });
    await this.repository.attachRunJob(run.id, jobId);
    return { ...run, jobId };
  }

  async latestRun(actor: ComplianceActor, reviewId: string): Promise<ComplianceRun> {
    await this.requireReview(actor, reviewId, "read");
    const run = await this.repository.findLatestRun(reviewId, actor.userId);
    if (!run) throw new ComplianceError(404, "Compliance run not found");
    return run;
  }

  async cancelRun(
    actor: ComplianceActor,
    reviewId: string,
    runId?: string,
  ): Promise<ComplianceRun> {
    await this.requireReview(actor, reviewId, "run");
    const run = runId
      ? await this.repository.findRun(runId, reviewId, actor.userId)
      : await this.repository.findLatestRun(reviewId, actor.userId);
    if (!run) throw new ComplianceError(404, "Compliance run not found");
    if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
      return run;
    }
    if (run.jobId) await this.queue.cancelJob(run.jobId);
    await this.repository.markRunCancelled(run.id);
    const cancelled = await this.repository.findRun(run.id, reviewId, actor.userId);
    if (!cancelled) throw new ComplianceError(404, "Compliance run not found");
    return cancelled;
  }

  async streamRun(
    actor: ComplianceActor,
    reviewId: string,
    input: {
      runId?: string;
      afterSequence: number;
      signal: AbortSignal;
      onEvent: (event: PersistedComplianceEvent, sequence: number) => void;
    },
  ): Promise<StreamResult> {
    await this.requireReview(actor, reviewId, "read");
    let run = input.runId
      ? await this.repository.findRun(input.runId, reviewId, actor.userId)
      : await this.repository.findLatestRun(reviewId, actor.userId);
    if (!run) throw new ComplianceError(404, "Compliance run not found");
    let sequence = input.afterSequence;
    while (!input.signal.aborted) {
      const events = await this.repository.listRunEvents(run.id, sequence);
      for (const record of events) {
        input.onEvent(record.event, record.sequence);
        sequence = record.sequence;
      }
      run = await this.repository.findRun(run.id, reviewId, actor.userId);
      if (!run) throw new ComplianceError(404, "Compliance run not found");
      if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
        const finalEvents = await this.repository.listRunEvents(run.id, sequence);
        for (const record of finalEvents) {
          input.onEvent(record.event, record.sequence);
        }
        if (run.status === "completed") return { kind: "completed" };
        if (run.status === "failed") {
          return { kind: "failed", error: run.error ?? "Compliance review failed" };
        }
        return { kind: "cancelled" };
      }
      await this.wait(250, input.signal);
    }
    return { kind: "disconnected" };
  }

  private async requireReview(
    actor: ComplianceActor,
    reviewId: string,
    action: "read" | "edit" | "run",
  ): Promise<ComplianceReview> {
    const decision = await this.authority.decide({
      actor,
      resource: { kind: "compliance-review", id: reviewId },
      action,
    });
    if (!decision.allowed) {
      throw new ComplianceError(404, "Review not found");
    }
    const review = await this.repository.findReview(reviewId);
    if (!review) throw new ComplianceError(404, "Review not found");
    return review;
  }

  private async firstAllowedReview(
    actor: ComplianceActor,
    reviews: readonly ComplianceReview[],
  ): Promise<ComplianceReview | null> {
    for (const review of reviews) {
      const decision = await this.authority.decide({
        actor,
        resource: { kind: "compliance-review", id: review.id },
        action: "read",
      });
      if (decision.allowed) return review;
    }
    return null;
  }
}
