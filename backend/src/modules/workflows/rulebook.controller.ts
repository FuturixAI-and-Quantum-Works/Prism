import type { Request, RequestHandler, Response } from "express";
import { z, ZodError } from "zod";
import type { RulebookDraftService } from "./rulebook.service.js";
import { WorkflowError, type WorkflowActor } from "./workflows.types.js";

const generateRulebookSchema = z.object({
  document_type: z.preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .min(1, "document_type is required")
      .max(160, { error: "document_type is too long" }),
  ),
  sample_document_id: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : "")),
  extra_requirements: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : "")),
  count: z.unknown().transform((value) => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? Math.min(30, Math.max(4, parsed)) : 12;
  }),
});

function actor(res: Response): WorkflowActor {
  return {
    userId: res.locals.auth.user.id,
    email: res.locals.auth.user.email.toLowerCase(),
  };
}

function errorResponse(error: unknown, res: Response): void {
  if (error instanceof WorkflowError) {
    res.status(error.status).json({ detail: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ detail: error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  res.status(502).json({ detail: "Failed to generate rulebook from LLM" });
}

function endpoint(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    void handler(req, res).catch((error: unknown) => errorResponse(error, res));
  };
}

export function createRulebookController(service: RulebookDraftService) {
  return {
    generate: endpoint(async (req, res) => {
      const body = generateRulebookSchema.parse(req.body);
      res.json(
        await service.generate(actor(res), {
          documentType: body.document_type,
          sampleDocumentId: body.sample_document_id,
          extraRequirements: body.extra_requirements,
          count: body.count,
        }),
      );
    }),
  };
}
