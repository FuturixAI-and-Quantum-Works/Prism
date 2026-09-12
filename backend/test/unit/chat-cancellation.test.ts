import { describe, expect, it, vi } from "vitest";
import { runCancellableChatStream } from "../../src/modules/chat/chat.cancellation.js";

function writer() {
  return {
    event: vi.fn(),
    error: vi.fn(),
    complete: vi.fn(),
  };
}

describe("chat stream cancellation", () => {
  it("suppresses errors and logging after cancellation", async () => {
    const controller = new AbortController();
    const streamWriter = writer();
    const logError = vi.fn();
    controller.abort();

    await runCancellableChatStream({
      label: "general-chat",
      writer: streamWriter,
      signal: controller.signal,
      operation: async () => {
        throw new Error("provider aborted");
      },
      logError,
    });

    expect(streamWriter.error).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it("emits the normalized error once while the client remains connected", async () => {
    const streamWriter = writer();
    const logError = vi.fn();

    await runCancellableChatStream({
      label: "workspace-chat",
      writer: streamWriter,
      signal: new AbortController().signal,
      operation: async () => {
        throw new Error("provider failed");
      },
      logError,
    });

    expect(logError).toHaveBeenCalledOnce();
    expect(streamWriter.error).toHaveBeenCalledOnce();
    expect(streamWriter.error).toHaveBeenCalledWith("provider failed");
  });
});
