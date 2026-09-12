import { readFile } from "node:fs/promises";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { createComplianceRouter } from "../../src/modules/compliance/compliance.routes.js";
import { ComplianceService } from "../../src/modules/compliance/compliance.service.js";

function registeredRoutes(): Set<string> {
  const service: ComplianceService = Object.create(ComplianceService.prototype);
  const stack = Reflect.get(createComplianceRouter(service), "stack");
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

describe("compliance route contract", () => {
  it("preserves existing endpoint paths", () => {
    const routes = registeredRoutes();
    for (const route of [
      "POST /",
      "GET /",
      "GET /for-document/:documentId",
      "GET /for-workspace/:workspaceId",
      "GET /:reviewId",
      "PATCH /:reviewId",
      "DELETE /:reviewId",
      "POST /:reviewId/supporting-docs",
      "DELETE /:reviewId/supporting-docs/:docId",
      "POST /:reviewId/rules",
      "PATCH /:reviewId/rules/:ruleId",
      "DELETE /:reviewId/rules/:ruleId",
      "POST /:reviewId/questions",
      "PATCH /:reviewId/questions/:questionId",
      "DELETE /:reviewId/questions/:questionId",
      "POST /:reviewId/run",
      "GET /:reviewId/run",
      "DELETE /:reviewId/run",
    ]) {
      expect(routes).toContain(route);
    }
  });

  it("keeps transport modules free of infrastructure clients", async () => {
    for (const path of [
      "../../src/modules/compliance/compliance.routes.ts",
      "../../src/modules/compliance/compliance.controller.ts",
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
          expect.stringMatching(/(?:^|\/)(?:db|storage|llm|email)(?:\/|\.|$)/),
        ]),
      );
    }
  });

  it("exposes reconnect and cancellation without changing the POST stream path", () => {
    const routes = registeredRoutes();
    expect(routes).toContain("POST /:reviewId/run");
    expect(routes).toContain("GET /:reviewId/run");
    expect(routes).toContain("DELETE /:reviewId/run");
  });
});
