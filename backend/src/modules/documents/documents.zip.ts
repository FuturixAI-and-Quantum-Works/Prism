import JSZip from "jszip";

export const DOCUMENT_ZIP_REPORT_FILENAME = "download-report.json";

export type DocumentZipMode = "atomic" | "partial";

export type DocumentZipRequest = Readonly<{
  documentIds: readonly string[];
  mode: DocumentZipMode;
}>;

export type DocumentZipFailureReason =
  "unavailable" | "no-active-version" | "content-unavailable" | "read-failed";

export type DocumentZipFailure = Readonly<{
  requestIndex: number;
  documentId: string;
  reason: DocumentZipFailureReason;
}>;

export type DocumentZipOutcome =
  | Readonly<{
      requestIndex: number;
      documentId: string;
      status: "included";
      filename: string;
    }>
  | Readonly<{
      requestIndex: number;
      documentId: string;
      status: "failed";
      reason: DocumentZipFailureReason;
    }>;

export type ResolvedDocumentZipOccurrence =
  | Readonly<{
      requestIndex: number;
      documentId: string;
      status: "available";
      requestedFilename: string;
      bytes: Buffer;
    }>
  | Readonly<{
      requestIndex: number;
      documentId: string;
      status: "failed";
      reason: DocumentZipFailureReason;
    }>;

export type PreparedDocumentZip = Readonly<{
  entries: readonly Readonly<{ filename: string; bytes: Buffer }>[];
  outcomes: readonly DocumentZipOutcome[];
  failures: readonly DocumentZipFailure[];
}>;

export type DocumentZipResult = Readonly<{
  bytes: Buffer;
  outcomes: readonly DocumentZipOutcome[];
  failures: readonly DocumentZipFailure[];
}>;

const zipEntryDate = new Date("1980-01-01T00:00:00.000Z");

function sanitizeArchiveFilename(filename: string): string {
  let previousReplacement = false;
  const normalized = Array.from(filename.normalize("NFC"), (character) => {
    const code = character.codePointAt(0) ?? 0;
    const replace =
      character === "/" || character === "\\" || code <= 31 || (code >= 127 && code <= 159);
    if (!replace) {
      previousReplacement = false;
      return character;
    }
    if (previousReplacement) return "";
    previousReplacement = true;
    return "_";
  })
    .join("")
    .trim();
  return normalized && normalized !== "." && normalized !== ".." ? normalized : "document";
}

function filenameParts(filename: string): Readonly<{ stem: string; extension: string }> {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) {
    return { stem: filename, extension: "" };
  }
  return {
    stem: filename.slice(0, dot),
    extension: filename.slice(dot),
  };
}

function allocateFilename(requested: string, used: Set<string>): string {
  const filename = sanitizeArchiveFilename(requested);
  const { stem, extension } = filenameParts(filename);
  let candidate = filename;
  let occurrence = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${stem} (${occurrence})${extension}`;
    occurrence += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function prepareDocumentZip(
  resolved: readonly ResolvedDocumentZipOccurrence[],
): PreparedDocumentZip {
  const used = new Set([DOCUMENT_ZIP_REPORT_FILENAME.toLowerCase()]);
  const entries: Array<Readonly<{ filename: string; bytes: Buffer }>> = [];
  const outcomes: DocumentZipOutcome[] = [];
  const failures: DocumentZipFailure[] = [];

  for (const occurrence of resolved) {
    if (occurrence.status === "failed") {
      const failure = {
        requestIndex: occurrence.requestIndex,
        documentId: occurrence.documentId,
        reason: occurrence.reason,
      } satisfies DocumentZipFailure;
      failures.push(failure);
      outcomes.push({ ...failure, status: "failed" });
      continue;
    }
    const filename = allocateFilename(occurrence.requestedFilename, used);
    entries.push({ filename, bytes: occurrence.bytes });
    outcomes.push({
      requestIndex: occurrence.requestIndex,
      documentId: occurrence.documentId,
      status: "included",
      filename,
    });
  }

  return { entries, outcomes, failures };
}

function reportJson(outcomes: readonly DocumentZipOutcome[]): string {
  return `${JSON.stringify(
    {
      schema_version: 1,
      mode: "partial",
      outcomes: outcomes.map((outcome) =>
        outcome.status === "included"
          ? {
              request_index: outcome.requestIndex,
              document_id: outcome.documentId,
              status: outcome.status,
              filename: outcome.filename,
            }
          : {
              request_index: outcome.requestIndex,
              document_id: outcome.documentId,
              status: outcome.status,
              reason: outcome.reason,
            },
      ),
    },
    null,
    2,
  )}\n`;
}

export async function generateDocumentZip(
  prepared: PreparedDocumentZip,
  mode: DocumentZipMode,
): Promise<Buffer> {
  const archive = new JSZip();
  for (const entry of prepared.entries) {
    archive.file(entry.filename, entry.bytes, {
      createFolders: false,
      date: zipEntryDate,
    });
  }
  if (mode === "partial") {
    archive.file(DOCUMENT_ZIP_REPORT_FILENAME, reportJson(prepared.outcomes), {
      createFolders: false,
      date: zipEntryDate,
    });
  }
  return archive.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "DOS",
    streamFiles: false,
  });
}
