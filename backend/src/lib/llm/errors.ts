import type { AiRuntimeContext } from "./types.js";

const MISSING_LLM_API_KEY_MESSAGE =
  "Connect a Gemini, OpenAI, or Claude API key in settings to use the AI assistant.";

export class MissingLlmApiKeyError extends Error {
  readonly code = "missing_llm_api_key";

  constructor() {
    super(MISSING_LLM_API_KEY_MESSAGE);
    this.name = "MissingLlmApiKeyError";
  }
}

function walkCauses(error: unknown): object[] {
  const chain: object[] = [];
  let current = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = Reflect.get(current, "cause");
  }
  return chain;
}

export function hasAnyLlmProvider(runtime?: AiRuntimeContext): boolean {
  return Boolean(runtime?.connections.length);
}

function combinedErrorText(chain: object[]): string {
  return chain
    .map((item) => {
      const rawMessage = Reflect.get(item, "message");
      const message = typeof rawMessage === "string" ? rawMessage : "";
      let serialized: string;
      try {
        serialized = JSON.stringify(item);
      } catch {
        serialized = "";
      }
      return `${message} ${serialized}`;
    })
    .join("\n");
}

function isAuthError(chain: object[]): boolean {
  const status = chain.find((item) => {
    const value = Reflect.get(item, "status") ?? Reflect.get(item, "statusCode");
    return value === 401 || value === 403;
  });
  if (status) return true;

  const text = combinedErrorText(chain);
  return /invalid x-api-key|authentication_error|api key not valid|invalid api key|incorrect api key|permission_denied|unauthorized|forbidden/i.test(
    text,
  );
}

export function llmErrorMessage(error: unknown): string {
  const chain = walkCauses(error);
  if (chain.some((item) => item instanceof MissingLlmApiKeyError)) {
    return MISSING_LLM_API_KEY_MESSAGE;
  }

  if (isAuthError(chain)) {
    return "The selected AI provider rejected its API key. Update the Gemini, OpenAI, or Claude key in settings and try again.";
  }

  const network = chain.find((item) => typeof Reflect.get(item, "code") === "string");
  const rawCode = network ? Reflect.get(network, "code") : null;
  const rawHostname = network ? Reflect.get(network, "hostname") : null;
  const code = typeof rawCode === "string" ? rawCode : null;
  const hostname = typeof rawHostname === "string" ? rawHostname : null;

  if (code === "ENOTFOUND" && hostname) {
    const provider = hostname.includes("generativelanguage.googleapis.com")
      ? "Gemini"
      : hostname.includes("anthropic.com")
        ? "Claude"
        : hostname.includes("openai.com")
          ? "OpenAI"
          : "LLM provider";
    return `${provider} is unreachable from this machine: DNS lookup failed for ${hostname}. Check internet/DNS access or choose another configured model.`;
  }

  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ECONNRESET") {
    return "The selected AI provider could not be reached from this machine. Check network access or choose another configured model.";
  }

  const message = chain
    .map((item) => {
      const rawMessage = Reflect.get(item, "message");
      return typeof rawMessage === "string" ? rawMessage : "";
    })
    .find(Boolean);
  return message || "The AI provider request failed.";
}
