import { z } from "zod";
import { getUserAiRuntime } from "../../lib/aiRegistry.js";
import { createAttentionItemsForRisks } from "../../lib/attention.js";
import { hasAnyLlmProvider } from "../../lib/llm/errors.js";
import {
  completeText,
  resolveDefaultMainModel,
  type AiRuntimeContext,
} from "../../lib/llm/index.js";
import {
  createContentTextService,
  type ContentTextService,
} from "../content/contentText.service.js";
import type { RequestUserContext } from "./documents.models.js";
import { DocumentsRepository } from "./documents.repository.js";
import { DocumentContextService } from "./documents.context.service.js";
import { DocumentServiceError } from "./documents.service.js";

export type DocumentRisk = Readonly<{
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
  recommendation?: string;
  location?: string;
}>;

export type DocumentInsightsFailure =
  | Readonly<{ kind: "upstream"; operation: "summary" | "risks" }>
  | Readonly<{ kind: "invalid-response"; operation: "risks" }>;

export class DocumentInsightsError extends DocumentServiceError {
  constructor(
    readonly failure: DocumentInsightsFailure,
    options?: ErrorOptions,
  ) {
    super(
      502,
      failure.kind === "upstream"
        ? "The AI provider could not generate document insights."
        : "The AI provider returned invalid document insights.",
      options,
    );
    this.name = "DocumentInsightsError";
  }
}

type Completion = (input: {
  model: string;
  task: "main";
  systemPrompt: string;
  user: string;
  maxTokens: number;
  runtime: AiRuntimeContext;
}) => Promise<string>;

export type DocumentInsightsDependencies = Readonly<{
  content: ContentTextService;
  complete: Completion;
  runtimeForUser: typeof getUserAiRuntime;
  modelForRuntime: typeof resolveDefaultMainModel;
  createAttentionItems: typeof createAttentionItemsForRisks;
}>;

const defaultDependencies: DocumentInsightsDependencies = {
  content: createContentTextService(),
  complete: completeText,
  runtimeForUser: getUserAiRuntime,
  modelForRuntime: resolveDefaultMainModel,
  createAttentionItems: createAttentionItemsForRisks,
};

const documentRiskSchema = z
  .object({
    title: z.string(),
    severity: z.enum(["high", "medium", "low"]),
    description: z.string(),
    recommendation: z.string().optional(),
    location: z.string().optional(),
  })
  .transform((risk): DocumentRisk => ({
    title: risk.title.slice(0, 100),
    severity: risk.severity,
    description: risk.description.slice(0, 500),
    recommendation: risk.recommendation?.slice(0, 300),
    location: risk.location?.slice(0, 200),
  }));
const documentRisksSchema = z.array(documentRiskSchema);

function parseRisks(response: string): DocumentRisk[] {
  const cleaned = response
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/, "")
    .trim();
  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch (error) {
    throw new DocumentInsightsError(
      { kind: "invalid-response", operation: "risks" },
      { cause: error },
    );
  }
  const parsed = documentRisksSchema.safeParse(value);
  if (!parsed.success) {
    throw new DocumentInsightsError(
      { kind: "invalid-response", operation: "risks" },
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

export class DocumentInsightsService {
  constructor(
    private readonly repository = new DocumentsRepository(),
    private readonly context = new DocumentContextService(repository),
    private readonly dependencies: DocumentInsightsDependencies = defaultDependencies,
  ) {}

  private async summary(
    text: string,
    filename: string,
    model: string,
    runtime: AiRuntimeContext,
  ): Promise<string[]> {
    if (text.trim().length < 50) return ["Document content is too short to summarize."];
    if (!hasAnyLlmProvider(runtime)) {
      return ["Connect an AI API key in settings to generate insights for this document."];
    }
    try {
      const response = await this.dependencies.complete({
        model,
        task: "main",
        systemPrompt:
          'Summarize the legal document in 3-5 single-sentence bullets. Return only lines beginning with "- ".',
        user: `Summarize this document titled "${filename}":\n\n${text.slice(0, 15_000)}`,
        maxTokens: 500,
        runtime,
      });
      const bullets = response
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^[•*-]\s*/.test(line))
        .map((line) => line.replace(/^[•*-]\s*/, "").trim())
        .filter(Boolean);
      return bullets.length > 0 ? bullets : ["Summary could not be generated."];
    } catch (error) {
      throw new DocumentInsightsError({ kind: "upstream", operation: "summary" }, { cause: error });
    }
  }

  private async risks(
    text: string,
    filename: string,
    model: string,
    runtime: AiRuntimeContext,
  ): Promise<DocumentRisk[]> {
    if (text.trim().length < 50 || !hasAnyLlmProvider(runtime)) return [];
    let response: string;
    try {
      response = await this.dependencies.complete({
        model,
        task: "main",
        systemPrompt:
          'Identify 2-5 legal, contractual, or compliance risks. Return only a JSON array of objects with title, severity ("high", "medium", or "low"), description, optional recommendation, and optional location.',
        user: `Analyze risks in this document titled "${filename}":\n\n${text.slice(0, 15_000)}`,
        maxTokens: 1200,
        runtime,
      });
    } catch (error) {
      throw new DocumentInsightsError({ kind: "upstream", operation: "risks" }, { cause: error });
    }
    return parseRisks(response);
  }

  private async analyze(
    id: string,
    filename: string,
    fileType: string | null,
    model: string,
    runtime: AiRuntimeContext,
  ): Promise<{
    id: string;
    filename: string;
    summary: string[];
    risks: DocumentRisk[];
  }> {
    let text: string;
    try {
      text = await this.dependencies.content.extract({ kind: "document", id, fileType });
    } catch {
      return {
        id,
        filename,
        summary: ["Document content could not be read."],
        risks: [],
      };
    }
    const [summary, risks] = await Promise.all([
      this.summary(text, filename, model, runtime),
      this.risks(text, filename, model, runtime),
    ]);
    return { id, filename, summary, risks };
  }

  async generate(actor: RequestUserContext, documentId: string) {
    const document = await this.repository.findDocumentById(documentId);
    if (!document) throw new DocumentServiceError(404, "Document not found");
    const contextRows = await this.context.readableRows(actor, documentId);
    const runtime = await this.dependencies.runtimeForUser(actor.userId);
    const model = this.dependencies.modelForRuntime(runtime);
    const mainDocument = await this.analyze(
      document.id,
      document.filename,
      document.fileType,
      model,
      runtime,
    );
    const contextFiles = [];
    for (const row of contextRows) {
      contextFiles.push(
        await this.analyze(row.contextDocumentId, row.filename, row.fileType, model, runtime),
      );
    }
    for (const analyzed of [mainDocument, ...contextFiles]) {
      const actionable = analyzed.risks.filter(
        ({ severity }) => severity === "high" || severity === "medium",
      );
      if (actionable.length > 0) {
        await this.dependencies.createAttentionItems(actor.userId, analyzed.id, actionable);
      }
    }
    return { mainDocument, contextFiles };
  }
}
