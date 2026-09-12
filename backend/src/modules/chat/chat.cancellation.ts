import { llmErrorMessage } from "../../lib/llm/errors.js";
import type { SSEWriter } from "../../lib/sseHelpers.js";

type StreamOperation = () => Promise<void>;

export async function runCancellableChatStream(input: {
  label: string;
  writer: SSEWriter;
  signal: AbortSignal;
  operation: StreamOperation;
  logError?: (message: string, error: unknown) => void;
}): Promise<void> {
  try {
    await input.operation();
  } catch (error) {
    if (input.signal.aborted) return;
    (input.logError ?? console.error)(`[${input.label}/stream] error:`, error);
    try {
      input.writer.error(llmErrorMessage(error));
    } catch {
      return;
    }
  }
}
