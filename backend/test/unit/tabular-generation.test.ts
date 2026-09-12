import { describe, expect, it, vi } from "vitest";
import { UsagePolicyService } from "../../src/modules/ai/usagePolicy.js";
import {
  TabularGenerationService,
  TabularWorkerInterruptedError,
  type TabularGenerationRepositories,
} from "../../src/modules/tabular/tabular.generation.js";
import { TabularAuthorizationPolicy } from "../../src/modules/tabular/tabular.policy.js";
import type { TabularRun } from "../../src/modules/tabular/tabular.types.js";
import { ownerGrant, stubAccessAuthority } from "./access-test-helpers.js";

const review = {
  id: "review-1",
  userId: "user-1",
  projectId: "project-1",
  title: "Review",
  columnsConfig: [],
};

const run: TabularRun = {
  id: "run-1",
  reviewId: review.id,
  userId: "user-1",
  jobId: "job-1",
  idempotencyKey: "key-1",
  operation: "generate",
  requestHash: "hash",
  request: {
    operation: "generate",
    sourceDocumentIds: ["document-1"],
    columns: [{ index: 0, name: "Term", prompt: "Extract term" }],
    targets: [{ documentId: "document-1", columnIndexes: [0] }],
    requestedModel: null,
  },
  status: "running",
  error: null,
  executionEpoch: 1,
  nextSequence: 1,
  usedModelCalls: 0,
  usedOutputTokens: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  cancelledAt: null,
};

type TabularGenerationRepository = TabularGenerationRepositories["reviews"] &
  TabularGenerationRepositories["runs"];

function repository(
  overrides: Partial<TabularGenerationRepository> = {},
): TabularGenerationRepository {
  return {
    claimRun: async () => ({ run, epoch: 1 }),
    isRunCancelled: async () => false,
    findReview: async () => review,
    listRunEvents: async () => [],
    sourceBelongsToReview: async () => true,
    findDocument: async () => ({
      id: "document-1",
      userId: "user-1",
      projectId: "project-1",
      filename: "contract.txt",
      fileType: "txt",
    }),
    findUserEmail: async () => "user@example.com",
    markCellGenerating: async () => true,
    reserveUsage: async () => true,
    completeCell: async () => true,
    completeRun: async () => true,
    ...overrides,
  };
}

function repositories(
  overrides: Partial<TabularGenerationRepository> = {},
): TabularGenerationRepositories {
  const repositoryInstance = repository(overrides);
  return { reviews: repositoryInstance, runs: repositoryInstance };
}

function policy(onDocumentAccess: () => void = () => undefined) {
  return new TabularAuthorizationPolicy(
    stubAccessAuthority((_actor, resource) => {
      if (resource.kind === "document") onDocumentAccess();
      return { ...ownerGrant, role: "editor" };
    }),
  );
}

describe("TabularGenerationService", () => {
  it("reports an aborted worker signal with the claimed epoch", async () => {
    const instance = new TabularGenerationService({
      repositories: repositories(),
      policy: policy(),
      content: { extract: vi.fn(), read: vi.fn() },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: vi.fn(),
      completeText: vi.fn(),
      completeTextWithInlineFile: vi.fn(),
    });
    await expect(instance.execute(run.id, AbortSignal.abort())).rejects.toMatchObject({
      name: "TabularWorkerInterruptedError",
      runId: run.id,
      epoch: 1,
    } satisfies Partial<TabularWorkerInterruptedError>);
  });

  it("does not extract when source membership was revoked", async () => {
    const read = vi.fn();
    const instance = new TabularGenerationService({
      repositories: repositories({ sourceBelongsToReview: async () => false }),
      policy: policy(),
      content: { extract: vi.fn(), read },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "openai:gpt-4o",
        aiRuntime: { connections: new Map() },
      }),
      completeText: vi.fn(),
      completeTextWithInlineFile: vi.fn(),
    });
    await expect(instance.execute(run.id, new AbortController().signal)).rejects.toThrow(
      "source membership was revoked",
    );
    expect(read).not.toHaveBeenCalled();
  });

  it("does not extract when document access was revoked", async () => {
    const read = vi.fn();
    const instance = new TabularGenerationService({
      repositories: repositories(),
      policy: new TabularAuthorizationPolicy(
        stubAccessAuthority((_actor, resource) =>
          resource.kind === "document" ? null : { ...ownerGrant, role: "editor" },
        ),
      ),
      content: { extract: vi.fn(), read },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "openai:gpt-4o",
        aiRuntime: { connections: new Map() },
      }),
      completeText: vi.fn(),
      completeTextWithInlineFile: vi.fn(),
    });
    await expect(instance.execute(run.id, new AbortController().signal)).rejects.toThrow(
      "document access was revoked",
    );
    expect(read).not.toHaveBeenCalled();
  });

  it("uses the current normalized user email for authorization", async () => {
    const seenEmails: string[] = [];
    const instance = new TabularGenerationService({
      repositories: repositories({
        findUserEmail: async () => " Current@Example.COM ",
      }),
      policy: new TabularAuthorizationPolicy(
        stubAccessAuthority((currentActor) => {
          seenEmails.push(currentActor.email);
          return { ...ownerGrant, role: "editor" };
        }),
      ),
      content: {
        extract: vi.fn(),
        read: async () => ({ kind: "text", text: "contract text" }),
      },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "openai:gpt-4o",
        aiRuntime: { connections: new Map() },
      }),
      completeText: async () =>
        '{"column_index":0,"summary":"12 months","flag":"green","reasoning":"Term"}',
      completeTextWithInlineFile: vi.fn(),
    });
    await instance.execute(run.id, new AbortController().signal);
    expect(seenEmails).toEqual(["current@example.com", "current@example.com"]);
  });

  it("checks membership, capability, scope, and access immediately before extraction", async () => {
    const order: string[] = [];
    const instance = new TabularGenerationService({
      repositories: repositories({
        sourceBelongsToReview: async () => {
          order.push("membership");
          return true;
        },
        findDocument: async () => {
          order.push("scope");
          return {
            id: "document-1",
            userId: "user-1",
            projectId: "project-1",
            filename: "contract.txt",
            fileType: "txt",
          };
        },
      }),
      policy: new TabularAuthorizationPolicy(
        stubAccessAuthority((_actor, resource) => {
          order.push(resource.kind === "document" ? "document-access" : "capability");
          return { ...ownerGrant, role: "editor" };
        }),
      ),
      content: {
        extract: vi.fn(),
        read: async () => {
          order.push("extract");
          return { kind: "text", text: "contract text" };
        },
      },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "openai:gpt-4o",
        aiRuntime: { connections: new Map() },
      }),
      completeText: async () =>
        '{"column_index":0,"summary":"12 months","flag":"green","reasoning":"Term"}',
      completeTextWithInlineFile: vi.fn(),
    });
    await instance.execute(run.id, new AbortController().signal);
    expect(order).toEqual(["membership", "capability", "scope", "document-access", "extract"]);
  });

  it("persists the existing cell_update payload shape", async () => {
    const completeCell = vi.fn(async () => true);
    const instance = new TabularGenerationService({
      repositories: repositories({ completeCell }),
      policy: policy(),
      content: {
        extract: vi.fn(),
        read: async () => ({ kind: "text", text: "contract text" }),
      },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "openai:gpt-4o",
        aiRuntime: { connections: new Map() },
      }),
      completeText: async () =>
        '{"column_index":0,"summary":"12 months","flag":"green","reasoning":"Term"}',
      completeTextWithInlineFile: vi.fn(),
    });
    await instance.execute(run.id, new AbortController().signal);
    expect(completeCell).toHaveBeenCalledWith(
      expect.objectContaining({
        event: {
          type: "cell_update",
          document_id: "document-1",
          column_index: 0,
          content: { summary: "12 months", flag: "green", reasoning: "Term" },
          status: "done",
        },
      }),
    );
  });

  it("persists extraction failures with the compatibility category", async () => {
    const completeCell = vi.fn(async () => true);
    const instance = new TabularGenerationService({
      repositories: repositories({ completeCell }),
      policy: policy(),
      content: {
        extract: vi.fn(),
        read: async () => {
          throw new Error("Content source contains no extractable text");
        },
      },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "gpt-5.5",
        aiRuntime: { connections: [], models: [] },
      }),
      completeText: vi.fn(),
      completeTextWithInlineFile: vi.fn(),
    });
    await instance.execute(run.id, new AbortController().signal);
    expect(completeCell).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", errorKind: "extraction" }),
    );
  });

  it("persists missing model results with the compatibility category", async () => {
    const completeCell = vi.fn(async () => true);
    const instance = new TabularGenerationService({
      repositories: repositories({ completeCell }),
      policy: policy(),
      content: {
        extract: vi.fn(),
        read: async () => ({ kind: "text", text: "contract text" }),
      },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "gpt-5.5",
        aiRuntime: { connections: [], models: [] },
      }),
      completeText: async () => "[]",
      completeTextWithInlineFile: vi.fn(),
    });
    await instance.execute(run.id, new AbortController().signal);
    expect(completeCell).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", errorKind: "missing-model-result" }),
    );
  });

  it("persists unsupported inline PDFs with the compatibility category", async () => {
    const completeCell = vi.fn(async () => true);
    const instance = new TabularGenerationService({
      repositories: repositories({ completeCell }),
      policy: policy(),
      content: {
        extract: vi.fn(),
        read: async () => ({
          kind: "inline-pdf",
          bytes: new ArrayBuffer(1),
          mimeType: "application/pdf",
        }),
      },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "gpt-5.5",
        aiRuntime: { connections: [], models: [] },
      }),
      completeText: vi.fn(),
      completeTextWithInlineFile: vi.fn(),
    });
    await instance.execute(run.id, new AbortController().signal);
    expect(completeCell).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", errorKind: "unsupported-inline-pdf" }),
    );
  });

  it("bounds document calls and reserves durable usage before each call", async () => {
    const twoDocumentRun: TabularRun = {
      ...run,
      request: {
        ...run.request,
        sourceDocumentIds: ["document-1", "document-2"],
        targets: [
          { documentId: "document-1", columnIndexes: [0] },
          { documentId: "document-2", columnIndexes: [0] },
        ],
      },
    };
    const reserveUsage = vi.fn(async () => true);
    const order: string[] = [];
    let active = 0;
    let maximum = 0;
    const instance = new TabularGenerationService({
      repositories: repositories({
        claimRun: async () => ({ run: twoDocumentRun, epoch: 1 }),
        findDocument: async (documentId) => ({
          id: documentId,
          userId: "user-1",
          projectId: "project-1",
          filename: `${documentId}.txt`,
          fileType: "txt",
        }),
        reserveUsage: async (input) => {
          order.push(`reserve:${input.runId}`);
          return reserveUsage(input);
        },
      }),
      policy: policy(),
      content: {
        extract: vi.fn(),
        read: async () => ({ kind: "text", text: "contract text" }),
      },
      usagePolicy: new UsagePolicyService({
        concurrency: 1,
        modelCalls: 8,
        outputTokens: 16_384,
      }),
      getModelSettings: async () => ({
        tabularModel: "openai:gpt-4o",
        aiRuntime: { connections: new Map() },
      }),
      completeText: async () => {
        order.push("model");
        active += 1;
        maximum = Math.max(maximum, active);
        await Promise.resolve();
        active -= 1;
        return '{"column_index":0,"summary":"value","flag":"grey","reasoning":""}';
      },
      completeTextWithInlineFile: vi.fn(),
    });
    await instance.execute(run.id, new AbortController().signal);
    expect(reserveUsage).toHaveBeenCalledTimes(2);
    expect(maximum).toBe(1);
    expect(order).toEqual(["reserve:run-1", "model", "reserve:run-1", "model"]);
  });
});
