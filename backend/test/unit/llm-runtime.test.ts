import { createOpenAI } from "@ai-sdk/openai";
import { generateText, simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiRuntimeContext } from "../../src/lib/llm/types.js";

vi.mock("../../src/config.js", () => ({
  getAppConfig: () => ({ ai: { requestTimeoutMs: 1_000 } }),
}));
vi.mock("../../src/lib/llm/providerRegistry.js", () => ({
  resolveAiModel: vi.fn(),
}));

import { resolveAiModel } from "../../src/lib/llm/providerRegistry.js";
import { streamChatWithTools } from "../../src/lib/llm/index.js";

const runtime: AiRuntimeContext = {
  connections: [
    {
      id: "server:openai",
      provider: "openai",
      source: "server",
      name: "OpenAI",
      credential: "secret",
    },
  ],
  models: [
    {
      id: "test-model",
      provider: "openai",
      providerModelId: "test-model",
      displayName: "Test",
      capabilities: {
        input: { text: true, image: false, pdf: false },
        output: { text: true, structured: true, toolCalls: true },
      },
      tasks: ["main"],
    },
  ],
};

describe("AI SDK runtime", () => {
  beforeEach(() => vi.mocked(resolveAiModel).mockReset());

  it("normalizes streamed text and reasoning callbacks", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "reasoning-start", id: "reasoning-1" },
            { type: "reasoning-delta", id: "reasoning-1", delta: "check" },
            { type: "reasoning-end", id: "reasoning-1" },
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: "Hello" },
            { type: "text-delta", id: "text-1", delta: " world" },
            { type: "text-end", id: "text-1" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              logprobs: undefined,
              usage: {
                inputTokens: {
                  total: 1,
                  noCache: 1,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: { total: 2, text: 2, reasoning: undefined },
              },
            },
          ],
          initialDelayInMs: null,
          chunkDelayInMs: null,
        }),
      }),
    });
    vi.mocked(resolveAiModel).mockReturnValue({
      connection: runtime.connections[0],
      record: runtime.models[0],
      languageModel: model,
    });
    const content: string[] = [];
    const reasoning: string[] = [];
    let reasoningEnds = 0;

    const result = await streamChatWithTools({
      model: "test-model",
      systemPrompt: "system",
      messages: [{ role: "user", content: "hello" }],
      runtime,
      enableThinking: true,
      callbacks: {
        onContentDelta: (text) => content.push(text),
        onReasoningDelta: (text) => reasoning.push(text),
        onReasoningBlockEnd: () => {
          reasoningEnds += 1;
        },
      },
    });

    expect(result).toEqual({ fullText: "Hello world" });
    expect(content).toEqual(["Hello", " world"]);
    expect(reasoning).toEqual(["check"]);
    expect(reasoningEnds).toBe(1);
  });

  it("rejects unsupported tool requests before a provider call", async () => {
    const model = new MockLanguageModelV4();
    vi.mocked(resolveAiModel).mockReturnValue({
      connection: runtime.connections[0],
      record: {
        ...runtime.models[0],
        capabilities: {
          ...runtime.models[0].capabilities,
          output: {
            ...runtime.models[0].capabilities.output,
            toolCalls: false,
          },
        },
      },
      languageModel: model,
    });

    await expect(
      streamChatWithTools({
        model: "test-model",
        systemPrompt: "system",
        messages: [{ role: "user", content: "hello" }],
        runtime,
        tools: [
          {
            type: "function",
            function: {
              name: "lookup",
              description: "Look up a value",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      }),
    ).rejects.toThrow(/does not support tool calls/);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("passes cancellation to the provider stream", async () => {
    const controller = new AbortController();
    const model = new MockLanguageModelV4({
      doStream: async (options) => {
        expect(options.abortSignal).toBe(controller.signal);
        return {
          stream: simulateReadableStream({
            chunks: [
              {
                type: "finish",
                finishReason: { unified: "stop", raw: undefined },
                logprobs: undefined,
                usage: {
                  inputTokens: {
                    total: 1,
                    noCache: 1,
                    cacheRead: undefined,
                    cacheWrite: undefined,
                  },
                  outputTokens: { total: 0, text: 0, reasoning: undefined },
                },
              },
            ],
            initialDelayInMs: null,
            chunkDelayInMs: null,
          }),
        };
      },
    });
    vi.mocked(resolveAiModel).mockReturnValue({
      connection: runtime.connections[0],
      record: runtime.models[0],
      languageModel: model,
    });

    await streamChatWithTools({
      model: "test-model",
      systemPrompt: "system",
      messages: [{ role: "user", content: "hello" }],
      runtime,
      signal: controller.signal,
    });
  });

  it("uses an injected provider fetch without exposing its key", async () => {
    const requests: Request[] = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return new Response(
        JSON.stringify({
          id: "completion-1",
          object: "chat.completion",
          created: 1,
          model: "test-model",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: { role: "assistant", content: "ok" },
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const provider = createOpenAI({ apiKey: "sk-private", fetch });
    const result = await generateText({
      model: provider.chat("test-model"),
      prompt: "ping",
    });

    expect(result.text).toBe("ok");
    expect(requests).toHaveLength(1);
    expect(requests[0].headers.get("authorization")).toBe("Bearer sk-private");
  });
});
