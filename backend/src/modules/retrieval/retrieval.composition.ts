import type { AppConfig } from "../../config.js";
import { RetrievalProviderClient } from "./retrieval.provider.js";

export let retrievalProvider = new RetrievalProviderClient();

export function configureRetrieval(
  config: AppConfig["rag"],
  environment: AppConfig["runtime"]["kind"],
): void {
  retrievalProvider =
    config.kind === "qdrant"
      ? new RetrievalProviderClient(
          { url: config.url, apiKey: config.apiKey },
          {
            environment,
            requestTimeoutMs: config.requestTimeoutMs,
          },
        )
      : new RetrievalProviderClient({}, { environment });
}
