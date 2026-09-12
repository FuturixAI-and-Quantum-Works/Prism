import type { Request, RequestHandler, Response } from "express";
import type { DownloadsService } from "./downloads.service.js";
import { DownloadNotFoundError, type DownloadPayload } from "./downloads.types.js";

export type ContentDispositionBuilder = (
  disposition: "attachment" | "inline",
  filename: string,
) => string;

export function contentTypeFor(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".rtf")) return "application/rtf";
  if (lower.endsWith(".odt")) return "application/vnd.oasis.opendocument.text";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return "application/octet-stream";
}

function sendDownload(
  res: Response,
  payload: DownloadPayload,
  buildContentDisposition: ContentDispositionBuilder,
): void {
  res.setHeader("Content-Type", contentTypeFor(payload.filename));
  res.setHeader(
    "Content-Disposition",
    buildContentDisposition(payload.disposition, payload.filename),
  );
  res.send(Buffer.from(payload.bytes));
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch((error: unknown) => {
      if (error instanceof DownloadNotFoundError) {
        res.status(404).json({ detail: error.message });
        return;
      }
      next(error);
    });
  };
}

export function createDownloadsController(
  service: DownloadsService,
  buildContentDisposition: ContentDispositionBuilder,
) {
  return {
    local: endpoint(async (req, res) => {
      const payload = await service.getLocal(req.params.token);
      sendDownload(res, payload, buildContentDisposition);
    }),
    authorized: endpoint(async (req, res) => {
      const payload = await service.getAuthorized(req.params.token, {
        userId: res.locals.auth.user.id,
        email: res.locals.auth.user.email.toLowerCase(),
      });
      sendDownload(res, payload, buildContentDisposition);
    }),
  };
}
