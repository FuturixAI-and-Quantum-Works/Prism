import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createProductionProjectsService } from "./projects.composition.js";
import { createProjectsController } from "./projects.controller.js";
import type { ProjectsService } from "./projects.service.js";

export function createProjectsRouter(service: ProjectsService): Router {
  const router = Router();
  const controller = createProjectsController(service);

  router.get("/", requireAuth, controller.list);
  router.post("/", requireAuth, controller.create);
  router.get("/:projectId", requireAuth, controller.get);
  router.get("/:projectId/people", requireAuth, controller.people);
  router.get("/:projectId/members", requireAuth, controller.members);
  router.post("/:projectId/invitations", requireAuth, controller.invite);
  router.patch("/:projectId/members/:memberId", requireAuth, controller.updateMember);
  router.delete("/:projectId/members/:memberId", requireAuth, controller.removeMember);
  router.patch("/:projectId", requireAuth, controller.update);
  router.delete("/:projectId", requireAuth, controller.remove);
  router.get("/:projectId/chats", requireAuth, controller.chats);
  router.post("/:projectId/folders", requireAuth, controller.createFolder);
  router.patch("/:projectId/folders/:folderId", requireAuth, controller.updateFolder);
  router.delete("/:projectId/folders/:folderId", requireAuth, controller.removeFolder);

  return router;
}

export const projectsRouter = createProjectsRouter(createProductionProjectsService());
