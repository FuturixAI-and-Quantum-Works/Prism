import { z } from "zod";
import type { AiRuntimeContext } from "../../lib/llm/types.js";
import { mapWithConcurrency, UsagePolicyService } from "../ai/usagePolicy.js";
import type { ContentTextService } from "../content/contentText.service.js";
import type { ComplianceRepository } from "./compliance.repository.js";
import type {
  ComplianceQuestion,
  ComplianceRule,
  ComplianceRunInput,
  PersistedComplianceEvent,
} from "./compliance.types.js";

const citationSchema = z.object({
  page: z.number().nullable().optional(),
  quote: z.string(),
});
const ruleResultSchema = z.object({
  status: z.enum(["compliant", "non_compliant", "partial"]),
  summary: z.string(),
  reasoning: z.string(),
  citations: z.array(citationSchema).default([]),
});
const questionResultSchema = z.object({
  answer: z.string(),
  reasoning: z.string(),
  citations: z.array(citationSchema).default([]),
});
const insightSchema = z.array(z.string());
const clauseSchema = z.array(
  z.object({
    clause: z.string(),
    status: z.enum(["valid", "invalid", "warning"]),
    details: z.string(),
  }),
);
const recommendationSchema = z.array(
  z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["high", "medium", "low"]),
  }),
);

type ModelSettings = Readonly<{
  tabularModel: string;
  aiRuntime: AiRuntimeContext;
}>;

export type ComplianceAnalysisDependencies = Readonly<{
  repository: ComplianceRepository;
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
}>;

const ruleSystemPrompt = `You are a legal compliance analyst. Analyze whether the provided documents comply with the given rule.

Return ONLY valid JSON in this exact format:
{"status": "compliant"|"non_compliant"|"partial", "summary": string, "reasoning": string, "citations": [{"page": number|null, "quote": string}]}

Rules:
- "status": compliant = fully meets the rule, partial = partially meets, non_compliant = does not meet
- "summary": 1-2 sentence assessment
- "reasoning": detailed explanation with evidence
- "citations": exact quotes from the documents supporting your analysis (max 3)
- Keep citations short (≤30 words each)`;

const questionSystemPrompt = `You are a legal analyst. Answer the question based on the provided documents.

Return ONLY valid JSON in this exact format:
{"answer": string, "reasoning": string, "citations": [{"page": number|null, "quote": string}]}

Rules:
- "answer": direct answer to the question (1-3 sentences)
- "reasoning": explanation with supporting evidence
- "citations": exact quotes from the documents (max 3, ≤30 words each)`;

const insightsSystemPrompt = `You are a legal compliance expert. Based on the compliance analysis results provided, generate 4-6 key insights as bullet points.

Return ONLY a valid JSON array of strings. Keep each insight actionable and concise.`;

const clausesSystemPrompt = `You are a legal document analyst. Extract and validate key clauses from the provided documents.

Return ONLY a valid JSON array in this exact format:
[{"clause": "clause name/title", "status": "valid"|"invalid"|"warning", "details": "explanation of status"}]

Extract 4-8 key clauses and keep details concise.`;

const recommendationsSystemPrompt = `You are a legal compliance advisor. Generate actionable recommendations from the compliance analysis.

Return ONLY a valid JSON array in this exact format:
[{"title": "short title", "description": "detailed recommendation", "priority": "high"|"medium"|"low"}]

Generate 3-5 practical recommendations.`;

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function requireWithinLimit(label: string, text: string, limit: number): string {
  if (text.length > limit) {
    throw new Error(`${label} exceeds the compliance analysis context limit`);
  }
  return text;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function complianceScoreContext(complianceScore: number | null): string {
  return complianceScore === null
    ? "Compliance Score: unavailable because no scorable rules were evaluated"
    : `Compliance Score: ${complianceScore}%`;
}

export class ComplianceRunCancelledError extends Error {
  constructor() {
    super("Compliance run cancelled");
    this.name = "ComplianceRunCancelledError";
  }
}

export class ComplianceAnalysisService {
  constructor(private readonly dependencies: ComplianceAnalysisDependencies) {}

  async execute(input: {
    runId: string;
    reviewId: string;
    userId: string;
    requestedModel?: string;
    signal: AbortSignal;
  }): Promise<void> {
    const { repository } = this.dependencies;
    const run = await repository.findRun(input.runId, input.reviewId, input.userId);
    if (!run) throw new Error("Compliance run not found");
    if (run.status === "cancelled") throw new ComplianceRunCancelledError();
    if (run.status === "completed") {
      await this.emit(input.runId, "status:completed", { type: "status", status: "completed" });
      return;
    }

    await repository.markRunRunning(input.runId);
    await this.emit(input.runId, "status:running", { type: "status", status: "running" });
    const review = await repository.findReview(input.reviewId);
    if (!review) throw new Error("Compliance review not found");
    const runInput = await repository.loadRunInput(review);
    const budget = this.dependencies.usagePolicy.createComplianceReviewBudget(
      runInput.rules.length,
      runInput.questions.length,
    );
    const settings = await this.dependencies.getModelSettings(input.userId);
    const model = input.requestedModel ?? settings.tabularModel;
    const context = await this.buildContext(runInput, budget.plan.concurrency);
    const ruleResults = await mapWithConcurrency(
      runInput.rules,
      budget.plan.concurrency,
      async (rule) => {
        await this.ensureActive(input.runId, input.signal);
        await this.emit(input.runId, `rule:start:${rule.id}`, {
          type: "rule_start",
          rule_id: rule.id,
        });
        if (rule.result && rule.status !== "pending" && rule.status !== "error") {
          const result = ruleResultSchema.parse(rule.result);
          await this.emit(input.runId, `rule:result:${rule.id}`, {
            type: "rule_result",
            rule_id: rule.id,
            status: result.status,
            result,
          });
          return { rule, result };
        }
        try {
          budget.reserve(1_024);
          const raw = await this.dependencies.completeText({
            model,
            task: "tabular",
            systemPrompt: ruleSystemPrompt,
            user: `${context}\n\n---\n\nRule to evaluate: ${rule.content}`,
            maxTokens: 1_024,
            runtime: settings.aiRuntime,
            signal: input.signal,
          });
          const result = ruleResultSchema.parse(parseJson(raw));
          await repository.updateRuleResult(rule.id, result.status, result);
          await this.emit(input.runId, `rule:result:${rule.id}`, {
            type: "rule_result",
            rule_id: rule.id,
            status: result.status,
            result,
          });
          return { rule: { ...rule, status: result.status, result }, result };
        } catch (error) {
          await this.rethrowCancellation(input.runId, input.signal);
          const message = errorMessage(error);
          await repository.updateRuleResult(rule.id, "error", null);
          await this.emit(input.runId, `rule:error:${rule.id}`, {
            type: "rule_error",
            rule_id: rule.id,
            error: message,
          });
          throw new Error(`Rule analysis failed: ${message}`, { cause: error });
        }
      },
    );
    const questionResults = await mapWithConcurrency(
      runInput.questions,
      budget.plan.concurrency,
      async (question) => {
        await this.ensureActive(input.runId, input.signal);
        await this.emit(input.runId, `question:start:${question.id}`, {
          type: "question_start",
          question_id: question.id,
        });
        if (question.result && question.status !== "pending" && question.status !== "error") {
          const result = questionResultSchema.parse(question.result);
          await this.emit(input.runId, `question:result:${question.id}`, {
            type: "question_result",
            question_id: question.id,
            result,
          });
          return { question, result };
        }
        try {
          budget.reserve(1_024);
          const raw = await this.dependencies.completeText({
            model,
            task: "tabular",
            systemPrompt: questionSystemPrompt,
            user: `${context}\n\n---\n\nQuestion: ${question.content}`,
            maxTokens: 1_024,
            runtime: settings.aiRuntime,
            signal: input.signal,
          });
          const result = questionResultSchema.parse(parseJson(raw));
          await repository.updateQuestionResult(question.id, "compliant", result);
          await this.emit(input.runId, `question:result:${question.id}`, {
            type: "question_result",
            question_id: question.id,
            result,
          });
          return { question: { ...question, status: "compliant" as const, result }, result };
        } catch (error) {
          await this.rethrowCancellation(input.runId, input.signal);
          const message = errorMessage(error);
          await repository.updateQuestionResult(question.id, "error", null);
          await this.emit(input.runId, `question:error:${question.id}`, {
            type: "question_error",
            question_id: question.id,
            error: message,
          });
          throw new Error(`Question analysis failed: ${message}`, { cause: error });
        }
      },
    );

    const rules = ruleResults.map(({ rule }) => rule);
    const questions = questionResults.map(({ question }) => question);
    const compliantCount = rules.filter(({ status }) => status === "compliant").length;
    const nonCompliantCount = rules.filter(({ status }) => status === "non_compliant").length;
    const partialCount = rules.filter(({ status }) => status === "partial").length;
    const errorCount = rules.filter(({ status }) => status === "error").length;
    const validRuleCount = rules.length - errorCount;
    const complianceScore =
      validRuleCount > 0
        ? Math.round(((compliantCount + partialCount * 0.5) / validRuleCount) * 100)
        : null;

    const insights = await this.generateInsights({
      runId: input.runId,
      model,
      runtime: settings.aiRuntime,
      signal: input.signal,
      budget,
      rules,
      questions,
      complianceScore,
      compliantCount,
      nonCompliantCount,
      partialCount,
    });
    await this.generateClauses(
      input.runId,
      context,
      model,
      settings.aiRuntime,
      input.signal,
      budget,
    );
    await this.generateRecommendations({
      runId: input.runId,
      model,
      runtime: settings.aiRuntime,
      signal: input.signal,
      budget,
      rules,
      questions,
      insights,
      complianceScore,
      compliantCount,
      nonCompliantCount,
      partialCount,
    });
    await this.ensureActive(input.runId, input.signal);

    const summary = {
      compliance_score: complianceScore,
      critical_issues: nonCompliantCount,
      pending_items: partialCount,
      resolved_issues: compliantCount,
      partial_issues: partialCount,
      compliant_rules: compliantCount,
      total_rules: rules.length,
      total_questions: questions.length,
      errors: errorCount,
    };
    await this.emitActivity(input.runId, "Compliance review completed", "activity:completed");
    await this.emitActivity(
      input.runId,
      `Analyzed ${rules.length} rules and ${questions.length} questions`,
      "activity:counts",
    );
    if (nonCompliantCount > 0) {
      await this.emitActivity(
        input.runId,
        `Found ${nonCompliantCount} non-compliant items requiring attention`,
        "activity:non-compliant",
      );
    }
    if (partialCount > 0) {
      await this.emitActivity(
        input.runId,
        `Found ${partialCount} items with partial compliance`,
        "activity:partial",
      );
    }
    await this.emit(input.runId, "summary", {
      type: "summary",
      ...summary,
      ai_insights: insights,
    });
    if (
      !(await repository.completeReviewRun({
        runId: input.runId,
        reviewId: input.reviewId,
        complianceScore,
        summary,
        insights,
        reviewTitle: runInput.review.title,
        primaryDocumentId: runInput.review.primaryDocumentId,
        userId: runInput.review.userId,
        nonCompliantCount,
        partialCount,
        compliantCount,
        rules,
        questions,
      }))
    ) {
      throw new ComplianceRunCancelledError();
    }
  }

  private async buildContext(input: ComplianceRunInput, concurrency: number): Promise<string> {
    if (input.review.workspaceId) {
      const sources = [
        ...input.workspaceFiles.map((file) => ({
          filename: file.filename,
          source: {
            kind: "stored-file" as const,
            storagePath: file.storagePath,
            fileType: file.extension,
          },
        })),
        ...input.workspaceDocuments.map((document) => ({
          filename: document.filename,
          source: {
            kind: "document" as const,
            id: document.id,
            fileType: document.fileType,
          },
        })),
      ];
      const texts = await mapWithConcurrency(
        sources,
        concurrency,
        async ({ filename, source }) => ({
          filename,
          text: await this.dependencies.content.extract(source),
        }),
      );
      const context = `# Workspace Documents\n\n${texts
        .filter(({ text }) => text.trim())
        .map(
          ({ filename, text }, index) =>
            `## Document ${index + 1}: ${filename}\n\n${requireWithinLimit(filename, text, 40_000)}`,
        )
        .join("\n\n---\n\n")}`;
      return requireWithinLimit("Workspace content", context, 120_000);
    }
    const primary = input.primaryDocument;
    if (!primary) throw new Error("Primary document not found");
    const primaryText = await this.dependencies.content.extract({
      kind: "document",
      id: primary.id,
      fileType: primary.fileType,
    });
    const supporting = await mapWithConcurrency(
      input.supportingDocs,
      concurrency,
      async (document) => ({
        filename: document.filename,
        text: await this.dependencies.content.extract({
          kind: "document",
          id: document.documentId,
          fileType: document.fileType,
        }),
      }),
    );
    const supportingContext = supporting
      .filter(({ text }) => text.trim())
      .map(
        ({ filename, text }) =>
          `### Supporting Document: ${filename}\n\n${requireWithinLimit(filename, text, 30_000)}`,
      )
      .join("\n\n---\n\n");
    const context = `# Primary Document: ${primary.filename}\n\n${requireWithinLimit(
      primary.filename,
      primaryText,
      60_000,
    )}${supportingContext ? `\n\n---\n\n# Supporting Documents\n\n${supportingContext}` : ""}`;
    return requireWithinLimit("Compliance content", context, 120_000);
  }

  private async generateInsights(input: {
    runId: string;
    model: string;
    runtime: AiRuntimeContext;
    signal: AbortSignal;
    budget: ReturnType<UsagePolicyService["createComplianceReviewBudget"]>;
    rules: readonly ComplianceRule[];
    questions: readonly ComplianceQuestion[];
    complianceScore: number | null;
    compliantCount: number;
    nonCompliantCount: number;
    partialCount: number;
  }): Promise<string[]> {
    await this.emit(input.runId, "insights:start", { type: "insights_start" });
    input.budget.reserve(1_024);
    const raw = await this.dependencies.completeText({
      model: input.model,
      task: "tabular",
      systemPrompt: insightsSystemPrompt,
      user: `${complianceScoreContext(input.complianceScore)}\nCompliant: ${input.compliantCount}, Non-Compliant: ${input.nonCompliantCount}, Partial: ${input.partialCount}\n\n${this.analysisSummary(input.rules, input.questions)}`,
      maxTokens: 1_024,
      runtime: input.runtime,
      signal: input.signal,
    });
    const insights = insightSchema.parse(parseJson(raw));
    await this.emit(input.runId, "insights:result", {
      type: "insights_result",
      insights,
    });
    return insights;
  }

  private async generateClauses(
    runId: string,
    context: string,
    model: string,
    runtime: AiRuntimeContext,
    signal: AbortSignal,
    budget: ReturnType<UsagePolicyService["createComplianceReviewBudget"]>,
  ): Promise<void> {
    await this.emitActivity(runId, "Starting clause validation analysis", "activity:clauses");
    budget.reserve(1_500);
    const raw = await this.dependencies.completeText({
      model,
      task: "tabular",
      systemPrompt: clausesSystemPrompt,
      user: `${context}\n\n---\n\nAnalyze the key clauses in these documents and validate their effectiveness.`,
      maxTokens: 1_500,
      runtime,
      signal,
    });
    const clauses = clauseSchema.parse(parseJson(raw));
    for (const [index, clause] of clauses.entries()) {
      await this.emit(runId, `clause:${index}`, {
        type: "clause_validation",
        clause_id: `${runId}-clause-${index}`,
        ...clause,
      });
    }
  }

  private async generateRecommendations(input: {
    runId: string;
    model: string;
    runtime: AiRuntimeContext;
    signal: AbortSignal;
    budget: ReturnType<UsagePolicyService["createComplianceReviewBudget"]>;
    rules: readonly ComplianceRule[];
    questions: readonly ComplianceQuestion[];
    insights: readonly string[];
    complianceScore: number | null;
    compliantCount: number;
    nonCompliantCount: number;
    partialCount: number;
  }): Promise<void> {
    await this.emitActivity(input.runId, "Generating recommendations", "activity:recommendations");
    input.budget.reserve(1_500);
    const raw = await this.dependencies.completeText({
      model: input.model,
      task: "tabular",
      systemPrompt: recommendationsSystemPrompt,
      user: `${complianceScoreContext(input.complianceScore)}\nNon-Compliant: ${input.nonCompliantCount}, Partial: ${input.partialCount}, Compliant: ${input.compliantCount}\n\n${this.analysisSummary(input.rules, input.questions)}\n\nAI Insights:\n${input.insights.join("\n")}`,
      maxTokens: 1_500,
      runtime: input.runtime,
      signal: input.signal,
    });
    const recommendations = recommendationSchema.parse(parseJson(raw));
    for (const [index, recommendation] of recommendations.entries()) {
      await this.emit(input.runId, `recommendation:${index}`, {
        type: "recommendation",
        recommendation_id: `${input.runId}-recommendation-${index}`,
        ...recommendation,
      });
    }
  }

  private analysisSummary(
    rules: readonly ComplianceRule[],
    questions: readonly ComplianceQuestion[],
  ): string {
    const ruleText = rules
      .filter(({ result }) => result)
      .map(({ content, status, result }) => {
        const parsed = ruleResultSchema.parse(result);
        return `Rule: ${content}\nStatus: ${status}\nSummary: ${parsed.summary}\nReasoning: ${parsed.reasoning}`;
      })
      .join("\n\n");
    const questionText = questions
      .filter(({ result }) => result)
      .map(({ content, result }) => {
        const parsed = questionResultSchema.parse(result);
        return `Question: ${content}\nAnswer: ${parsed.answer}\nReasoning: ${parsed.reasoning}`;
      })
      .join("\n\n");
    return `Rule Analysis:\n${ruleText}\n\nQuestion Analysis:\n${questionText}`;
  }

  private emit(runId: string, eventKey: string, event: PersistedComplianceEvent): Promise<number> {
    return this.dependencies.repository.appendRunEvent(runId, eventKey, event);
  }

  private emitActivity(runId: string, action: string, eventKey: string): Promise<number> {
    return this.emit(runId, eventKey, {
      type: "activity",
      action,
      timestamp: new Date().toISOString(),
      user: "System",
    });
  }

  private async ensureActive(runId: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new DOMException("Worker interrupted", "AbortError");
    }
    if (await this.dependencies.repository.isRunCancelled(runId)) {
      throw new ComplianceRunCancelledError();
    }
  }

  private async rethrowCancellation(runId: string, signal: AbortSignal): Promise<void> {
    if (await this.dependencies.repository.isRunCancelled(runId)) {
      throw new ComplianceRunCancelledError();
    }
    if (signal.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new DOMException("Worker interrupted", "AbortError");
    }
  }
}
