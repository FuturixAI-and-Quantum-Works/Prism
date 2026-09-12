import {
  parseCitationBlock,
  type CitationBlockResult,
  type StreamDataEvent,
} from "@prism/protocol";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamChatParams } from "../../src/lib/llm/types.js";
import type { ToolExecutionContext } from "../../src/modules/ai/tools/types.js";

const mocks = vi.hoisted(() => ({
  streamChatWithTools: vi.fn(),
  toolExecute: vi.fn(),
}));

vi.mock("../../src/lib/llm/index.js", () => ({
  resolveDefaultMainModel: () => "test-model",
  resolveModel: () => "test-model",
  streamChatWithTools: mocks.streamChatWithTools,
}));

vi.mock("../../src/modules/ai/tools/registry.js", () => ({
  getAiToolSchemas: () => [],
  toolRegistry: { execute: mocks.toolExecute },
}));

import { runLLMStream } from "../../src/modules/ai/tools/runtimeCoordinator.js";

async function runWithDeltas(
  deltas: readonly string[],
  options: {
    citationParser?: (text: string) => CitationBlockResult<unknown>;
    toolBoundaryAfter?: number;
  } = {},
) {
  const { citationParser, toolBoundaryAfter } = options;
  if (toolBoundaryAfter !== undefined) {
    mocks.toolExecute.mockResolvedValueOnce({
      role: "tool",
      tool_call_id: "call-1",
      content: '{"ok":true}',
    });
  }
  mocks.streamChatWithTools.mockImplementationOnce(async (params: StreamChatParams) => {
    for (const [index, delta] of deltas.entries()) {
      params.callbacks?.onContentDelta?.(delta);
      if (index + 1 === toolBoundaryAfter) {
        await params.runTools?.([{ id: "call-1", name: "read_document", input: {} }]);
      }
    }
    return { fullText: deltas.join("") };
  });
  const writes: StreamDataEvent[] = [];
  const result = await runLLMStream({
    apiMessages: [{ role: "user", content: "Review this" }],
    docStore: new Map(),
    docIndex: {},
    userId: "user-1",
    write: (event) => writes.push(event),
    signal: new AbortController().signal,
    citationParser,
    documentCreator: {
      createBlank: vi.fn(),
      createFromBuffer: vi.fn(),
    },
  });
  const visible = writes
    .filter((event) => event.type === "content_delta")
    .map((event) => event.text)
    .join("");
  const citations = writes.find((event) => event.type === "citations");
  return { result, visible, citations };
}

describe("runtime citation visibility", () => {
  beforeEach(() => {
    mocks.streamChatWithTools.mockReset();
    mocks.toolExecute.mockReset();
  });

  it.each([
    [
      "malformed JSON",
      [
        "Answer<CITA",
        'TIONS>[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}',
        "</CITATIONS>",
      ],
    ],
    [
      "invalid page",
      [
        "Answer<CITATIONS>",
        '[{"ref":1,"doc_id":"doc-1","page":0,"quote":"Clause"}]',
        "</CITATIONS>",
      ],
    ],
    [
      "incomplete block",
      ["Answer<CIT", 'ATIONS>[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}]'],
    ],
  ])("replays a %s instead of hiding it", async (_name, deltas) => {
    const raw = deltas.join("");
    const { result, visible, citations } = await runWithDeltas(deltas);

    expect(visible).toBe(raw);
    expect(result.events).toEqual([{ type: "content", text: raw }]);
    expect(citations).toEqual({ type: "citations", citations: [] });
  });

  it("hides a valid split block and emits trailing prose", async () => {
    const { result, visible, citations } = await runWithDeltas([
      "Before<CITA",
      "TIONS>",
      '[{"ref":1,"doc_id":"doc-1","page":"4-6","quote":"Clause"}]',
      "</CIT",
      "ATIONS>After",
    ]);

    expect(visible).toBe("BeforeAfter");
    expect(result.events).toEqual([{ type: "content", text: "BeforeAfter" }]);
    expect(citations).toMatchObject({
      type: "citations",
      citations: [
        {
          type: "citation_data",
          resolution: "unresolved",
          reason: "unknown_document",
          ref: 1,
          doc_id: "doc-1",
          page: "4-6",
          filename: null,
        },
      ],
    });
  });

  it("uses one injected parser for visibility and final citations", async () => {
    const annotation = { type: "tabular_citation", ref: 1 };
    const parseTabular = (text: string) =>
      parseCitationBlock(text, (value) => (Array.isArray(value) ? [annotation] : null));
    const { visible, citations } = await runWithDeltas(
      ["Before<CITATIONS>", "[]", "</CITATIONS>After"],
      { citationParser: parseTabular },
    );

    expect(visible).toBe("BeforeAfter");
    expect(citations).toEqual({ type: "citations", citations: [annotation] });
  });

  it("keeps a valid citation block hidden across a tool boundary", async () => {
    const { result, visible, citations } = await runWithDeltas(
      [
        "Before<CITATIONS>",
        '[{"ref":1,',
        '"doc_id":"doc-1","page":2,"quote":"Clause"}]',
        "</CITATIONS>After",
      ],
      { toolBoundaryAfter: 2 },
    );

    expect(mocks.toolExecute).toHaveBeenCalledOnce();
    expect(visible).toBe("BeforeAfter");
    expect(
      result.events
        .filter((event) => event.type === "content")
        .map((event) => event.text)
        .join(""),
    ).toBe("BeforeAfter");
    expect(citations).toMatchObject({
      type: "citations",
      citations: [{ ref: 1, doc_id: "doc-1", page: 2, quote: "Clause" }],
    });
  });

  it.each([
    [
      "malformed",
      [
        "Before<CITATIONS>",
        '[{"ref":1,',
        '"doc_id":"doc-1","page":2,"quote":}]',
        "</CITATIONS>After",
      ],
    ],
    ["incomplete", ["Before<CITATIONS>", '[{"ref":1,', '"doc_id":"doc-1","page":2']],
  ])("eventually reveals a %s citation block across a tool boundary", async (_name, deltas) => {
    const raw = deltas.join("");
    const { result, visible, citations } = await runWithDeltas(deltas, {
      toolBoundaryAfter: 2,
    });

    expect(mocks.toolExecute).toHaveBeenCalledOnce();
    expect(visible).toBe(raw);
    expect(
      result.events
        .filter((event) => event.type === "content")
        .map((event) => event.text)
        .join(""),
    ).toBe(raw);
    expect(citations).toEqual({ type: "citations", citations: [] });
  });

  it("preserves failed document-read activity in returned events", async () => {
    mocks.toolExecute.mockImplementationOnce(async (context: ToolExecutionContext) => {
      context.events.docReadFailures.push({
        doc_id: "doc-1",
        filename: "Agreement.pdf",
        document_id: "document-1",
        reason: "decode_failed",
        error: "Document could not be read.",
      });
      return {
        role: "tool",
        tool_call_id: "call-1",
        content: '{"ok":false}',
      };
    });
    mocks.streamChatWithTools.mockImplementationOnce(async (params: StreamChatParams) => {
      await params.runTools?.([{ id: "call-1", name: "read_document", input: {} }]);
      return { fullText: "" };
    });
    const result = await runLLMStream({
      apiMessages: [{ role: "user", content: "Read this" }],
      docStore: new Map(),
      docIndex: {},
      userId: "user-1",
      write: vi.fn(),
      signal: new AbortController().signal,
      documentCreator: {
        createBlank: vi.fn(),
        createFromBuffer: vi.fn(),
      },
    });

    expect(result.events).toContainEqual({
      type: "doc_read_failed",
      doc_id: "doc-1",
      filename: "Agreement.pdf",
      document_id: "document-1",
      reason: "decode_failed",
      error: "Document could not be read.",
    });
  });
});
