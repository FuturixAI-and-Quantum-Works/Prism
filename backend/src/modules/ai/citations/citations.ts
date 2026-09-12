import {
  CITATIONS_OPEN_TAG,
  parseDocumentCitationBlock,
  type CitationBlockResult,
  type DocumentCitation,
} from "@prism/protocol";
import type { AssistantEvent, DocIndex } from "../tools/runtimeTypes.js";

export { CITATIONS_OPEN_TAG };

export type DocumentCitationAnnotation =
  | (DocumentCitation & {
      type: "citation_data";
      resolution: "resolved";
      document_id: string;
      version_id: string | null;
      version_number: number | null;
      filename: string;
    })
  | (DocumentCitation & {
      type: "citation_data";
      resolution: "unresolved";
      reason: "unknown_document";
      document_id: null;
      version_id: null;
      version_number: null;
      filename: null;
    });

function resolveCitation(
  citation: DocumentCitation,
  docIndex: DocIndex,
): DocumentCitationAnnotation {
  const document = docIndex[citation.doc_id];
  if (!document) {
    return {
      ...citation,
      type: "citation_data",
      resolution: "unresolved",
      reason: "unknown_document",
      document_id: null,
      version_id: null,
      version_number: null,
      filename: null,
    };
  }

  return {
    ...citation,
    type: "citation_data",
    resolution: "resolved",
    document_id: document.document_id,
    version_id: document.version_id ?? null,
    version_number: document.version_number ?? null,
    filename: document.filename,
  };
}

export function parseDocumentCitationAnnotations(
  text: string,
  docIndex: DocIndex,
): CitationBlockResult<DocumentCitationAnnotation> {
  const result = parseDocumentCitationBlock(text);
  if (result.status !== "valid") return result;
  return {
    ...result,
    citations: result.citations.map((citation) => resolveCitation(citation, docIndex)),
  };
}

export function extractAnnotations(
  fullText: string,
  docIndex: DocIndex,
  events?: readonly AssistantEvent[],
): unknown[] {
  const parsed = parseDocumentCitationAnnotations(fullText, docIndex);
  const out: unknown[] = parsed.status === "valid" ? [...parsed.citations] : [];
  if (events) {
    for (const event of events) {
      if (event.type === "doc_edited") {
        for (const annotation of event.annotations) {
          out.push({ ...annotation, type: "edit_data" });
        }
      }
    }
  }
  return out;
}
