import {
  decodeDocumentContent,
  DocumentContentError,
  resolveDocumentFormat,
} from "../modules/content/documentContent.js";
import { getUserAiRuntime } from "./aiRegistry.js";
import { completeText, resolveDefaultMainModel, type AiRuntimeContext } from "./llm/index.js";
import { hasAnyLlmProvider, llmErrorMessage } from "./llm/errors.js";

export type PreviewSummarySourceType = "document" | "drive";
export type PreviewSummaryStatus = "ready" | "empty" | "error";

export type PreviewSummaryResponse = {
  id: string;
  source_type: PreviewSummarySourceType;
  filename: string;
  summary: string[];
  status: PreviewSummaryStatus;
  detail?: string;
};

function hasMeaningfulText(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  const alphanumericCount = (normalized.match(/[A-Za-z0-9]/g) ?? []).length;
  return normalized.length >= 50 && alphanumericCount >= 25;
}

export async function extractPreviewSummaryText(input: {
  bytes: ArrayBuffer;
  filename: string;
  mimeType?: string | null;
  fileType?: string | null;
  signal?: AbortSignal;
}): Promise<{ text: string | null; detail?: string }> {
  try {
    const format = resolveDocumentFormat(input);
    const { text } = await decodeDocumentContent({
      ...input,
      output: "text",
      limits: { maxOutputChars: 120_000, maxSpreadsheetSheets: 12 },
    });
    if (hasMeaningfulText(text)) return { text };
    if (format === "pdf") {
      return { text: null, detail: "No extractable text was found in this PDF." };
    }
    if (format === "docx") {
      return { text: null, detail: "No extractable text was found in this Word document." };
    }
    if (format === "spreadsheet") {
      return { text: null, detail: "No readable worksheet text was found in this spreadsheet." };
    }
    return { text: null, detail: "This file does not contain enough text to summarize." };
  } catch (error) {
    if (error instanceof DocumentContentError && error.code === "aborted") throw error;
    if (error instanceof DocumentContentError && error.code === "unsupported-format") {
      return { text: null, detail: "This file type is not supported for summary extraction." };
    }
    const detail =
      error instanceof Error ? error.message : "Could not extract text from this file.";
    return { text: null, detail };
  }
}

async function generateSummary(
  text: string,
  filename: string,
  model: string,
  runtime: AiRuntimeContext,
): Promise<string[]> {
  const response = await completeText({
    model,
    task: "main",
    systemPrompt:
      'You are a legal document analyst. Generate a concise summary of the file as 3-5 bullet points. Each bullet should be a single sentence capturing a key point. Return ONLY the bullet points, one per line, starting each line with "- ".',
    user: `Summarize this file titled "${filename}":\n\n${text.slice(0, 15000)}`,
    maxTokens: 500,
    runtime,
  });

  const bullets = response
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*") || line.startsWith("\u2022"))
    .map((line) => line.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean);

  return bullets.length ? bullets.slice(0, 5) : ["Summary could not be generated."];
}

export async function buildPreviewSummary(input: {
  id: string;
  sourceType: PreviewSummarySourceType;
  filename: string;
  bytes: ArrayBuffer | null;
  userId: string;
  mimeType?: string | null;
  fileType?: string | null;
  signal?: AbortSignal;
}): Promise<PreviewSummaryResponse> {
  if (!input.bytes) {
    return {
      id: input.id,
      source_type: input.sourceType,
      filename: input.filename,
      summary: [],
      status: "empty",
      detail: "File bytes could not be loaded.",
    };
  }

  const extracted = await extractPreviewSummaryText({
    bytes: input.bytes,
    filename: input.filename,
    mimeType: input.mimeType,
    fileType: input.fileType,
    signal: input.signal,
  });
  if (!extracted.text) {
    return {
      id: input.id,
      source_type: input.sourceType,
      filename: input.filename,
      summary: [],
      status: "empty",
      detail: extracted.detail,
    };
  }

  const aiRuntime = await getUserAiRuntime(input.userId);
  if (!hasAnyLlmProvider(aiRuntime)) {
    return {
      id: input.id,
      source_type: input.sourceType,
      filename: input.filename,
      summary: [],
      status: "error",
      detail: "Connect an AI API key in settings to generate a summary for this file.",
    };
  }

  const model = resolveDefaultMainModel(aiRuntime);
  try {
    return {
      id: input.id,
      source_type: input.sourceType,
      filename: input.filename,
      summary: await generateSummary(extracted.text, input.filename, model, aiRuntime),
      status: "ready",
    };
  } catch (error) {
    return {
      id: input.id,
      source_type: input.sourceType,
      filename: input.filename,
      summary: [],
      status: "error",
      detail: llmErrorMessage(error),
    };
  }
}
