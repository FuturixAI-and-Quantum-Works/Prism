import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { RequestHandler, Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  createChatRouter,
  createProjectChatRouter,
  createWorkspaceChatRouter,
} from "../../src/modules/chat/chat.routes.js";

function registeredRoutes(router: Router): Set<string> {
  const stack = Reflect.get(router, "stack");
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

describe("chat route contract", () => {
  it("preserves all general, project, and workspace paths", () => {
    const handler: RequestHandler = (_req, _res, next) => next();
    const general = {
      list: handler,
      createSession: handler,
      create: handler,
      get: handler,
      update: handler,
      remove: handler,
      generateTitle: handler,
      stream: handler,
    };
    const workspace = { stream: handler, list: handler };
    expect(registeredRoutes(createChatRouter({ general, project: handler, workspace }))).toEqual(
      new Set([
        "GET /",
        "POST /session",
        "POST /create",
        "GET /:chatId",
        "PATCH /:chatId",
        "DELETE /:chatId",
        "POST /:chatId/generate-title",
        "POST /",
      ]),
    );
    expect(registeredRoutes(createProjectChatRouter(handler))).toEqual(new Set(["POST /"]));
    expect(registeredRoutes(createWorkspaceChatRouter(workspace))).toEqual(
      new Set(["POST /", "GET /chats"]),
    );
  });

  it("keeps route and controller modules free of direct infrastructure imports", async () => {
    for (const path of [
      "../../src/modules/chat/chat.routes.ts",
      "../../src/modules/chat/chat.controller.ts",
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
          expect.stringMatching(/(?:^|\/)(?:db|storage|llm|aiRegistry)(?:\/|\.|$)/),
        ]),
      );
      expect(imports).not.toContain("../lib/chatOrchestrator.js");
      expect(imports).not.toContain("../modules/ai/tools/chatRuntime.js");
    }
  });

  it("keeps stream transport and cancellation in the shared SSE boundary", async () => {
    const source = await readFile(
      new URL("../../src/modules/chat/chat.controller.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("runSSEStream");
    expect(source).not.toContain("new AbortController");
  });

  it("publishes every chat path in OpenAPI", () => {
    const specification = swaggerJsdoc({
      definition: {
        openapi: "3.0.0",
        info: { title: "Chat contract", version: "1.0.0" },
      },
      apis: [
        fileURLToPath(new URL("../../src/modules/chat/chat.openapi.routes.ts", import.meta.url)),
      ],
    });
    expect(Reflect.get(specification, "paths")).toMatchObject({
      "/chat": { get: {}, post: {} },
      "/chat/session": { post: {} },
      "/chat/create": { post: {} },
      "/chat/{chatId}": { get: {}, patch: {}, delete: {} },
      "/chat/{chatId}/generate-title": { post: {} },
      "/projects/{projectId}/chat": { post: {} },
      "/drive/workspaces/{workspaceId}/chat": { post: {} },
      "/drive/workspaces/{workspaceId}/chats": { get: {} },
    });
  });
});
