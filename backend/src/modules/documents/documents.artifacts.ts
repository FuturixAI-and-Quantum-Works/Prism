import { randomUUID } from "node:crypto";
import type { DocumentConverter } from "../../lib/documentConverter.js";
import {
  deleteFile,
  generatedDocKey,
  storageKey,
  uploadFile,
  versionStorageKey,
} from "../../lib/storage.js";
import { ObjectNotFoundError } from "../../storage/types.js";

type DocumentArtifactConverter = Pick<DocumentConverter, "convert">;

export type PdfRenditionPolicy = "best-effort" | "required";

export type PdfRenditionFailure =
  | Readonly<{ kind: "not-supported"; fileType: string }>
  | Readonly<{ kind: "degraded"; cause: unknown }>;

export type PdfRenditionOutcome =
  | Readonly<{ kind: "source-pdf"; path: string }>
  | Readonly<{ kind: "converted"; path: string }>
  | PdfRenditionFailure;

export type StoredDocumentArtifacts = Readonly<{
  sourcePath: string;
  pdfRendition: PdfRenditionOutcome;
}>;

type ArtifactWriteRequestBase = Readonly<{
  userId: string;
  documentId: string;
  filename: string;
  fileType: string;
  content: Buffer;
  pdfRenditionPolicy: PdfRenditionPolicy;
}>;

type InitialArtifactWriteRequest = ArtifactWriteRequestBase &
  Readonly<{
    kind: "initial";
    generated: boolean;
  }>;

type VersionArtifactWriteRequest = ArtifactWriteRequestBase &
  Readonly<{
    kind: "version";
  }>;

export type DocumentArtifactWriteRequest =
  InitialArtifactWriteRequest | VersionArtifactWriteRequest;

export type DocumentArtifactCleanupRequest = Readonly<{
  operationId: string;
  documentId: string;
  paths: readonly string[];
  delayMs: number;
}>;

export type DocumentArtifactCleanupScheduler = (
  request: DocumentArtifactCleanupRequest,
) => Promise<unknown>;

type ResolvedArtifactWrite = Readonly<{
  sourcePath: string;
  pdfPath: string;
  fileType: string;
  content: Buffer;
}>;

type PersistDocumentArtifacts<Result> = (artifacts: StoredDocumentArtifacts) => Promise<Result>;

type ArtifactUpload = Readonly<{
  key: string;
  content: Buffer;
  contentType: string;
}>;

export class RequiredPdfRenditionError extends Error {
  constructor(readonly failure: PdfRenditionFailure) {
    super(
      "Required PDF rendition could not be produced.",
      failure.kind === "degraded" ? { cause: failure.cause } : undefined,
    );
    this.name = "RequiredPdfRenditionError";
  }
}

export type DocumentArtifactDeleteFailure = Readonly<{
  path: string;
  error: unknown;
}>;

export class DocumentArtifactCleanupError extends AggregateError {
  constructor(
    readonly originalError: unknown,
    readonly deleteFailures: readonly DocumentArtifactDeleteFailure[],
    readonly schedulingError: unknown,
  ) {
    super(
      [originalError, ...deleteFailures.map(({ error }) => error), schedulingError],
      "Document artifact write failed and cleanup could not be scheduled",
      { cause: originalError },
    );
    this.name = "DocumentArtifactCleanupError";
  }
}

const neverAborted = new AbortController().signal;
const persistenceCleanupDelayMs = 5_000;

function arrayBuffer(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer;
}

export function documentContentType(type: string): string {
  if (type === "pdf") return "application/pdf";
  if (type === "doc") return "application/msword";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

async function removeDocumentArtifacts(
  paths: readonly string[],
): Promise<readonly DocumentArtifactDeleteFailure[]> {
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      try {
        await deleteFile(path);
      } catch (error) {
        if (!(error instanceof ObjectNotFoundError)) throw error;
      }
    }),
  );
  return results.flatMap((result, index) =>
    result.status === "rejected" ? [{ path: paths[index], error: result.reason }] : [],
  );
}

export class DocumentArtifactWriter {
  constructor(
    private readonly converter: DocumentArtifactConverter,
    private readonly scheduleCleanup: DocumentArtifactCleanupScheduler,
  ) {}

  async write<Result>(
    request: DocumentArtifactWriteRequest,
    persist: PersistDocumentArtifacts<Result>,
  ): Promise<Result> {
    const operationId = randomUUID();
    const input = this.resolveWrite(request);
    const writes: ArtifactUpload[] = [
      {
        key: input.sourcePath,
        content: input.content,
        contentType: documentContentType(input.fileType),
      },
    ];
    let pdfRendition: PdfRenditionOutcome =
      input.fileType === "pdf"
        ? { kind: "source-pdf", path: input.sourcePath }
        : { kind: "not-supported", fileType: input.fileType };
    if (input.fileType === "docx" || input.fileType === "doc") {
      try {
        const pdf = await this.converter.convert(
          {
            kind: input.fileType === "doc" ? "doc-to-pdf" : "docx-to-pdf",
            content: input.content,
          },
          neverAborted,
        );
        pdfRendition = { kind: "converted", path: input.pdfPath };
        writes.push({ key: input.pdfPath, content: pdf, contentType: "application/pdf" });
      } catch (cause) {
        pdfRendition = { kind: "degraded", cause };
      }
    }
    if (
      request.pdfRenditionPolicy === "required" &&
      (pdfRendition.kind === "not-supported" || pdfRendition.kind === "degraded")
    ) {
      throw new RequiredPdfRenditionError(pdfRendition);
    }

    const attemptedPaths: string[] = [];
    for (const write of writes) {
      attemptedPaths.push(write.key);
      try {
        await uploadFile(write.key, arrayBuffer(write.content), write.contentType);
      } catch (originalError) {
        const deleteFailures = await removeDocumentArtifacts(attemptedPaths);
        if (deleteFailures.length > 0) {
          try {
            await this.scheduleCleanup({
              operationId,
              documentId: request.documentId,
              paths: deleteFailures.map(({ path }) => path),
              delayMs: 0,
            });
          } catch (schedulingError) {
            throw new DocumentArtifactCleanupError(originalError, deleteFailures, schedulingError);
          }
        }
        throw originalError;
      }
    }
    try {
      return await persist({ sourcePath: input.sourcePath, pdfRendition });
    } catch (originalError) {
      try {
        await this.scheduleCleanup({
          operationId,
          documentId: request.documentId,
          paths: attemptedPaths,
          delayMs: persistenceCleanupDelayMs,
        });
      } catch (schedulingError) {
        throw new DocumentArtifactCleanupError(originalError, [], schedulingError);
      }
      throw originalError;
    }
  }

  private resolveWrite(request: DocumentArtifactWriteRequest): ResolvedArtifactWrite {
    switch (request.kind) {
      case "initial":
        return {
          ...request,
          sourcePath: request.generated
            ? generatedDocKey(request.userId, request.documentId, request.filename)
            : storageKey(request.userId, request.documentId, request.filename),
          pdfPath: `converted-pdfs/${request.userId}/${request.documentId}.pdf`,
        };
      case "version": {
        const slug = randomUUID().replace(/-/g, "");
        return {
          ...request,
          sourcePath: versionStorageKey(request.userId, request.documentId, slug, request.filename),
          pdfPath: `converted-pdfs/${request.userId}/${request.documentId}/${slug}.pdf`,
        };
      }
      default: {
        const exhaustive: never = request;
        return exhaustive;
      }
    }
  }
}
