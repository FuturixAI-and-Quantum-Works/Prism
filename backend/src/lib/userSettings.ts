import {
  DEFAULT_TITLE_MODEL,
  DEFAULT_TABULAR_MODEL,
  type AiRuntimeContext,
  type AiTarget,
} from "./llm/index.js";
import { getUserAiRuntime } from "./aiRegistry.js";

export type UserModelSettings = {
  titleModel: string;
  tabularModel: string;
  aiRuntime: AiRuntimeContext;
};

function availableFallback(
  runtime: AiRuntimeContext,
  task: "title" | "tabular",
  preference: AiTarget | undefined,
  fallback: string,
): string {
  const providers = new Set(runtime.connections.map(({ provider }) => provider));
  const preferredModel = runtime.models.find(({ id }) => id === preference?.modelId);
  const preferredConnection = runtime.connections.find(({ id }) => id === preference?.connectionId);
  if (
    preferredModel &&
    preferredConnection &&
    preferredConnection.provider === preferredModel.provider &&
    preferredModel.tasks.includes(task) &&
    (!preferredModel.connectionId || preferredModel.connectionId === preferredConnection.id)
  ) {
    return preferredModel.id;
  }
  return (
    runtime.models.find((model) => model.tasks.includes(task) && providers.has(model.provider))
      ?.id ?? fallback
  );
}

export async function getUserModelSettings(userId: string): Promise<UserModelSettings> {
  const aiRuntime = await getUserAiRuntime(userId);

  return {
    titleModel: availableFallback(
      aiRuntime,
      "title",
      aiRuntime.preferences?.title,
      DEFAULT_TITLE_MODEL,
    ),
    tabularModel: availableFallback(
      aiRuntime,
      "tabular",
      aiRuntime.preferences?.tabular,
      DEFAULT_TABULAR_MODEL,
    ),
    aiRuntime,
  };
}
