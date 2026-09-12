import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  normalizeRetrievalError,
  parseRetrievalConfiguration,
} from "../../src/modules/retrieval/retrieval.config.js";
import {
  RetrievalProviderClient,
  type RetrievalVectorStore,
} from "../../src/modules/retrieval/retrieval.provider.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const configuredProvider = {
  url: "https://qdrant.example.com",
  apiKey: "test-api-key",
} as const;

function vectorStore(overrides: Partial<RetrievalVectorStore> = {}): RetrievalVectorStore {
  const unexpected = async (): Promise<never> => {
    throw new Error("Unexpected vector-store call");
  };
  return {
    getCollections: unexpected,
    collectionExists: unexpected,
    createCollection: unexpected,
    createPayloadIndex: unexpected,
    upsert: unexpected,
    query: unexpected,
    delete: unexpected,
    getCollection: unexpected,
    ...overrides,
  };
}

describe("RAG configuration fail-safe", () => {
  it("disables RAG without an endpoint and performs zero fetches", async () => {
    let fetchCount = 0;
    const service = new RetrievalProviderClient(undefined, {
      fetch: async () => {
        fetchCount += 1;
        return new Response();
      },
    });

    assert.equal(service.status, "disabled");
    assert.equal(service.isConfigured, false);
    assert.equal("configuredUrl" in service, false);
    assert.deepEqual(await service.health(), {
      ok: false,
      status: "disabled",
      error: "RAG is disabled because QDRANT_URL is not configured.",
    });

    const operations = [
      service.createCollection({
        type: "personal",
        id: "user-1",
        name: "Personal",
      }),
      service.ingestDocument("collection", "document", "https://signed.example"),
      service.queryCollection("collection", "query"),
      service.deleteDocument("collection", "document"),
      service.collectionStats("collection"),
    ];

    for (const operation of operations) {
      await assert.rejects(operation, (error: unknown) => {
        assert.equal(
          error instanceof Error ? error.message : "",
          "RAG is disabled because QDRANT_URL is not configured.",
        );
        return true;
      });
    }

    assert.equal(fetchCount, 0);
  });

  it("validates configured endpoints without exposing them", () => {
    assert.deepEqual(parseRetrievalConfiguration(undefined), { status: "disabled" });
    assert.throws(
      () => parseRetrievalConfiguration({ url: "not a URL", apiKey: "test-api-key" }, "production"),
      /valid absolute URL/,
    );
    assert.throws(
      () =>
        parseRetrievalConfiguration(
          { url: "http://qdrant.example.com", apiKey: "test-api-key" },
          "production",
        ),
      /must use HTTPS/,
    );
    assert.throws(
      () =>
        parseRetrievalConfiguration(
          { url: "http://qdrant.example.com", apiKey: "test-api-key" },
          "development",
        ),
      /must use HTTPS/,
    );
    assert.deepEqual(
      parseRetrievalConfiguration({ url: "http://localhost:6333/" }, "development"),
      {
        status: "configured",
        url: "http://localhost:6333",
        apiKey: "",
      },
    );

    const service = new RetrievalProviderClient(configuredProvider);
    assert.equal(service.status, "configured");
    assert.equal("configuredUrl" in service, false);
  });

  it("omits the private endpoint from source health contracts", async () => {
    const [routeSource, frontendSource] = await Promise.all([
      readFile(resolve(testDirectory, "../../src/routes/sources.ts"), "utf8"),
      readFile(
        resolve(testDirectory, "../../../frontend/src/client/store/api/sourcesApi.ts"),
        "utf8",
      ),
    ]);

    assert.doesNotMatch(routeSource, /rag_api_url|configuredUrl/);
    assert.doesNotMatch(frontendSource, /rag_api_url|configuredUrl/);
  });

  it("contains no private fallback endpoint", async () => {
    const source = await readFile(
      resolve(testDirectory, "../../src/modules/retrieval/retrieval.provider.ts"),
      "utf8",
    );

    assert.doesNotMatch(source, /workspaces_rag\.futurixai\.com/i);
    assert.doesNotMatch(source, /futurixai\.com/i);
  });

  it("combines caller cancellation with the request timeout", async () => {
    let queryCount = 0;
    const service = new RetrievalProviderClient(configuredProvider, {
      requestTimeoutMs: 60_000,
      client: vectorStore({
        query: () => {
          queryCount += 1;
          return new Promise<never>(() => undefined);
        },
      }),
    });
    const controller = new AbortController();

    const operation = service.queryCollection("collection", "query", 8, controller.signal);
    controller.abort();
    await assert.rejects(operation, (error: unknown) => {
      assert.equal(error instanceof Error ? error.message : "", "RAG query was cancelled.");
      return true;
    });
    assert.equal(queryCount, 1);
  });

  it("rejects malformed provider result entries", async () => {
    const service = new RetrievalProviderClient(configuredProvider, {
      client: vectorStore({
        query: async () =>
          ({
            points: [{ score: 0.9, payload: { document_id: 42 } }],
          }) as never,
      }),
    });

    assert.deepEqual(await service.queryCollection("collection", "query"), []);
  });

  it("classifies cancellation and timeout failures as retryable", () => {
    assert.deepEqual(normalizeRetrievalError(new DOMException("", "AbortError")), {
      summary: "RAG operation was cancelled.",
      code: "request_cancelled",
      category: "network",
      retryable: true,
      retryAfterSeconds: null,
      details: { error_name: "AbortError" },
    });
    assert.equal(
      normalizeRetrievalError(new DOMException("", "TimeoutError")).code,
      "request_timeout",
    );
  });
});
