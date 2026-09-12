export const CITATIONS_OPEN_TAG = "<CITATIONS>";
export const CITATIONS_CLOSE_TAG = "</CITATIONS>";

export type CitationBlockStatus = "absent" | "incomplete" | "invalid" | "valid";

export type InvalidCitationReason = "invalid_json" | "invalid_schema" | "multiple_blocks";

export type CitationBlockResult<Citation> =
  | Readonly<{
      status: "absent";
      visibleText: string;
    }>
  | Readonly<{
      status: "incomplete";
      visibleText: string;
      blockStart: number;
    }>
  | Readonly<{
      status: "invalid";
      visibleText: string;
      blockStart: number;
      blockEnd: number;
      reason: InvalidCitationReason;
    }>
  | Readonly<{
      status: "valid";
      visibleText: string;
      blockStart: number;
      blockEnd: number;
      citations: readonly Citation[];
    }>;

export type CitationPayloadDecoder<Citation> = (value: unknown) => readonly Citation[] | null;

export type DocumentCitationPage = number | `${number}-${number}`;

export type DocumentCitation = Readonly<{
  ref: number;
  doc_id: string;
  page: DocumentCitationPage;
  quote: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parsePage(value: unknown): DocumentCitationPage | null {
  if (isPositiveSafeInteger(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!isPositiveSafeInteger(start) || !isPositiveSafeInteger(end) || start > end) {
    return null;
  }
  const range: `${number}-${number}` = `${start}-${end}`;
  return range;
}

function decodeDocumentCitations(value: unknown): readonly DocumentCitation[] | null {
  if (!Array.isArray(value)) return null;
  const citations: DocumentCitation[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const ref = item.ref;
    const docId = item.doc_id;
    const page = parsePage(item.page);
    const quote = item.quote;
    if (
      !isPositiveSafeInteger(ref) ||
      typeof docId !== "string" ||
      !docId.trim() ||
      page === null ||
      typeof quote !== "string" ||
      !quote.trim()
    ) {
      return null;
    }
    citations.push({ ref, doc_id: docId, page, quote });
  }
  return citations;
}

export function parseCitationBlock<Citation>(
  text: string,
  decode: CitationPayloadDecoder<Citation>,
): CitationBlockResult<Citation> {
  const blockStart = text.indexOf(CITATIONS_OPEN_TAG);
  if (blockStart < 0) return { status: "absent", visibleText: text };

  const payloadStart = blockStart + CITATIONS_OPEN_TAG.length;
  const closingTagStart = text.indexOf(CITATIONS_CLOSE_TAG, payloadStart);
  if (closingTagStart < 0) {
    return { status: "incomplete", visibleText: text, blockStart };
  }

  const blockEnd = closingTagStart + CITATIONS_CLOSE_TAG.length;
  if (text.indexOf(CITATIONS_OPEN_TAG, payloadStart) >= 0) {
    return {
      status: "invalid",
      visibleText: text,
      blockStart,
      blockEnd,
      reason: "multiple_blocks",
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text.slice(payloadStart, closingTagStart));
  } catch {
    return {
      status: "invalid",
      visibleText: text,
      blockStart,
      blockEnd,
      reason: "invalid_json",
    };
  }

  let citations: readonly Citation[] | null;
  try {
    citations = decode(payload);
  } catch {
    citations = null;
  }
  if (citations === null) {
    return {
      status: "invalid",
      visibleText: text,
      blockStart,
      blockEnd,
      reason: "invalid_schema",
    };
  }

  return {
    status: "valid",
    visibleText: `${text.slice(0, blockStart)}${text.slice(blockEnd)}`,
    blockStart,
    blockEnd,
    citations,
  };
}

export function parseDocumentCitationBlock(text: string): CitationBlockResult<DocumentCitation> {
  return parseCitationBlock(text, decodeDocumentCitations);
}
