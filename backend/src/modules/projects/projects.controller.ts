import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import type { ProjectsService } from "./projects.service.js";
import { ProjectError, type ProjectActor } from "./projects.types.js";
import {
  parseFolderCreate,
  parseFolderUpdate,
  parseInvitation,
  parseMemberRole,
  parseProjectMutation,
} from "./projects.validators.js";

function actor(res: Response): ProjectActor {
  return {
    userId: res.locals.auth.user.id,
    email: res.locals.auth.user.email.toLowerCase(),
  };
}

function errorResponse(error: unknown, res: Response): void {
  if (error instanceof ProjectError) {
    res.status(error.status).json({ detail: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ detail: error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  res.status(500).json({
    detail: error instanceof Error ? error.message : "Unknown error",
  });
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => errorResponse(error, res));
  };
}

export function createProjectsController(service: ProjectsService) {
  return {
    list: endpoint(async (_req, res) => {
      res.json(await service.list(actor(res)));
    }),
    create: endpoint(async (req, res) => {
      res.status(201).json(await service.create(actor(res), parseProjectMutation(req.body ?? {})));
    }),
    get: endpoint(async (req, res) => {
      res.json(await service.get(actor(res), req.params.projectId));
    }),
    update: endpoint(async (req, res) => {
      res.json(
        await service.update(
          actor(res),
          req.params.projectId,
          parseProjectMutation(req.body ?? {}),
        ),
      );
    }),
    remove: endpoint(async (req, res) => {
      await service.remove(actor(res), req.params.projectId);
      res.status(204).send();
    }),
    people: endpoint(async (req, res) => {
      res.json(await service.listPeople(actor(res), req.params.projectId));
    }),
    members: endpoint(async (req, res) => {
      res.json(await service.listMembers(actor(res), req.params.projectId));
    }),
    invite: endpoint(async (req, res) => {
      const input = parseInvitation(req.body ?? {});
      res
        .status(201)
        .json(await service.invite(actor(res), req.params.projectId, input.email, input.role));
    }),
    updateMember: endpoint(async (req, res) => {
      res.json(
        await service.updateMember(
          actor(res),
          req.params.projectId,
          req.params.memberId,
          parseMemberRole(req.body ?? {}),
        ),
      );
    }),
    removeMember: endpoint(async (req, res) => {
      await service.removeMember(actor(res), req.params.projectId, req.params.memberId);
      res.status(204).send();
    }),
    chats: endpoint(async (req, res) => {
      res.json(await service.listChats(actor(res), req.params.projectId));
    }),
    createFolder: endpoint(async (req, res) => {
      res
        .status(201)
        .json(
          await service.createFolder(
            actor(res),
            req.params.projectId,
            parseFolderCreate(req.body ?? {}),
          ),
        );
    }),
    updateFolder: endpoint(async (req, res) => {
      res.json(
        await service.updateFolder(
          actor(res),
          req.params.projectId,
          req.params.folderId,
          parseFolderUpdate(req.body ?? {}),
        ),
      );
    }),
    removeFolder: endpoint(async (req, res) => {
      await service.deleteFolder(actor(res), req.params.projectId, req.params.folderId);
      res.status(204).send();
    }),
  };
}
