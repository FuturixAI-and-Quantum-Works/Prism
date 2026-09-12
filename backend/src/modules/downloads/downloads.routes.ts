import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createDownloadsController,
  type ContentDispositionBuilder,
} from "./downloads.controller.js";
import type { DownloadsService } from "./downloads.service.js";

export function createDownloadsRouter(
  service: DownloadsService,
  buildContentDisposition: ContentDispositionBuilder,
): Router {
  const router = Router();
  const controller = createDownloadsController(service, buildContentDisposition);
  router.get("/local/:token", controller.local);
  router.get("/:token", requireAuth, controller.authorized);
  return router;
}
