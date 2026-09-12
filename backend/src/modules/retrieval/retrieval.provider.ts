import { createHash } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { z } from "zod";
import { decodeDocumentContent, DocumentContentError } from "../content/documentContent.js";
import {
  DEFAULT_RETRIEVAL_REQUEST_TIMEOUT_MS,
  QDRANT_BM25_MODEL,
  QDRANT_BM25_VECTOR_NAME,
  QDRANT_CHUNK_CHARS,
  QDRANT_CHUNK_OVERLAP,
  QDRANT_DENSE_MODEL,
  QDRANT_DENSE_VECTOR_NAME,
  QDRANT_DENSE_VECTOR_SIZE,
  QDRANT_UPSERT_BATCH_SIZE,
  RETRIEVAL_DISABLED_MESSAGE,
  RetrievalProviderError,
  normalizeRetrievalError,
  parseRetrievalConfiguration,
  type RetrievalConfiguration,
  type RetrievalProviderInput,
} from "./retrieval.config.js";
import type {
  RetrievalConfigurationStatus,
  RetrievalScope,
  RetrievalSearchResult,
} from "./retrieval.types.js";

export type RetrievalVectorStore = Pick<
  QdrantClient,
  | "getCollections"
  | "collectionExists"
  | "createCollection"
  | "createPayloadIndex"
  | "upsert"
  | "query"
  | "delete"
  | "getCollection"
>;

type RetrievalProviderOptions = Readonly<{
  environment?: string;
  client?: RetrievalVectorStore;
  fetch?: typeof fetch;
  requestTimeoutMs?: number;
}>;

type IngestSource = Readonly<{
  filename?: string;
  mimeType?: string;
}>;

type IngestResponse = Readonly<{
  status?: "completed" | "partial" | "failed";
  total?: number;
  results?: ReadonlyArray<
    Readonly<{
      status?: "success" | "error";
      document_id?: string;
      error?: string;
    }>
  >;
  collection?: string;
}>;

type TextChunk = Readonly<{
  text: string;
  page_number?: number;
}>;

const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);
const optionalNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined);
const queryPointSchema = z.object({
  score: optionalNumber,
  payload: z.object({
    document_id: z.string(),
    document_name: optionalString,
    text: optionalString,
    page_number: optionalNumber,
    document_context: optionalString,
    document_url: optionalString,
    metadata: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform((value) => value ?? undefined),
  }),
});

function sanitizeCollectionPart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "sources"
  );
}

function collectionNameFor(scope: RetrievalScope): string {
  const name = ["prism", sanitizeCollectionPart(scope.type), sanitizeCollectionPart(scope.id)].join(
    "_",
  );
  return name.slice(0, 255);
}

function documentInference(text: string) {
  return {
    [QDRANT_DENSE_VECTOR_NAME]: { text, model: QDRANT_DENSE_MODEL },
    [QDRANT_BM25_VECTOR_NAME]: { text, model: QDRANT_BM25_MODEL },
  };
}

function pointId(documentId: string, chunkIndex: number): string {
  const bytes = Buffer.from(
    createHash("sha1").update(`prism-rag:${documentId}:${chunkIndex}`).digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function filenameFromResponse(response: Response, url: string): string {
  const disposition = response.headers.get("content-disposition");
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  const quoted = disposition?.match(/filename="([^"]+)"/i)?.[1];
  if (quoted) return quoted;
  const plain = disposition?.match(/filename=([^;]+)/i)?.[1];
  if (plain) return decodeURIComponent(plain.trim());
  try {
    const leaf = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    if (leaf) return decodeURIComponent(leaf);
  } catch {
    return "document";
  }
  return "document";
}

function splitPages(text: string): TextChunk[] {
  const matches = [...text.matchAll(/\[Page (\d+)\]\s*/g)];
  if (matches.length === 0) {
    const trimmed = text.trim();
    return trimmed ? [{ text: trimmed }] : [];
  }
  return matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? text.length;
      return {
        text: text.slice(start, end).trim(),
        page_number: Number.parseInt(match[1]!, 10),
      };
    })
    .filter((page) => page.text);
}

function windowText(page: TextChunk): TextChunk[] {
  if (page.text.length <= QDRANT_CHUNK_CHARS) return [page];
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < page.text.length) {
    const end = Math.min(start + QDRANT_CHUNK_CHARS, page.text.length);
    chunks.push({ text: page.text.slice(start, end).trim(), page_number: page.page_number });
    if (end >= page.text.length) break;
    start = Math.max(end - QDRANT_CHUNK_OVERLAP, start + 1);
  }
  return chunks.filter((chunk) => chunk.text);
}

function chunkDocumentText(text: string): TextChunk[] {
  return splitPages(text).flatMap(windowText);
}

function abortError(signal: AbortSignal): DOMException {
  const timedOut = signal.reason instanceof DOMException && signal.reason.name === "TimeoutError";
  return new DOMException(
    timedOut ? "The operation timed out." : "The operation was aborted.",
    timedOut ? "TimeoutError" : "AbortError",
  );
}

async function withAbort<T>(signal: AbortSignal, operation: Promise<T>): Promise<T> {
  if (signal.aborted) throw abortError(signal);
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function collectionExistsFlag(result: boolean | { exists: boolean }): boolean {
  return typeof result === "boolean" ? result : result.exists;
}

export class RetrievalProviderClient {
  private readonly configuration: RetrievalConfiguration;
  private readonly fetcher: typeof fetch;
  private readonly requestTimeoutMs: number;
  private store: RetrievalVectorStore | null;

  constructor(input: RetrievalProviderInput = {}, options: RetrievalProviderOptions = {}) {
    this.configuration = parseRetrievalConfiguration(input, options.environment);
    this.fetcher = options.fetch ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_RETRIEVAL_REQUEST_TIMEOUT_MS;
    this.store = options.client ?? null;
  }

  get status(): RetrievalConfigurationStatus {
    return this.configuration.status;
  }

  get isConfigured(): boolean {
    return this.configuration.status === "configured";
  }

  async health(signal?: AbortSignal): Promise<{ ok: boolean; status?: string; error?: string }> {
    if (this.configuration.status === "disabled") {
      return { ok: false, status: "disabled", error: RETRIEVAL_DISABLED_MESSAGE };
    }

    try {
      await this.run("RAG health check", signal, (client) => client.getCollections());
      return { ok: true, status: "ok" };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async createCollection(scope: RetrievalScope, signal?: AbortSignal): Promise<string> {
    const name = collectionNameFor(scope);
    const exists = await this.run("RAG collection lookup", signal, (client) =>
      client.collectionExists(name),
    );
    if (collectionExistsFlag(exists)) return name;

    await this.run("RAG collection create", signal, (client) =>
      client.createCollection(name, {
        vectors: {
          [QDRANT_DENSE_VECTOR_NAME]: {
            size: QDRANT_DENSE_VECTOR_SIZE,
            distance: "Cosine",
          },
        },
        sparse_vectors: {
          [QDRANT_BM25_VECTOR_NAME]: {
            modifier: "idf",
          },
        },
      }),
    );
    await this.run("RAG payload index create", signal, (client) =>
      client.createPayloadIndex(name, {
        wait: true,
        field_name: "document_id",
        field_schema: "keyword",
      }),
    );
    return name;
  }

  async ingestDocument(
    collectionName: string,
    documentId: string,
    url: string,
    signal?: AbortSignal,
    source?: IngestSource,
  ): Promise<IngestResponse> {
    this.requireConfiguration();
    const response = await this.fetcher(url, { signal: this.requestSignal(signal) });
    if (!response.ok) {
      throw new RetrievalProviderError(
        normalizeRetrievalError(await response.text(), "RAG ingest", response.status),
      );
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const filename = source?.filename || filenameFromResponse(response, url);
    const mimeType =
      source?.mimeType || response.headers.get("content-type")?.split(";")[0]?.trim() || undefined;

    let extracted;
    try {
      extracted = await decodeDocumentContent({
        output: "text",
        bytes,
        filename,
        mimeType,
        signal,
      });
    } catch (error) {
      if (error instanceof DocumentContentError && error.code === "unsupported-format") {
        const extension = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
        throw new RetrievalProviderError(
          normalizeRetrievalError(
            `Unsupported file format: ${extension ? `.${extension}` : filename}`,
            "RAG ingest",
          ),
        );
      }
      throw new RetrievalProviderError(normalizeRetrievalError(error, "RAG ingest"));
    }

    const chunks = chunkDocumentText(extracted.text);
    if (chunks.length === 0) {
      throw new RetrievalProviderError(
        normalizeRetrievalError("RAG ingest failed: no extractable text", "RAG ingest"),
      );
    }

    await this.run("RAG document delete", signal, (client) =>
      client.delete(collectionName, {
        wait: true,
        filter: {
          must: [{ key: "document_id", match: { value: documentId } }],
        },
      }),
    );

    for (let offset = 0; offset < chunks.length; offset += QDRANT_UPSERT_BATCH_SIZE) {
      const batch = chunks.slice(offset, offset + QDRANT_UPSERT_BATCH_SIZE);
      await this.run("RAG ingest", signal, (client) =>
        client.upsert(collectionName, {
          wait: true,
          points: batch.map((chunk, index) => ({
            id: pointId(documentId, offset + index),
            vector: documentInference(chunk.text),
            payload: {
              document_id: documentId,
              document_name: filename,
              text: chunk.text,
              page_number: chunk.page_number,
              mime_type: mimeType,
            },
          })),
        }),
      );
    }

    return {
      status: "completed",
      total: chunks.length,
      collection: collectionName,
      results: [{ status: "success", document_id: documentId }],
    };
  }

  async queryCollection(
    collectionName: string,
    query: string,
    topK = 8,
    signal?: AbortSignal,
  ): Promise<RetrievalSearchResult[]> {
    const prefetchLimit = Math.max(topK * 4, topK);
    const result = await this.run("RAG query", signal, (client) =>
      client.query(collectionName, {
        prefetch: [
          {
            query: { text: query, model: QDRANT_DENSE_MODEL },
            using: QDRANT_DENSE_VECTOR_NAME,
            limit: prefetchLimit,
          },
          {
            query: { text: query, model: QDRANT_BM25_MODEL },
            using: QDRANT_BM25_VECTOR_NAME,
            limit: prefetchLimit,
          },
        ],
        query: { fusion: "rrf" },
        limit: topK,
        with_payload: true,
      }),
    );

    return result.points.flatMap((point, index) => {
      const parsed = queryPointSchema.safeParse(point);
      if (!parsed.success) return [];
      return [
        {
          rank: index + 1,
          document_name: parsed.data.payload.document_name,
          document_id: parsed.data.payload.document_id,
          page_number: parsed.data.payload.page_number,
          text: parsed.data.payload.text,
          document_context: parsed.data.payload.document_context,
          vector_score: parsed.data.score,
          combined_score: parsed.data.score,
          metadata: parsed.data.payload.metadata,
          document_url: parsed.data.payload.document_url,
        } satisfies RetrievalSearchResult,
      ];
    });
  }

  async deleteDocument(
    collectionName: string,
    documentId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.run("RAG document delete", signal, (client) =>
      client.delete(collectionName, {
        wait: true,
        filter: {
          must: [{ key: "document_id", match: { value: documentId } }],
        },
      }),
    );
  }

  async collectionStats(collectionName: string, signal?: AbortSignal): Promise<unknown> {
    return this.run("RAG collection stats", signal, (client) =>
      client.getCollection(collectionName),
    );
  }

  private requireConfiguration(): Extract<RetrievalConfiguration, { status: "configured" }> {
    if (this.configuration.status === "configured") return this.configuration;
    throw new RetrievalProviderError({
      summary: RETRIEVAL_DISABLED_MESSAGE,
      code: "rag_disabled",
      category: "config",
      retryable: false,
      retryAfterSeconds: null,
      details: {},
    });
  }

  private client(): RetrievalVectorStore {
    const configuration = this.requireConfiguration();
    if (this.store) return this.store;
    this.store = new QdrantClient({
      url: configuration.url,
      apiKey: configuration.apiKey || undefined,
      timeout: this.requestTimeoutMs,
      checkCompatibility: false,
    });
    return this.store;
  }

  private async run<T>(
    operation: string,
    signal: AbortSignal | undefined,
    work: (client: RetrievalVectorStore) => Promise<T>,
  ): Promise<T> {
    const client = this.client();
    const requestSignal = this.requestSignal(signal);
    try {
      if (requestSignal.aborted) throw abortError(requestSignal);
      return await withAbort(requestSignal, work(client));
    } catch (error) {
      throw new RetrievalProviderError(normalizeRetrievalError(error, operation));
    }
  }

  private requestSignal(signal?: AbortSignal): AbortSignal {
    const timeout = AbortSignal.timeout(this.requestTimeoutMs);
    return signal ? AbortSignal.any([signal, timeout]) : timeout;
  }
}
