import crypto from "node:crypto";
import path from "node:path";

export function checksum(content: ArrayBuffer): string {
  return crypto.createHash("sha256").update(Buffer.from(content)).digest("hex");
}

export function fileExtension(filename: string): string | null {
  const extension = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,31}$/.test(extension) ? extension : null;
}

export function detectMimeType(filename: string, supplied?: string | null): string {
  if (supplied && supplied !== "application/octet-stream") return supplied;
  const types: Readonly<Record<string, string>> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".csv": "text/csv",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".zip": "application/zip",
  };
  return types[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}

export function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const result = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(result).set(buffer);
  return result;
}

export function copyName(name: string, sequence: number): string {
  if (sequence === 0) return name;
  const extension = path.extname(name);
  const stem = extension ? path.basename(name, extension) : name;
  return `${stem} (${sequence})${extension}`;
}
