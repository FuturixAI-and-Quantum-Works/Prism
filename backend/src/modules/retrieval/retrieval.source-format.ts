export function isSupportedRetrievalMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  if (normalized === "text/html") return false;
  return (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized === "application/pdf" ||
    normalized === "application/msword" ||
    normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "application/vnd.ms-excel" ||
    normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    normalized === "application/vnd.ms-powerpoint" ||
    normalized === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    normalized === "application/rtf" ||
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/webp" ||
    normalized === "image/bmp"
  );
}

export function unsupportedRetrievalReason(filename: string, mimeType: string): string | null {
  const normalizedMime = mimeType.toLowerCase();
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = match ? `.${match[1]}` : null;
  if (
    extension === ".htm" ||
    extension === ".html" ||
    normalizedMime === "text/html" ||
    !isSupportedRetrievalMimeType(mimeType)
  ) {
    return `Unsupported file format for RAG indexing: ${extension ?? normalizedMime}.`;
  }
  return null;
}

export function mimeTypeForDocument(filename: string, fileType?: string | null): string {
  const lower = filename.toLowerCase();
  if (fileType === "pdf" || lower.endsWith(".pdf")) return "application/pdf";
  if (fileType === "doc") return "application/msword";
  if (fileType === "docx" || lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".rtf")) return "application/rtf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return "application/octet-stream";
}
