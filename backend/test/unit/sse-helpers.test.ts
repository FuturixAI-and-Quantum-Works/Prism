import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createSSEWriter, encodeSSEEvent, runSSEStream } from "../../src/lib/sseHelpers.js";

describe("SSE helpers", () => {
  it("encodes every event through one framing function", () => {
    expect(encodeSSEEvent({ type: "content_delta", text: "hello\nworld" })).toBe(
      'data: {"type":"content_delta","text":"hello\\nworld"}\n\n',
    );
  });

  it("writes exactly one completion event", () => {
    const chunks: string[] = [];
    const writer = createSSEWriter({
      write: (chunk) => {
        chunks.push(chunk);
        return true;
      },
    });

    writer.complete();
    writer.complete();
    writer.event({ type: "content_delta", text: "late" });
    expect(chunks).toEqual(['data: {"type":"done"}\n\n']);
  });

  it("writes an error without a following completion event", async () => {
    const request = new EventEmitter();
    const chunks: string[] = [];
    const response = new EventEmitter() as EventEmitter & {
      setHeader: ReturnType<typeof vi.fn>;
      flushHeaders: ReturnType<typeof vi.fn>;
      write: (chunk: string) => boolean;
      end: ReturnType<typeof vi.fn>;
    };
    response.setHeader = vi.fn();
    response.flushHeaders = vi.fn();
    response.write = (chunk) => {
      chunks.push(chunk);
      return true;
    };
    response.end = vi.fn();

    await runSSEStream(request, response, async () => {
      throw new Error("failed");
    });

    expect(chunks).toEqual(['data: {"type":"error","message":"Unexpected stream error"}\n\n']);
    expect(response.end).toHaveBeenCalledOnce();
  });

  it("does not duplicate completion when a stream completes itself", async () => {
    const request = new EventEmitter();
    const chunks: string[] = [];
    const response = new EventEmitter() as EventEmitter & {
      setHeader: ReturnType<typeof vi.fn>;
      flushHeaders: ReturnType<typeof vi.fn>;
      write: (chunk: string) => boolean;
      end: ReturnType<typeof vi.fn>;
    };
    response.setHeader = vi.fn();
    response.flushHeaders = vi.fn();
    response.write = (chunk) => {
      chunks.push(chunk);
      return true;
    };
    response.end = vi.fn();

    await runSSEStream(request, response, async (writer) => {
      writer.event({ type: "content_delta", text: "hello" });
      writer.complete();
    });

    expect(chunks).toEqual([
      'data: {"type":"content_delta","text":"hello"}\n\n',
      'data: {"type":"done"}\n\n',
    ]);
  });

  it("aborts the stream when the client disconnects", async () => {
    const request = new EventEmitter();
    const response = new EventEmitter() as EventEmitter & {
      setHeader: ReturnType<typeof vi.fn>;
      flushHeaders: ReturnType<typeof vi.fn>;
      write: ReturnType<typeof vi.fn>;
      end: ReturnType<typeof vi.fn>;
    };
    response.setHeader = vi.fn();
    response.flushHeaders = vi.fn();
    response.write = vi.fn(() => true);
    response.end = vi.fn();
    let observedSignal: AbortSignal | undefined;

    await runSSEStream(request, response, async (_writer, signal) => {
      observedSignal = signal;
      response.emit("close");
      await Promise.resolve();
    });

    expect(observedSignal?.aborted).toBe(true);
    expect(response.end).not.toHaveBeenCalled();
    expect(response.write).not.toHaveBeenCalled();
  });
});
