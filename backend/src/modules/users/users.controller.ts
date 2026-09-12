import type { Request, RequestHandler, Response } from "express";
import type { UsersService } from "./users.service.js";
import {
  createConnectionSchema,
  onboardingSchema,
  preferenceSchema,
  taskSchema,
  updateConnectionSchema,
  validateProfilePayload,
} from "./users.validators.js";

function userId(res: Response): string {
  return res.locals.auth.user.id;
}

function endpoint(
  handler: (req: Request, res: Response) => Promise<void>,
  fallback: string,
): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => {
      res.status(500).json({ detail: error instanceof Error ? error.message : fallback });
    });
  };
}

export function createUsersController(service: UsersService) {
  return {
    completeOnboarding: endpoint(async (req, res) => {
      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          detail: "fullName, country, and organization are required",
        });
        return;
      }
      res.json(await service.completeOnboarding(userId(res), parsed.data));
    }, "Onboarding failed"),

    ensureProfile: endpoint(async (_req, res) => {
      await service.ensureProfile(userId(res));
      res.json({ ok: true });
    }, "Failed to create profile"),

    getProfile: endpoint(async (_req, res) => {
      res.json(await service.getProfile(userId(res)));
    }, "Failed to load profile"),

    updateProfile: endpoint(async (req, res) => {
      const parsed = validateProfilePayload(req.body);
      if (!parsed.ok) {
        res.status(400).json({ detail: parsed.detail });
        return;
      }
      res.json(await service.updateProfile(userId(res), parsed.update));
    }, "Update failed"),

    listConnections: endpoint(async (_req, res) => {
      res.json(await service.listConnections(userId(res)));
    }, "Failed to list connections"),

    createConnection: (async (req, res) => {
      const parsed = createConnectionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ detail: parsed.error.message });
        return;
      }
      try {
        res.status(201).json(await service.createConnection(userId(res), parsed.data));
      } catch (error) {
        res
          .status(400)
          .json({ detail: error instanceof Error ? error.message : "Invalid connection" });
      }
    }) satisfies RequestHandler,

    updateConnection: (async (req, res) => {
      const parsed = updateConnectionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ detail: parsed.error.message });
        return;
      }
      try {
        const connection = await service.updateConnection(
          userId(res),
          req.params.connectionId,
          parsed.data,
        );
        if (!connection) {
          res.status(404).json({ detail: "Connection not found" });
          return;
        }
        res.json(connection);
      } catch (error) {
        res
          .status(400)
          .json({ detail: error instanceof Error ? error.message : "Invalid connection" });
      }
    }) satisfies RequestHandler,

    deleteConnection: endpoint(async (req, res) => {
      const deleted = await service.deleteConnection(userId(res), req.params.connectionId);
      if (!deleted) {
        res.status(404).json({ detail: "Connection not found" });
        return;
      }
      res.status(204).send();
    }, "Failed to delete connection"),

    testConnection: (async (req, res) => {
      try {
        const result = await service.testConnection(userId(res), req.params.connectionId);
        if (result === "not-found") {
          res.status(404).json({ detail: "Connection not found" });
          return;
        }
        if (result === "no-model") {
          res.status(409).json({ detail: "Connection has no available model" });
          return;
        }
        res.json({ ok: true });
      } catch {
        res.status(502).json({ detail: "Provider connection test failed" });
      }
    }) satisfies RequestHandler,

    listModels: endpoint(async (_req, res) => {
      res.json(await service.listModels(userId(res)));
    }, "Failed to list models"),

    getPreferences: endpoint(async (_req, res) => {
      res.json(await service.getPreferences(userId(res)));
    }, "Failed to load AI preferences"),

    setPreference: (async (req, res) => {
      const task = taskSchema.safeParse(req.params.task);
      const body = preferenceSchema.safeParse(req.body);
      if (!task.success || !body.success) {
        res.status(400).json({ detail: "Invalid AI preference" });
        return;
      }
      try {
        res.json(await service.setPreference(userId(res), task.data, body.data));
      } catch (error) {
        res
          .status(400)
          .json({ detail: error instanceof Error ? error.message : "Invalid preference" });
      }
    }) satisfies RequestHandler,

    deleteAccount: endpoint(async (_req, res) => {
      await service.deleteAccount(userId(res));
      res.status(204).send();
    }, "Delete failed"),
  };
}
