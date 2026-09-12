import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import type { RequestUserContext } from "./documents.models.js";

export function documentActor(res: Response): RequestUserContext {
  return {
    userId: res.locals.auth.user.id,
    userEmail: res.locals.auth.user.email.toLowerCase(),
  };
}

export function documentEndpoint(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => {
      if (error instanceof ZodError) {
        res.status(400).json({ detail: error.issues[0]?.message ?? "Invalid request" });
        return;
      }
      const status =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
      const detail = error instanceof Error ? error.message : "Unknown error";
      res.status(status).json({ detail });
    });
  };
}
