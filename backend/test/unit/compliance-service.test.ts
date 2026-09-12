import { describe, expect, it, vi } from "vitest";
import type { QueueRepository } from "../../src/jobs/types.js";
import type { AccessAuthority } from "../../src/modules/access/access.authority.js";
import { UsagePolicyService } from "../../src/modules/ai/usagePolicy.js";
import { ComplianceAuthorizationPolicy } from "../../src/modules/compliance/compliance.policy.js";
import type { ComplianceRepository } from "../../src/modules/compliance/compliance.repository.js";
import { ComplianceService } from "../../src/modules/compliance/compliance.service.js";
import type {
  ComplianceReview,
  ComplianceRun,
} from "../../src/modules/compliance/compliance.types.js";
import { stubAccessAuthority } from "./access-test-helpers.js";

const actor = { userId: "user-1", email: "user@example.com" };
const review: ComplianceReview = {
  id: "review-1",
  userId: actor.userId,
  projectId: null,
  workspaceId: null,
  primaryDocumentId: "document-1",
  title: "Review",
  status: "pending",
  complianceScore: null,
  results: null,
  aiInsights: null,
  ragCollectionName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function repository(overrides: Partial<ComplianceRepository> = {}): ComplianceRepository {
  const base: ComplianceRepository = {
    findDocuments: async () => [],
    listReviews: async () => [],
    findReview: async () => review,
    createReview: async () => review,
    updateReviewTitle: async () => review,
    deleteReview: async () => true,
    getDetails: async (value) => ({
      review: value,
      primaryDocument: { id: "document-1", filename: "contract.docx", fileType: "docx" },
      supportingDocs: [],
      rules: [],
      questions: [],
    }),
    getWorkspaceName: async () => "Workspace",
    workspaceHasContent: async () => true,
    addSupportingDocument: async () => ({}),
    removeSupportingDocument: async () => undefined,
    addRule: async () => {
      throw new Error("unused");
    },
    updateRule: async () => null,
    deleteRule: async () => undefined,
    addQuestion: async () => {
      throw new Error("unused");
    },
    updateQuestion: async () => null,
    deleteQuestion: async () => undefined,
    loadRunInput: async (value) => ({
      review: value,
      primaryDocument: { id: "document-1", filename: "contract.docx", fileType: "docx" },
      supportingDocs: [],
      rules: [
        {
          id: "rule-1",
          reviewId: value.id,
          content: "Rule",
          status: "pending",
          result: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      questions: [],
      workspaceFiles: [],
      workspaceDocuments: [],
    }),
    createOrGetRun: async ({ reviewId, userId, idempotencyKey }) => ({
      id: "run-1",
      reviewId,
      userId,
      jobId: null,
      idempotencyKey,
      status: "queued",
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      cancelledAt: null,
    }),
    attachRunJob: async () => undefined,
    findLatestRun: async () => null,
    findRun: async () => null,
    markRunRunning: async () => undefined,
    failReviewRun: async () => true,
    markRunCancelled: async () => true,
    isRunCancelled: async () => false,
    appendRunEvent: async () => 1,
    listRunEvents: async () => [],
    updateRuleResult: async () => undefined,
    updateQuestionResult: async () => undefined,
    completeReviewRun: async () => true,
  };
  return Object.assign(base, overrides);
}

function service(
  complianceRepository: ComplianceRepository,
  queue: Pick<QueueRepository, "enqueueJob" | "cancelJob">,
  authority: AccessAuthority = stubAccessAuthority(),
): ComplianceService {
  return new ComplianceService(
    complianceRepository,
    new ComplianceAuthorizationPolicy(
      async () => [
        {
          id: "document-1",
          userId: actor.userId,
          projectId: null,
          workspaceId: null,
          filename: "contract.docx",
          fileType: "docx",
        },
      ],
      authority,
    ),
    authority,
    queue,
    new UsagePolicyService(),
  );
}

describe("ComplianceService", () => {
  it.each([
    ["read", (instance: ComplianceService) => instance.getReview(actor, review.id)],
    ["edit", (instance: ComplianceService) => instance.updateReview(actor, review.id, "Updated")],
    ["run", (instance: ComplianceService) => instance.enqueueRun(actor, review.id, {})],
  ] as const)("hides denied compliance review %s actions", async (action, invoke) => {
    const findReview = vi.fn(async () => review);
    const authority = stubAccessAuthority(() => null);
    const decide = vi.spyOn(authority, "decide");
    const instance = service(
      repository({ findReview }),
      { enqueueJob: vi.fn(), cancelJob: vi.fn() },
      authority,
    );

    await expect(invoke(instance)).rejects.toMatchObject({ status: 404 });
    expect(decide).toHaveBeenCalledWith({
      actor,
      resource: { kind: "compliance-review", id: review.id },
      action,
    });
    expect(findReview).not.toHaveBeenCalled();
  });

  it("keeps document lookup read-only when no review exists", async () => {
    const createReview = vi.fn();
    const instance = service(
      repository({
        listReviews: async () => [],
        createReview,
      }),
      { enqueueJob: vi.fn(), cancelJob: vi.fn() },
    );

    await expect(instance.getReviewForDocument(actor, "document-1")).rejects.toMatchObject({
      status: 404,
    });
    expect(createReview).not.toHaveBeenCalled();
  });

  it("enqueues a stable job payload and attaches it to the run", async () => {
    const attachRunJob = vi.fn();
    const enqueueJob = vi.fn(async () => "job-1");
    const instance = service(repository({ attachRunJob }), {
      enqueueJob,
      cancelJob: vi.fn(),
    });

    const run = await instance.enqueueRun(actor, review.id, {
      idempotencyKey: "request-1",
      model: "model-1",
    });

    expect(run.jobId).toBe("job-1");
    expect(enqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "compliance.run",
        idempotencyKey: "compliance:user-1:review-1:request-1",
        payload: expect.objectContaining({ runId: "run-1", requestedModel: "model-1" }),
      }),
    );
    expect(attachRunJob).toHaveBeenCalledWith("run-1", "job-1");
  });

  it("replays durable events and terminates from persisted run state", async () => {
    const completedRun: ComplianceRun = {
      id: "run-1",
      reviewId: review.id,
      userId: actor.userId,
      jobId: "job-1",
      idempotencyKey: "request-1",
      status: "completed",
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
      cancelledAt: null,
    };
    const instance = service(
      repository({
        findRun: async () => completedRun,
        listRunEvents: async (_runId, afterSequence) =>
          [
            { sequence: 1, event: { type: "status" as const, status: "running" as const } },
            { sequence: 2, event: { type: "status" as const, status: "completed" as const } },
          ].filter(({ sequence }) => sequence > afterSequence),
      }),
      { enqueueJob: vi.fn(), cancelJob: vi.fn() },
    );
    const events: unknown[] = [];

    await expect(
      instance.streamRun(actor, review.id, {
        runId: completedRun.id,
        afterSequence: 0,
        signal: new AbortController().signal,
        onEvent: (event, sequence) => events.push({ event, sequence }),
      }),
    ).resolves.toEqual({ kind: "completed" });
    expect(events).toEqual([
      { event: { type: "status", status: "running" }, sequence: 1 },
      { event: { type: "status", status: "completed" }, sequence: 2 },
    ]);
  });

  it("drains events persisted with the terminal run update", async () => {
    const completedRun: ComplianceRun = {
      id: "run-1",
      reviewId: review.id,
      userId: actor.userId,
      jobId: "job-1",
      idempotencyKey: "request-1",
      status: "completed",
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
      cancelledAt: null,
    };
    let reads = 0;
    const listRunEvents = vi.fn(async () => {
      reads += 1;
      return reads === 1
        ? []
        : [{ sequence: 1, event: { type: "status" as const, status: "completed" as const } }];
    });
    const instance = service(
      repository({
        findRun: async () => completedRun,
        listRunEvents,
      }),
      { enqueueJob: vi.fn(), cancelJob: vi.fn() },
    );
    const events: unknown[] = [];

    await expect(
      instance.streamRun(actor, review.id, {
        runId: completedRun.id,
        afterSequence: 0,
        signal: new AbortController().signal,
        onEvent: (event, sequence) => events.push({ event, sequence }),
      }),
    ).resolves.toEqual({ kind: "completed" });
    expect(listRunEvents).toHaveBeenCalledTimes(2);
    expect(events).toEqual([{ event: { type: "status", status: "completed" }, sequence: 1 }]);
  });

  it("cancels the requested durable job and compliance run", async () => {
    const queuedRun: ComplianceRun = {
      id: "run-1",
      reviewId: review.id,
      userId: actor.userId,
      jobId: "job-1",
      idempotencyKey: "request-1",
      status: "queued",
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      cancelledAt: null,
    };
    const cancelJob = vi.fn(async () => true);
    const markRunCancelled = vi.fn(async () => true);
    const findRun = vi
      .fn()
      .mockResolvedValueOnce(queuedRun)
      .mockResolvedValueOnce({ ...queuedRun, status: "cancelled", cancelledAt: new Date() });
    const instance = service(
      repository({
        findRun,
        markRunCancelled,
      }),
      { enqueueJob: vi.fn(), cancelJob },
    );

    await expect(instance.cancelRun(actor, review.id, queuedRun.id)).resolves.toMatchObject({
      status: "cancelled",
    });
    expect(cancelJob).toHaveBeenCalledWith("job-1");
    expect(markRunCancelled).toHaveBeenCalledWith("run-1");
    expect(findRun).toHaveBeenNthCalledWith(1, "run-1", review.id, actor.userId);
  });

  it("does not cancel the latest run when a supplied run id is unknown", async () => {
    const findLatestRun = vi.fn(async () => {
      throw new Error("latest run lookup must not be used");
    });
    const cancelJob = vi.fn();
    const markRunCancelled = vi.fn();
    const instance = service(
      repository({
        findLatestRun,
        findRun: async () => null,
        markRunCancelled,
      }),
      { enqueueJob: vi.fn(), cancelJob },
    );

    await expect(instance.cancelRun(actor, review.id, "missing-run")).rejects.toMatchObject({
      status: 404,
    });
    expect(findLatestRun).not.toHaveBeenCalled();
    expect(cancelJob).not.toHaveBeenCalled();
    expect(markRunCancelled).not.toHaveBeenCalled();
  });
});
