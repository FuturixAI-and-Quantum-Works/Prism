import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { createProjectsController } from "../../src/modules/projects/projects.controller.js";
import { createProjectsRouter } from "../../src/modules/projects/projects.routes.js";
import { ProjectsService } from "../../src/modules/projects/projects.service.js";
import { ProjectError } from "../../src/modules/projects/projects.types.js";

function registeredRoutes(): Set<string> {
  const service: ProjectsService = Object.create(ProjectsService.prototype);
  const stack = Reflect.get(createProjectsRouter(service), "stack");
  if (!Array.isArray(stack)) throw new Error("Express router stack is unavailable");
  return new Set(
    stack.flatMap((layer: unknown) => {
      if (!layer || typeof layer !== "object") return [];
      const route = Reflect.get(layer, "route");
      if (!route || typeof route !== "object") return [];
      const path = Reflect.get(route, "path");
      const methods = Reflect.get(route, "methods");
      if (typeof path !== "string" || !methods || typeof methods !== "object") return [];
      return Object.entries(methods)
        .filter(([, enabled]) => enabled)
        .map(([method]) => `${method.toUpperCase()} ${path}`);
    }),
  );
}

describe("projects route contract", () => {
  it("preserves every projects endpoint", () => {
    const routes = registeredRoutes();
    for (const route of [
      "GET /",
      "POST /",
      "GET /:projectId",
      "PATCH /:projectId",
      "DELETE /:projectId",
      "GET /:projectId/people",
      "GET /:projectId/members",
      "POST /:projectId/invitations",
      "PATCH /:projectId/members/:memberId",
      "DELETE /:projectId/members/:memberId",
      "GET /:projectId/chats",
      "POST /:projectId/folders",
      "PATCH /:projectId/folders/:folderId",
      "DELETE /:projectId/folders/:folderId",
    ]) {
      expect(routes).toContain(route);
    }
  });

  it("keeps project transport modules free of infrastructure imports", async () => {
    for (const path of [
      "../../src/modules/projects/projects.routes.ts",
      "../../src/modules/projects/projects.controller.ts",
    ]) {
      const source = await readFile(new URL(path, import.meta.url), "utf8");
      const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
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

  it("publishes project response schemas in OpenAPI", () => {
    const specification = swaggerJsdoc({
      definition: {
        openapi: "3.0.0",
        info: { title: "Projects contract", version: "1.0.0" },
      },
      apis: [
        fileURLToPath(
          new URL("../../src/modules/projects/projects.openapi.routes.ts", import.meta.url),
        ),
      ],
    });
    const paths = Reflect.get(specification, "paths");
    expect(paths).toMatchObject({
      "/projects": {
        get: {
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Project" },
                  },
                },
              },
            },
          },
        },
      },
      "/projects/{projectId}/folders/{folderId}": {
        patch: {
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProjectFolder" },
                },
              },
            },
          },
        },
      },
    });
  });

  it("preserves controller status, validation, and error responses", async () => {
    const service: ProjectsService = Object.create(ProjectsService.prototype);
    service.create = vi.fn(async () => ({
      id: "project-1",
      userId: "user-1",
      name: "Matter",
      cmNumber: null,
      createdAt: new Date("2026-09-02T00:00:00.000Z"),
      updatedAt: new Date("2026-09-02T00:00:00.000Z"),
    }));
    service.invite = vi.fn();
    service.get = vi.fn(async () => {
      throw new ProjectError(404, "Project not found");
    });
    const controller = createProjectsController(service);
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      Reflect.set(res.locals, "auth", {
        user: { id: "user-1", email: "user@example.com" },
      });
      next();
    });
    app.post("/projects", controller.create);
    app.post("/projects/:projectId/invitations", controller.invite);
    app.get("/projects/:projectId", controller.get);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server address unavailable");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const created = await fetch(`${baseUrl}/projects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Matter" }),
      });
      expect(created.status).toBe(201);
      await expect(created.json()).resolves.toMatchObject({ id: "project-1", name: "Matter" });

      const legacyShare = await fetch(`${baseUrl}/projects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Matter", shared_with: ["user@example.com"] }),
      });
      expect(legacyShare.status).toBe(400);

      const invalid = await fetch(`${baseUrl}/projects/project-1/invitations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", role: "owner" }),
      });
      expect(invalid.status).toBe(400);
      await expect(invalid.json()).resolves.toEqual({
        detail: "role must be admin, editor, or viewer",
      });
      expect(service.invite).not.toHaveBeenCalled();

      const missing = await fetch(`${baseUrl}/projects/missing`);
      expect(missing.status).toBe(404);
      await expect(missing.json()).resolves.toEqual({ detail: "Project not found" });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
