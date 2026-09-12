import type { StreamDataEvent, StreamEvent } from "@prism/protocol";

type SSERequest = {
  once: (event: "aborted", listener: () => void) => unknown;
  off: (event: "aborted", listener: () => void) => unknown;
};

type SSEResponse = {
  setHeader: (name: string, value: string) => unknown;
  flushHeaders: () => unknown;
  write: (chunk: string) => unknown;
  once: (event: "close", listener: () => void) => unknown;
  off: (event: "close", listener: () => void) => unknown;
  end: () => unknown;
};

export function setupSSEResponse(res: Pick<SSEResponse, "setHeader" | "flushHeaders">): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

export function encodeSSEEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export type SSEWriter = {
  event: (event: StreamDataEvent) => void;
  error: (message: string) => void;
  complete: () => void;
};

export function createSSEWriter(res: { write: (chunk: string) => unknown }): SSEWriter {
  let terminal: "success" | "error" | undefined;

  const write = (event: StreamEvent): void => {
    if (terminal) return;
    if (event.type === "done") terminal = "success";
    if (event.type === "error") terminal = "error";
    res.write(encodeSSEEvent(event));
  };

  return {
    event: write,
    error: (message) => write({ type: "error", message }),
    complete: () => write({ type: "done" }),
  };
}

export function createSSESession(req: SSERequest, res: SSEResponse) {
  setupSSEResponse(res);
  const writer = createSSEWriter(res);
  const controller = new AbortController();
  const abort = () => controller.abort(new DOMException("Client disconnected", "AbortError"));
  req.once("aborted", abort);
  res.once("close", abort);

  return {
    writer,
    signal: controller.signal,
    finish: () => {
      req.off("aborted", abort);
      res.off("close", abort);
      if (controller.signal.aborted) return;
      writer.complete();
      res.end();
    },
  };
}

export async function runSSEStream(
  req: SSERequest,
  res: SSEResponse,
  streamFn: (writer: SSEWriter, signal: AbortSignal) => Promise<void>,
): Promise<void> {
  const session = createSSESession(req, res);

  try {
    await streamFn(session.writer, session.signal);
  } catch (err) {
    if (session.signal.aborted) return;
    console.error("[SSE stream] error:", err);
    try {
      session.writer.error("Unexpected stream error");
    } catch {
      return;
    }
  } finally {
    session.finish();
  }
}
