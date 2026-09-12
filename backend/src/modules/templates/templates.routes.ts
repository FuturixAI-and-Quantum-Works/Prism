import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createTemplatesController } from "./templates.controller.js";
import type { TemplatesService } from "./templates.service.js";

export function createTemplatesRouter(service: TemplatesService): Router {
  const router = Router();
  const controller = createTemplatesController(service);

  router.get("/", requireAuth, controller.list);
  router.post("/", requireAuth, controller.create);
  router.get("/:templateId", requireAuth, controller.get);
  router.patch("/:templateId", requireAuth, controller.update);
  router.delete("/:templateId", requireAuth, controller.remove);
  router.post("/:templateId/create-document", requireAuth, controller.createDocument);
  router.post("/:templateId/clone", requireAuth, controller.clone);

  return router;
}
