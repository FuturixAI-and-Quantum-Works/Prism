import type { TabularColumn } from "./tabular.types.js";

export const tabularExtractionSystemPrompt = `You are a legal document analyst. Extract information for each column listed below.

For each column, output exactly one minified JSON object on its own line (no line breaks inside the JSON), then a newline. Process columns in order and output each result as soon as you finish it.

Line format:
{"column_index": <N>, "summary": <string>, "flag": <"green"|"grey"|"yellow"|"red">, "reasoning": <string>}

Rules:
- "summary": the extracted value with inline citations [[page:N||quote:verbatim excerpt <=25 words]] after every factual claim. No explanation or reasoning here. Quotes must be narrowly scoped to the specific claim. Extract only the exact supporting words, not the full surrounding sentence. Do not reuse one long quote across multiple statements. Give each claim its own short, precise quote.
- "flag": green = standard/favorable, yellow = needs attention, red = problematic/unfavorable, grey = neutral/not found
- "reasoning": brief explanation of the extraction
- The "summary" and "reasoning" string values may use markdown. Escape newlines as \\n inside the JSON string.
- Output only the JSON lines. Do not wrap the response in markdown code fences.`;

export function formatPromptSuffix(format?: string, tags?: readonly string[]): string {
  switch (format) {
    case "bulleted_list":
      return ' The "summary" field in your JSON response must be a markdown bulleted list only — no prose. Format: each item on its own line, prefixed with "* " (asterisk + single space), e.g.\n* First item\n* Second item\n* Third item';
    case "number":
      return ' The "summary" field in your JSON response must be a single number only. No units or explanation.';
    case "percentage":
      return ' The "summary" field in your JSON response must be a single percentage value only (e.g. 42%). No explanation.';
    case "monetary_amount":
      return ' The "summary" field in your JSON response must be the monetary value only, including currency symbol (e.g. $1,234.56). No explanation.';
    case "currency":
      return ' If the prompt asks for an amount, the "summary" field must contain the monetary amount with currency exactly as stated (for example "$1,234.56" or "INR 10,00,000"). If the prompt asks only for currency, return the currency code or symbol. No explanation.';
    case "yes_no":
      return ' The "summary" field in your JSON response must be [[Yes]] or [[No]] only. The "reasoning" field MUST include an inline citation [[page:N||quote:verbatim excerpt ≤25 words]] pointing to the exact language in the document that supports the Yes/No answer.';
    case "date":
      return ' The "summary" field in your JSON response must be the date only in DD Month YYYY format (e.g. 1 January 2024). If a range, give both dates separated by an em dash. The "reasoning" field MUST include an inline citation [[page:N||quote:verbatim excerpt ≤25 words]] pointing to the exact place in the document where the date is found.';
    case "tag":
      return tags?.length
        ? ` The "summary" field in your JSON response must contain exactly one tag wrapped in double square brackets. Available tags: ${tags.map((tag) => `[[${tag}]]`).join(", ")}. No other text. The "reasoning" field MUST include an inline citation [[page:N||quote:verbatim excerpt ≤25 words]] pointing to the exact language in the document that supports the chosen tag.`
        : "";
    default:
      return "";
  }
}

export function tabularDocumentPrompt(
  filename: string,
  columns: readonly TabularColumn[],
  inlinePdf: boolean,
): string {
  const descriptions = columns
    .map((column) => {
      const instruction = `${column.prompt}${formatPromptSuffix(column.format, column.tags)} If not found, state "Not Found".`;
      return `Column ${column.index} — "${column.name}": ${instruction}`;
    })
    .join("\n");
  const attachment = inlinePdf
    ? "\n\nThe document is attached as a PDF. Read the PDF directly, including scanned/image pages if needed."
    : "";
  return `Document: ${filename}${attachment}\n\nColumns to extract:\n${descriptions}`;
}
