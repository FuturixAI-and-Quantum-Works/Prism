import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { QueueRepository } from "../../src/jobs/types.js";
import { UsagePolicyService } from "../../src/modules/ai/usagePolicy.js";
import type { TabularCellRepository } from "../../src/modules/tabular/tabular.cell.repository.js";
import type { TabularChatRepository } from "../../src/modules/tabular/tabular.chat.repository.js";
import { TabularAuthorizationPolicy } from "../../src/modules/tabular/tabular.policy.js";
import type { TabularReviewRepository } from "../../src/modules/tabular/tabular.review.repository.js";
import type { TabularRunRepository } from "../../src/modules/tabular/tabular.run.repository.js";
import {
  TabularService,
  type TabularServiceRepositories,
} from "../../src/modules/tabular/tabular.service.js";
import {
  TabularActiveRunConflictError,
  type TabularReview,
  type TabularRun,
} from "../../src/modules/tabular/tabular.types.js";
import { stubAccessAuthority } from "./access-test-helpers.js";

const actor = { userId: "user-1", email: "user@example.com" };
const review: TabularReview = {
  id: "review-1",
  userId: actor.userId,
  projectId: null,
  title: "Review",
  columnsConfig: [{ index: 0, name: "Term", prompt: "Extract the term" }],
};
const queuedRun: TabularRun = {
  id: "run-1",
  reviewId: review.id,
  userId: actor.userId,
  jobId: null,
  idempotencyKey: "request-1",
  operation: "generate",
  request: {
    operation: "generate",
    sourceDocumentIds: ["document-1"],
    columns: [{ index: 0, name: "Term", prompt: "Extract the term" }],
    targets: [{ documentId: "document-1", columnIndexes: [0] }],
    requestedModel: "model-1",
  },
  requestHash: "",
  status: "queued",
  error: null,
  executionEpoch: 0,
  nextSequence: 1,
  usedModelCalls: 0,
  usedOutputTokens: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  cancelledAt: null,
};

type TestTabularRepository = TabularReviewRepository &
  TabularCellRepository &
  TabularChatRepository &
  TabularRunRepository;

function repository(overrides: Partial<TestTabularRepository> = {}): TestTabularRepository {
  const base: TestTabularRepository = {
    findReview: async () => review,
    listCells: async () => [],
    findCell: async () => ({
      id: "cell-1",
      reviewId: review.id,
      documentId: "document-1",
      columnIndex: 0,
      content: null,
      status: "pending",
      activeRunId: null,
      activeRunEpoch: null,
    }),
    listReviewDocuments: async () => [
      {
        id: "document-1",
        userId: actor.userId,
        projectId: null,
        filename: "contract.pdf",
        fileType: "pdf",
      },
    ],
    createOrGetRun: async (input) => ({
      run: {
        ...queuedRun,
        jobId: "job-1",
        request: input.request,
        requestHash: input.requestHash,
      },
      created: true,
    }),
    findRunByIdempotency: async () => null,
    ensureRunJob: async (runId) => ({ ...queuedRun, id: runId, jobId: "job-1" }),
    findRun: async () => null,
    findLatestRun: async () => null,
    claimRun: async () => null,
    completeRun: async () => true,
    failRun: async () => true,
    failActiveRun: async () => true,
    cancelRun: async () => true,
    isRunCancelled: async () => false,
    reserveUsage: async () => true,
    appendRunEvent: async () => 1,
    listRunEvents: async () => [],
    markCellGenerating: async () => true,
    completeCell: async () => true,
    listVisibleReviews: async () => [],
    createReview: async () => ({}),
    updateReview: async () => ({}),
    deleteReview: async () => undefined,
    reviewDetails: async () => ({}),
    reviewPeople: async () => ({}),
    clearCells: async () => undefined,
    sourceBelongsToReview: async () => true,
    findDocuments: async () => [],
    findDocument: async () => null,
    findUserEmail: async () => actor.email,
    listChats: async () => [],
    deleteChat: async () => undefined,
    findOwnedChat: async () => null,
    createChat: async () => ({ id: "chat-1", title: null }),
    listChatMessages: async () => [],
    addChatMessage: async () => undefined,
    updateChat: async () => undefined,
  };
  return Object.assign(base, overrides);
}

function service(
  tabularRepository: TestTabularRepository,
  queue: Pick<QueueRepository, "cancelJob">,
  usagePolicy = new UsagePolicyService(),
  policy = new TabularAuthorizationPolicy(stubAccessAuthority()),
): TabularService {
  const repositories: TabularServiceRepositories = {
    reviews: tabularRepository,
    cells: tabularRepository,
    chats: tabularRepository,
    runs: tabularRepository,
  };
  return new TabularService(repositories, policy, queue, usagePolicy, {
    filterAccessibleDocumentIds: async (ids) => ids,
    generatePrompt: async () => "Prompt",
    streamChat: async () => undefined,
  });
}

describe("TabularService", () => {
  it("returns the atomically persisted run job", async () => {
    const instance = service(repository(), { cancelJob: vi.fn() });
    await expect(
      instance.enqueueRun(actor, review.id, {
        idempotencyKey: "request-1",
        model: "model-1",
        target: { kind: "review" },
      }),
    ).resolves.toMatchObject({ id: "run-1", jobId: "job-1" });
  });

  it("does not reconcile an existing run that already has a job", async () => {
    const ensureRunJob = vi.fn();
    const instance = service(
      repository({
        ensureRunJob,
        createOrGetRun: async (input) => ({
          run: {
            ...queuedRun,
            jobId: "job-1",
            request: input.request,
            requestHash: input.requestHash,
          },
          created: false,
        }),
      }),
      { cancelJob: vi.fn() },
    );
    await instance.enqueueRun(actor, review.id, {
      idempotencyKey: "request-1",
      target: { kind: "review" },
    });
    expect(ensureRunJob).not.toHaveBeenCalled();
  });

  it("reconciles an existing run whose persisted job link is missing", async () => {
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          target: { kind: "review" },
          requestedModel: "model-1",
        }),
      )
      .digest("hex");
    const stored = { ...queuedRun, jobId: null, requestHash };
    const ensureRunJob = vi.fn(async () => ({ ...stored, jobId: "job-1" }));
    const tabularRepository = repository({
      findRunByIdempotency: async () => stored,
      ensureRunJob,
    });
    const request = {
      idempotencyKey: "request-1",
      model: "model-1",
      target: { kind: "review" as const },
    };
    const recovered = service(tabularRepository, { cancelJob: vi.fn() });
    await expect(recovered.enqueueRun(actor, review.id, request)).resolves.toMatchObject({
      id: "run-1",
      jobId: "job-1",
    });
    expect(ensureRunJob).toHaveBeenCalledWith("run-1");
  });

  it("returns a matching idempotent run before rebuilding its snapshot", async () => {
    let currentReview = review;
    let sourceCount = 1;
    let stored: TabularRun | null = null;
    const listReviewDocuments = vi.fn(async () =>
      Array.from({ length: sourceCount }, (_, index) => ({
        id: `document-${index + 1}`,
        userId: actor.userId,
        projectId: null,
        filename: `contract-${index + 1}.pdf`,
        fileType: "pdf",
      })),
    );
    const createOrGetRun = vi.fn();
    createOrGetRun.mockImplementation(async (input) => {
      stored = {
        ...queuedRun,
        jobId: "job-1",
        request: input.request,
        requestHash: input.requestHash,
      };
      return { run: stored, created: true };
    });
    const instance = service(
      repository({
        findReview: async () => currentReview,
        findRunByIdempotency: async () => stored,
        listReviewDocuments,
        createOrGetRun,
      }),
      { cancelJob: vi.fn() },
    );
    await instance.enqueueRun(actor, review.id, {
      idempotencyKey: "request-1",
      model: "model-1",
      target: { kind: "review" },
    });
    currentReview = { ...review, columnsConfig: [] };
    sourceCount = 65;
    await expect(
      instance.enqueueRun(actor, review.id, {
        idempotencyKey: "request-1",
        model: "model-1",
        target: { kind: "review" },
      }),
    ).resolves.toBe(stored);
    expect(listReviewDocuments).toHaveBeenCalledTimes(1);
    expect(createOrGetRun).toHaveBeenCalledTimes(1);
  });

  it("maps another active review run to conflict", async () => {
    const instance = service(
      repository({
        createOrGetRun: async () => {
          throw new TabularActiveRunConflictError();
        },
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.enqueueRun(actor, review.id, { target: { kind: "review" } }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Another tabular run is already active for this review",
    });
  });

  it("keeps the idempotency hash stable when generated cells change", async () => {
    let listCellsCall = 0;
    let originalRequest: TabularRun["request"] | undefined;
    let originalHash: string | undefined;
    const instance = service(
      repository({
        listCells: async () => {
          listCellsCall += 1;
          return listCellsCall === 1
            ? []
            : [
                {
                  id: "cell-1",
                  reviewId: review.id,
                  documentId: "document-1",
                  columnIndex: 0,
                  content: { summary: "12 months", flag: "green", reasoning: "" },
                  status: "done",
                  activeRunId: null,
                  activeRunEpoch: null,
                },
              ];
        },
        createOrGetRun: async (input) => {
          originalRequest ??= input.request;
          originalHash ??= input.requestHash;
          expect(input.requestHash).toBe(originalHash);
          return {
            run: {
              ...queuedRun,
              jobId: "job-1",
              request: originalRequest,
              requestHash: originalHash,
            },
            created: originalRequest === input.request,
          };
        },
      }),
      { cancelJob: vi.fn() },
    );

    await instance.enqueueRun(actor, review.id, {
      idempotencyKey: "request-1",
      target: { kind: "review" },
    });
    await expect(
      instance.enqueueRun(actor, review.id, {
        idempotencyKey: "request-1",
        target: { kind: "review" },
      }),
    ).resolves.toMatchObject({ id: "run-1" });
  });

  it("rejects an idempotency key reused for a different request", async () => {
    const instance = service(
      repository({
        createOrGetRun: async (input) => ({
          run: { ...queuedRun, request: input.request, requestHash: "different" },
          created: false,
        }),
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.enqueueRun(actor, review.id, {
        idempotencyKey: "request-1",
        target: { kind: "review" },
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("replays ordered events after the requested sequence", async () => {
    const completed = { ...queuedRun, status: "completed" as const, completedAt: new Date() };
    const instance = service(
      repository({
        findRun: async () => completed,
        listRunEvents: async (_runId, after) =>
          [
            {
              sequence: 2,
              errorKind: null,
              event: {
                type: "cell_update" as const,
                document_id: "document-1",
                column_index: 0,
                content: null,
                status: "generating" as const,
              },
            },
            {
              sequence: 3,
              errorKind: null,
              event: {
                type: "cell_update" as const,
                document_id: "document-1",
                column_index: 0,
                content: { summary: "12 months" },
                status: "done" as const,
              },
            },
          ].filter(({ sequence }) => sequence > after),
      }),
      { cancelJob: vi.fn() },
    );
    const events: unknown[] = [];
    await expect(
      instance.streamRun(actor, review.id, {
        runId: completed.id,
        operation: "generate",
        afterSequence: 2,
        signal: new AbortController().signal,
        onEvent: (event) => events.push(event),
      }),
    ).resolves.toEqual({ kind: "completed" });
    expect(events).toEqual([
      {
        type: "cell_update",
        document_id: "document-1",
        column_index: 0,
        content: { summary: "12 months" },
        status: "done",
      },
    ]);
  });

  it("cancels the queue job and persisted run", async () => {
    const cancelJob = vi.fn(async () => true);
    const markRunCancelled = vi.fn(async () => true);
    const instance = service(
      repository({
        findLatestRun: async () => ({ ...queuedRun, jobId: "job-1" }),
        findRun: async () => ({
          ...queuedRun,
          jobId: "job-1",
          status: "cancelled",
          cancelledAt: new Date(),
        }),
        cancelRun: markRunCancelled,
      }),
      { cancelJob },
    );
    await expect(instance.cancelRun(actor, review.id, "generate")).resolves.toMatchObject({
      status: "cancelled",
    });
    expect(cancelJob).toHaveBeenCalledWith("job-1");
    expect(markRunCancelled).toHaveBeenCalledWith("run-1");
  });

  it("stops replay on disconnect without cancelling the job", async () => {
    const cancelRun = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const instance = service(repository({ findRun: async () => queuedRun, cancelRun }), {
      cancelJob: vi.fn(),
    });
    await expect(
      instance.streamRun(actor, review.id, {
        runId: queuedRun.id,
        operation: "generate",
        afterSequence: 0,
        signal: controller.signal,
        onEvent: vi.fn(),
      }),
    ).resolves.toEqual({ kind: "disconnected" });
    expect(cancelRun).not.toHaveBeenCalled();
  });

  it("waits for regeneration and returns the cell result", async () => {
    const regenerated = {
      summary: "12 months",
      flag: "green" as const,
      reasoning: "Clause 4",
    };
    const regeneratedRun: TabularRun = {
      ...queuedRun,
      operation: "regenerate-cell",
      request: {
        operation: "regenerate-cell",
        sourceDocumentIds: ["document-1"],
        documentId: "document-1",
        column: { index: 0, name: "Term", prompt: "Extract the term" },
        requestedModel: null,
      },
      status: "completed",
      completedAt: new Date(),
    };
    const instance = service(
      repository({
        findRun: async () => regeneratedRun,
        listRunEvents: async () => [
          {
            sequence: 1,
            errorKind: null,
            event: {
              type: "cell_update",
              document_id: "document-1",
              column_index: 0,
              content: regenerated,
              status: "done",
            },
          },
        ],
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.waitForCell(actor, review.id, regeneratedRun.id, new AbortController().signal),
    ).resolves.toEqual(regenerated);
  });

  it("drains an event committed between the first replay and terminal read", async () => {
    const regenerated = {
      summary: "12 months",
      flag: "green" as const,
      reasoning: "Clause 4",
    };
    const regeneratedRun: TabularRun = {
      ...queuedRun,
      operation: "regenerate-cell",
      request: {
        operation: "regenerate-cell",
        sourceDocumentIds: ["document-1"],
        documentId: "document-1",
        column: { index: 0, name: "Term", prompt: "Extract the term" },
        requestedModel: null,
      },
      status: "completed",
      completedAt: new Date(),
    };
    let reads = 0;
    const instance = service(
      repository({
        findRun: async () => regeneratedRun,
        listRunEvents: async () => {
          reads += 1;
          return reads === 1
            ? []
            : [
                {
                  sequence: 1,
                  errorKind: null,
                  event: {
                    type: "cell_update",
                    document_id: "document-1",
                    column_index: 0,
                    content: regenerated,
                    status: "done",
                  },
                },
              ];
        },
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.waitForCell(actor, review.id, regeneratedRun.id, new AbortController().signal),
    ).resolves.toEqual(regenerated);
    expect(reads).toBe(2);
  });

  it.each([
    ["extraction", 422],
    ["unsupported-inline-pdf", 422],
    ["missing-model-result", 500],
    [null, 502],
  ] as const)("maps durable regeneration error %s to %i", async (errorKind, status) => {
    const failedRun: TabularRun = {
      ...queuedRun,
      operation: "regenerate-cell",
      request: {
        operation: "regenerate-cell",
        sourceDocumentIds: ["document-1"],
        documentId: "document-1",
        column: { index: 0, name: "Term", prompt: "Extract the term" },
        requestedModel: null,
      },
      status: "completed",
      completedAt: new Date(),
    };
    const instance = service(
      repository({
        findRun: async () => failedRun,
        listRunEvents: async () => [
          {
            sequence: 1,
            errorKind,
            event: {
              type: "cell_update",
              document_id: "document-1",
              column_index: 0,
              content: { summary: "", flag: "red", reasoning: "failed" },
              status: "error",
            },
          },
        ],
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.waitForCell(actor, review.id, failedRun.id, new AbortController().signal),
    ).rejects.toMatchObject({ status, message: "failed" });
  });

  it("admits regeneration with more than 64 review sources", async () => {
    const documents = Array.from({ length: 65 }, (_, index) => ({
      id: `document-${index}`,
      userId: actor.userId,
      projectId: null,
      filename: `${index}.pdf`,
      fileType: "pdf",
    }));
    const instance = service(
      repository({
        listReviewDocuments: async () => documents,
        listCells: async () => [
          {
            id: "cell-1",
            reviewId: review.id,
            documentId: "document-0",
            columnIndex: 0,
            content: null,
            status: "pending",
            activeRunId: null,
            activeRunEpoch: null,
          },
        ],
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.enqueueRun(actor, review.id, {
        target: { kind: "cell", documentId: "document-0", columnIndex: 0 },
      }),
    ).resolves.toMatchObject({ id: "run-1" });
  });

  it("admits a mostly-complete bulk review by pending document count", async () => {
    const documents = Array.from({ length: 65 }, (_, index) => ({
      id: `document-${index}`,
      userId: actor.userId,
      projectId: null,
      filename: `${index}.pdf`,
      fileType: "pdf",
    }));
    const cells = documents.map((document, index) => ({
      id: `cell-${index}`,
      reviewId: review.id,
      documentId: document.id,
      columnIndex: 0,
      content: index === 0 ? null : { summary: "done" },
      status: index === 0 ? "pending" : "done",
      activeRunId: null,
      activeRunEpoch: null,
    }));
    const instance = service(
      repository({
        listReviewDocuments: async () => documents,
        listCells: async () => cells,
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.enqueueRun(actor, review.id, { target: { kind: "review" } }),
    ).resolves.toMatchObject({ id: "run-1" });
  });

  it("validates retained sources when the review project changes", async () => {
    const updateReview = vi.fn();
    const projectReview = { ...review, projectId: "project-old" };
    const instance = service(
      repository({
        findReview: async () => projectReview,
        listReviewDocuments: async () => [
          {
            id: "document-1",
            userId: actor.userId,
            projectId: "project-old",
            filename: "contract.pdf",
            fileType: "pdf",
          },
        ],
        findDocuments: async () => [
          {
            id: "document-1",
            userId: actor.userId,
            projectId: "project-old",
            filename: "contract.pdf",
            fileType: "pdf",
          },
        ],
        updateReview,
      }),
      { cancelJob: vi.fn() },
    );
    await expect(
      instance.updateReview(actor, review.id, {
        projectId: "project-new",
        documentIds: ["document-1"],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Review sources must belong to the assigned project",
    });
    expect(updateReview).not.toHaveBeenCalled();
  });

  it("passes the actor id to every chat ownership query", async () => {
    const listChats = vi.fn(async () => []);
    const findOwnedChat = vi.fn(async () => ({ id: "chat-1" }));
    const listChatMessages = vi.fn(async () => []);
    const instance = service(repository({ listChats, findOwnedChat, listChatMessages }), {
      cancelJob: vi.fn(),
    });
    await instance.listChats(actor, review.id);
    await instance.listChatMessages(actor, review.id, "chat-1");
    expect(listChats).toHaveBeenCalledWith(review.id, actor.userId);
    expect(findOwnedChat).toHaveBeenCalledWith(review.id, "chat-1", actor.userId);
  });
});
