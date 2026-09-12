import { describe, expect, it, vi } from "vitest";
import { UsagePolicyService } from "../../src/modules/ai/usagePolicy.js";
import {
  ComplianceAnalysisService,
  type ComplianceAnalysisDependencies,
} from "../../src/modules/compliance/compliance.analysis.js";
import type { ComplianceRepository } from "../../src/modules/compliance/compliance.repository.js";
import type {
  ComplianceReview,
  ComplianceRun,
  ComplianceRunInput,
} from "../../src/modules/compliance/compliance.types.js";

describe("ComplianceAnalysisService", () => {
  it("uses unavailable score wording and question results in question-only prompts", async () => {
    const now = new Date();
    const review: ComplianceReview = {
      id: "review-1",
      userId: "user-1",
      projectId: null,
      workspaceId: null,
      primaryDocumentId: "document-1",
      title: "Questions only",
      status: "pending",
      complianceScore: null,
      results: null,
      aiInsights: null,
      ragCollectionName: null,
      createdAt: now,
      updatedAt: now,
    };
    const run: ComplianceRun = {
      id: "run-1",
      reviewId: review.id,
      userId: review.userId,
      jobId: "job-1",
      idempotencyKey: "request-1",
      status: "queued",
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      cancelledAt: null,
    };
    const runInput: ComplianceRunInput = {
      review,
      primaryDocument: {
        id: "document-1",
        filename: "agreement.txt",
        fileType: "txt",
      },
      supportingDocs: [],
      rules: [],
      questions: [
        {
          id: "question-1",
          reviewId: review.id,
          content: "Does this agreement allow termination?",
          status: "pending",
          result: null,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      workspaceFiles: [],
      workspaceDocuments: [],
    };
    const completeReviewRun = vi.fn(
      async (_input: Parameters<ComplianceRepository["completeReviewRun"]>[0]) => true,
    );
    const repository: ComplianceRepository = {
      findDocuments: async () => [],
      listReviews: async () => [],
      findReview: async () => review,
      createReview: async () => review,
      updateReviewTitle: async () => review,
      deleteReview: async () => true,
      getDetails: async () => runInput,
      getWorkspaceName: async () => null,
      workspaceHasContent: async () => false,
      addSupportingDocument: async () => {
        throw new Error("unused");
      },
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
      updateRuleResult: async () => undefined,
      updateQuestionResult: async () => undefined,
      loadRunInput: async () => runInput,
      createOrGetRun: async () => run,
      attachRunJob: async () => undefined,
      findLatestRun: async () => run,
      findRun: async () => run,
      markRunRunning: async () => undefined,
      failReviewRun: async () => true,
      markRunCancelled: async () => true,
      isRunCancelled: async () => false,
      appendRunEvent: async () => 1,
      listRunEvents: async () => [],
      completeReviewRun,
    };
    const completeText = vi.fn(
      async (
        input: Parameters<ComplianceAnalysisDependencies["completeText"]>[0],
      ): Promise<string> => {
        if (input.systemPrompt.includes("Answer the question")) {
          return JSON.stringify({
            answer: "Yes. Either party may terminate.",
            reasoning: "Section 4 grants either party a termination right.",
            citations: [],
          });
        }
        return "[]";
      },
    );
    const service = new ComplianceAnalysisService({
      repository,
      content: {
        extract: async () => "Section 4. Either party may terminate this agreement.",
        read: async () => ({
          kind: "text",
          text: "Section 4. Either party may terminate this agreement.",
        }),
      },
      usagePolicy: new UsagePolicyService(),
      getModelSettings: async () => ({
        tabularModel: "model-1",
        aiRuntime: { connections: [], models: [] },
      }),
      completeText,
    });

    await service.execute({
      runId: run.id,
      reviewId: review.id,
      userId: review.userId,
      signal: new AbortController().signal,
    });

    const prompts = completeText.mock.calls.map(([input]) => input.user);
    const insightPrompt = completeText.mock.calls.find(([input]) =>
      input.systemPrompt.includes("generate 4-6 key insights"),
    )?.[0].user;
    const recommendationPrompt = completeText.mock.calls.find(([input]) =>
      input.systemPrompt.includes("Generate actionable recommendations"),
    )?.[0].user;

    expect(prompts.join("\n")).not.toContain("null%");
    expect(prompts.join("\n")).not.toContain("Compliance Score: 0%");
    expect(insightPrompt).toContain(
      "Compliance Score: unavailable because no scorable rules were evaluated",
    );
    expect(recommendationPrompt).toContain(
      "Compliance Score: unavailable because no scorable rules were evaluated",
    );
    expect(recommendationPrompt).toContain(
      "Question: Does this agreement allow termination?\nAnswer: Yes. Either party may terminate.",
    );
    expect(completeReviewRun).toHaveBeenCalledWith(
      expect.objectContaining({
        complianceScore: null,
        summary: expect.objectContaining({ compliance_score: null }),
      }),
    );
  });
});
