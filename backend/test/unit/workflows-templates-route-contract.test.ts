import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { createRulebookRouter } from "../../src/modules/workflows/rulebook.routes.js";
import { RulebookDraftService } from "../../src/modules/workflows/rulebook.service.js";
import { createTemplatesController } from "../../src/modules/templates/templates.controller.js";
import { createTemplatesRouter } from "../../src/modules/templates/templates.routes.js";
import { TemplatesService } from "../../src/modules/templates/templates.service.js";
import { TemplateError } from "../../src/modules/templates/templates.types.js";
import { createWorkflowsRouter } from "../../src/modules/workflows/workflows.routes.js";
import { WorkflowsService } from "../../src/modules/workflows/workflows.service.js";

function routes(router: express.Router): Set<string> {
  const stack = Reflect.get(router, "stack");
  if (!Array.isArray(stack)) throw new Error("Express router stack is unavailable");
  return new Set(
    stack.flatMap((layer: unknown) => {
      if (!layer || typeof layer !== "object") return [];
      const route = Reflect.get(layer, "route");
      const path = route && Reflect.get(route, "path");
      const methods = route && Reflect.get(route, "methods");
      if (typeof path !== "string" || !methods || typeof methods !== "object") return [];
      return Object.entries(methods)
        .filter(([, enabled]) => enabled)
        .map(([method]) => `${method.toUpperCase()} ${path}`);
    }),
  );
}

describe("workflow and template route contracts", () => {
  it("preserves workflow, rulebook, and template endpoints", () => {
    const workflowService: WorkflowsService = Object.create(WorkflowsService.prototype);
    const rulebookService: RulebookDraftService = Object.create(RulebookDraftService.prototype);
    const templateService: TemplatesService = Object.create(TemplatesService.prototype);
    expect(routes(createWorkflowsRouter(workflowService))).toEqual(
      new Set([
        "GET /",
        "POST /",
        "GET /hidden",
        "POST /hidden",
        "DELETE /hidden/:workflowId",
        "GET /:workflowId",
        "PUT /:workflowId",
        "PATCH /:workflowId",
        "DELETE /:workflowId",
        "GET /:workflowId/shares",
        "POST /:workflowId/share",
        "DELETE /:workflowId/shares/:shareId",
      ]),
    );
    expect(routes(createRulebookRouter(rulebookService))).toEqual(new Set(["POST /generate"]));
    expect(routes(createTemplatesRouter(templateService))).toEqual(
      new Set([
        "GET /",
        "POST /",
        "GET /:templateId",
        "PATCH /:templateId",
        "DELETE /:templateId",
        "POST /:templateId/create-document",
        "POST /:templateId/clone",
      ]),
    );
  });

  it("keeps route and controller modules free of direct infrastructure imports", async () => {
    for (const relativePath of [
      "../../src/modules/workflows/workflows.routes.ts",
      "../../src/modules/workflows/workflows.controller.ts",
      "../../src/modules/workflows/rulebook.routes.ts",
      "../../src/modules/workflows/rulebook.controller.ts",
      "../../src/modules/templates/templates.routes.ts",
      "../../src/modules/templates/templates.controller.ts",
    ]) {
      const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
      const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true);
      const imports = file.statements.flatMap((statement) =>
        ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
          ? [statement.moduleSpecifier.text]
          : [],
      );
      expect(imports).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/(?:^|\/)(?:db|storage|mail|email|llm|aiRegistry)(?:\/|\.|$)/),
        ]),
      );
    }
  });

  it("publishes workflow and template paths in OpenAPI", () => {
    const specification = swaggerJsdoc({
      definition: {
        openapi: "3.0.0",
        info: { title: "Workflow and template contract", version: "1.0.0" },
      },
      apis: [
        fileURLToPath(
          new URL("../../src/modules/workflows/workflows.openapi.routes.ts", import.meta.url),
        ),
        fileURLToPath(
          new URL("../../src/modules/templates/templates.openapi.routes.ts", import.meta.url),
        ),
      ],
    });
    expect(Reflect.get(specification, "paths")).toMatchObject({
      "/workflows": { get: {}, post: {} },
      "/workflows/{workflowId}/shares/{shareId}": { delete: {} },
      "/templates": { get: {}, post: {} },
      "/templates/{templateId}/create-document": { post: {} },
    });
  });

  it("maps template validation and domain errors at the controller boundary", async () => {
    const service: TemplatesService = Object.create(TemplatesService.prototype);
    service.create = vi.fn();
    service.get = vi.fn(async () => {
      throw new TemplateError(404, "Template not found");
    });
    const controller = createTemplatesController(service);
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      Reflect.set(res.locals, "auth", {
        user: { id: "user-1", email: "user@example.com" },
      });
      next();
    });
    app.post("/templates", controller.create);
    app.get("/templates/:templateId", controller.get);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server unavailable");
    try {
      const invalid = await fetch(`http://127.0.0.1:${address.port}/templates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: "Legal", content_html: "<p>x</p>" }),
      });
      expect(invalid.status).toBe(400);
      await expect(invalid.json()).resolves.toEqual({ detail: "name is required" });
      expect(service.create).not.toHaveBeenCalled();

      const missing = await fetch(`http://127.0.0.1:${address.port}/templates/missing`);
      expect(missing.status).toBe(404);
      await expect(missing.json()).resolves.toEqual({ detail: "Template not found" });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
