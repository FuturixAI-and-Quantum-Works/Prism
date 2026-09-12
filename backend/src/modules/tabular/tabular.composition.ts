import { getQueueRepository } from "../../jobs/repository.js";
import { completeText, completeTextWithInlineFile } from "../../lib/llm/index.js";
import { getUserModelSettings } from "../../lib/userSettings.js";
import { accessAuthority } from "../access/access.composition.js";
import { UsagePolicyService } from "../ai/usagePolicy.js";
import { createContentTextService } from "../content/contentText.service.js";
import { createTabularChat } from "./tabular.chat.js";
import { DrizzleTabularCellRepository } from "./tabular.cell.repository.js";
import { DrizzleTabularChatRepository } from "./tabular.chat.repository.js";
import { createTabularJobHandler, TabularGenerationService } from "./tabular.generation.js";
import { TabularAuthorizationPolicy } from "./tabular.policy.js";
import { DrizzleTabularReviewRepository } from "./tabular.review.repository.js";
import { createTabularRouter } from "./tabular.routes.js";
import { DrizzleTabularRunRepository } from "./tabular.run.repository.js";
import { TabularService } from "./tabular.service.js";
import type { DocumentCreator } from "../documents/documents.service.js";

function createDependencies() {
  const repositories = {
    reviews: new DrizzleTabularReviewRepository(),
    cells: new DrizzleTabularCellRepository(),
    chats: new DrizzleTabularChatRepository(),
    runs: new DrizzleTabularRunRepository(),
  };
  const policy = new TabularAuthorizationPolicy(accessAuthority);
  return { repositories, policy };
}

export function createProductionTabularService(documents: DocumentCreator): TabularService {
  const { repositories, policy } = createDependencies();
  return new TabularService(
    repositories,
    policy,
    {
      cancelJob: (jobId, now) => getQueueRepository().cancelJob(jobId, now),
    },
    new UsagePolicyService(),
    {
      filterAccessibleDocumentIds: (ids, userId, email) =>
        accessAuthority.filterDocumentIds({ userId, email }, ids),
      generatePrompt,
      streamChat: createTabularChat(repositories, documents),
    },
  );
}

export function createProductionTabularRouter(documents: DocumentCreator) {
  return createTabularRouter(createProductionTabularService(documents));
}

export function createProductionTabularJobHandler() {
  const { repositories, policy } = createDependencies();
  const generation = new TabularGenerationService({
    repositories: {
      reviews: repositories.reviews,
      runs: repositories.runs,
    },
    policy,
    content: createContentTextService(),
    usagePolicy: new UsagePolicyService(),
    getModelSettings: getUserModelSettings,
    completeText,
    completeTextWithInlineFile,
  });
  return createTabularJobHandler({ generation, repository: repositories.runs });
}

async function generatePrompt(
  userId: string,
  input: {
    title: string;
    format?: string;
    documentName?: string;
    tags?: readonly string[];
  },
): Promise<string> {
  const descriptions: Record<string, string> = {
    text: "free-form text",
    bulleted_list: "a bulleted list",
    number: "a single number",
    percentage: "a percentage value",
    monetary_amount: "a monetary amount",
    currency: "a currency code",
    yes_no: "Yes or No",
    date: "a date",
    tag: input.tags?.length ? `one of these tags: ${input.tags.join(", ")}` : "a tag",
  };
  const format = input.format ?? "text";
  const document = input.documentName ? `\nDocument type/name: ${input.documentName.trim()}` : "";
  const tags =
    format === "tag" && input.tags?.length ? `\nAvailable tags: ${input.tags.join(", ")}` : "";
  const { titleModel, aiRuntime } = await getUserModelSettings(userId);
  const raw = await completeText({
    model: titleModel,
    task: "title",
    systemPrompt:
      'You write high-quality column prompts for legal tabular review workflows. Return only valid JSON with a single field: {"prompt": string}. The prompt must focus solely on what to extract and never on response formatting.',
    user:
      `Column title: ${input.title}${document}\nExpected response format: ${descriptions[format] ?? "free-form text"}${tags}` +
      "\n\nWrite the best extraction prompt for a legal tabular review column with this title. Do not include response-format instructions.",
    maxTokens: 512,
    runtime: aiRuntime,
  });
  const parsed: unknown = JSON.parse(
    raw
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/, "")
      .trim(),
  );
  if (!parsed || typeof parsed !== "object") throw new Error("LLM returned an empty prompt");
  const prompt = Reflect.get(parsed, "prompt");
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("LLM returned an empty prompt");
  }
  return prompt.trim();
}
