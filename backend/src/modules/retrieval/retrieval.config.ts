import type { NormalizedRetrievalError } from "./retrieval.types.js";

export const DEFAULT_RETRIEVAL_REQUEST_TIMEOUT_MS = 15_000;
export const RETRIEVAL_DISABLED_MESSAGE = "RAG is disabled because QDRANT_URL is not configured.";
export const QDRANT_DENSE_VECTOR_NAME = "dense";
export const QDRANT_BM25_VECTOR_NAME = "bm25";
export const QDRANT_DENSE_MODEL = "sentence-transformers/all-minilm-l6-v2";
export const QDRANT_BM25_MODEL = "qdrant/bm25";
export const QDRANT_DENSE_VECTOR_SIZE = 384;
export const QDRANT_CHUNK_CHARS = 700;
export const QDRANT_CHUNK_OVERLAP = 120;
export const QDRANT_UPSERT_BATCH_SIZE = 32;

export type RetrievalProviderInput = Readonly<{
  url?: string;
  apiKey?: string;
}>;

export type RetrievalConfiguration =
  | Readonly<{ status: "disabled" }>
  | Readonly<{ status: "configured"; url: string; apiKey: string }>;

export class RetrievalProviderError extends Error {
  constructor(readonly normalized: NormalizedRetrievalError) {
    super(normalized.summary);
    this.name = "RetrievalProviderError";
  }
}

function isLocalDevelopmentUrl(url: URL, environment: string | undefined): boolean {
  return (
    environment === "development" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1")
  );
}

export function parseRetrievalConfiguration(
  input: RetrievalProviderInput = {},
  environment = "development",
): RetrievalConfiguration {
  const value = input.url?.trim();
  const apiKey = input.apiKey?.trim() ?? "";
  if (!value) {
    if (apiKey) throw new Error("QDRANT_URL and QDRANT_API_KEY must be configured together.");
    return { status: "disabled" };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("QDRANT_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:" && !isLocalDevelopmentUrl(url, environment)) {
    throw new Error("QDRANT_URL must use HTTPS outside local development.");
  }
  if (url.username || url.password) {
    throw new Error("QDRANT_URL must not include credentials.");
  }
  if (url.search || url.hash) {
    throw new Error("QDRANT_URL must not include a query string or fragment.");
  }
  if (!apiKey && !isLocalDevelopmentUrl(url, environment)) {
    throw new Error("QDRANT_API_KEY is required when QDRANT_URL is set.");
  }

  return {
    status: "configured",
    url: url.toString().replace(/\/$/, ""),
    apiKey,
  };
}

function maybeParseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed))
      : null;
  } catch {
    return null;
  }
}

function pickString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickBoolean(source: Record<string, unknown>, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function extractField(raw: string, key: string): string | null {
  const match = raw.match(new RegExp(`['"]${key}['"]\\s*:\\s*['"]([^'"]+)['"]`));
  return match?.[1] ?? null;
}

function extractNumber(raw: string, key: string): number | null {
  const match = raw.match(new RegExp(`['"]${key}['"]\\s*:\\s*(\\d+)`));
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractBoolean(raw: string, key: string): boolean | null {
  const match = raw.match(new RegExp(`['"]${key}['"]\\s*:\\s*(true|false|True|False)`));
  return match ? match[1].toLowerCase() === "true" : null;
}

function payloadText(raw: string): string {
  const match = raw.match(/Error code:\s*\d+\s*-\s*({[\s\S]*})/);
  return match?.[1] ?? raw;
}

export function normalizeRetrievalError(
  error: unknown,
  operation = "RAG operation",
  statusCode?: number,
): NormalizedRetrievalError {
  if (error instanceof RetrievalProviderError) return error.normalized;
  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    const timedOut = error.name === "TimeoutError";
    return {
      summary: timedOut ? `${operation} timed out.` : `${operation} was cancelled.`,
      code: timedOut ? "request_timeout" : "request_cancelled",
      category: "network",
      retryable: true,
      retryAfterSeconds: null,
      details: { error_name: error.name },
    };
  }

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  const unsupportedMatch = raw.match(/Unsupported file format:\s*([^\s"'.,)]+)/i);
  if (unsupportedMatch) {
    const extension = unsupportedMatch[1];
    return {
      summary: `Unsupported file format for RAG indexing: ${extension}.`,
      code: "unsupported_file_format",
      category: "source_format",
      retryable: false,
      retryAfterSeconds: null,
      details: { raw, extension },
    };
  }

  if (/division by zero/i.test(raw)) {
    return {
      summary:
        "RAG provider failed while processing this file (division by zero). This is a provider-side indexing bug; retry later or try converting the file to PDF.",
      code: "provider_processing_error",
      category: "provider_bug",
      retryable: true,
      retryAfterSeconds: null,
      details: { raw, error_name: "division_by_zero" },
    };
  }

  const payload = payloadText(raw);
  const parsed = maybeParseJsonObject(payload) ?? {};
  const title = pickString(parsed, "title") ?? extractField(payload, "title");
  const detail = pickString(parsed, "detail") ?? extractField(payload, "detail");
  const errorCode =
    pickNumber(parsed, "error_code") ?? extractNumber(payload, "error_code") ?? statusCode ?? null;
  const errorName = pickString(parsed, "error_name") ?? extractField(payload, "error_name");
  const category = pickString(parsed, "error_category") ?? extractField(payload, "error_category");
  const retryable =
    pickBoolean(parsed, "retryable") ??
    extractBoolean(payload, "retryable") ??
    (typeof errorCode === "number" && errorCode >= 500);
  const retryAfter = pickNumber(parsed, "retry_after") ?? extractNumber(payload, "retry_after");
  const isCloudflareTunnel =
    errorCode === 1033 ||
    /cloudflare tunnel|error 1033|tunnel_error/i.test(raw) ||
    /cloudflare tunnel|error 1033|tunnel_error/i.test(`${title ?? ""} ${detail ?? ""}`);
  const retryText = retryAfter ? ` Retry after about ${retryAfter} seconds.` : "";
  const summary = isCloudflareTunnel
    ? `RAG embedding service is temporarily unreachable (Cloudflare tunnel error 1033).${retryText}`
    : `${operation} failed${statusCode ? ` (${statusCode})` : ""}: ${detail ?? title ?? raw.slice(0, 240)}`;

  return {
    summary,
    code: errorCode ? String(errorCode) : errorName,
    category: category ?? (isCloudflareTunnel ? "config" : null),
    retryable: Boolean(retryable || isCloudflareTunnel),
    retryAfterSeconds: retryAfter,
    details: {
      raw,
      title,
      detail,
      error_code: errorCode,
      error_name: errorName,
      error_category: category,
      retryable: Boolean(retryable || isCloudflareTunnel),
      retry_after: retryAfter,
    },
  };
}
