import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  normalizeRetrievalError,
  parseRetrievalConfiguration,
} from "../../src/modules/retrieval/retrieval.config.js";
import { RetrievalProviderClient } from "../../src/modules/retrieval/retrieval.provider.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));

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
      error: "RAG is disabled because RAG_API_URL is not configured.",
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
          "RAG is disabled because RAG_API_URL is not configured.",
        );
        return true;
      });
    }

    assert.equal(fetchCount, 0);
  });

  it("validates configured endpoints without exposing them", () => {
    assert.deepEqual(parseRetrievalConfiguration(undefined), { status: "disabled" });
    assert.throws(
      () => parseRetrievalConfiguration("not a URL", "production"),
      /valid absolute URL/,
    );
    assert.throws(
      () => parseRetrievalConfiguration("http://rag.example.com", "production"),
      /must use HTTPS/,
    );
    assert.throws(
      () => parseRetrievalConfiguration("http://rag.example.com", "development"),
      /must use HTTPS/,
    );
    assert.deepEqual(parseRetrievalConfiguration("http://localhost:8080/", "development"), {
      status: "configured",
      baseUrl: "http://localhost:8080",
    });

    const service = new RetrievalProviderClient("https://private-rag.example.com");
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
    let requestSignal: AbortSignal | undefined;
    const service = new RetrievalProviderClient("https://rag.example.com", {
      requestTimeoutMs: 60_000,
      fetch: async (_input, init) => {
        requestSignal = init?.signal ?? undefined;
        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    const controller = new AbortController();

    await service.queryCollection("collection", "query", 8, controller.signal);
    assert.equal(requestSignal?.aborted, false);
    controller.abort();
    assert.equal(requestSignal?.aborted, true);
  });

  it("rejects malformed provider result entries", async () => {
    const service = new RetrievalProviderClient("https://rag.example.com", {
      fetch: async () =>
        new Response(JSON.stringify({ results: [{ rank: "first", document_id: "document-1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
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
