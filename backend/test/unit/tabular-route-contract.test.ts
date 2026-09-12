import { readFile } from "node:fs/promises";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { createTabularRouter } from "../../src/modules/tabular/tabular.routes.js";
import { TabularService } from "../../src/modules/tabular/tabular.service.js";
import { updateReviewSchema } from "../../src/modules/tabular/tabular.validators.js";

function routes(): Set<string> {
  const service: TabularService = Object.create(TabularService.prototype);
  const stack = Reflect.get(createTabularRouter(service), "stack");
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

describe("tabular route contract", () => {
  it("accepts role-bearing shares and rejects the legacy email array", () => {
    expect(
      updateReviewSchema.parse({
        shares: [{ email: " Editor@Example.com ", role: "editor" }],
      }),
    ).toEqual({
      shares: [{ email: "editor@example.com", role: "editor" }],
    });
    expect(() => updateReviewSchema.parse({ shared_with: ["editor@example.com"] })).toThrow();
  });

  it("keeps generation path and adds reconnect and cancellation", () => {
    const registered = routes();
    const expected = [
      "GET /",
      "POST /",
      "POST /prompt",
      "GET /:reviewId",
      "GET /:reviewId/people",
      "PATCH /:reviewId",
      "DELETE /:reviewId",
      "POST /:reviewId/clear-cells",
      "POST /:reviewId/generate",
      "GET /:reviewId/generate",
      "DELETE /:reviewId/generate",
      "POST /:reviewId/regenerate-cell",
      "GET /:reviewId/regenerate-cell",
      "DELETE /:reviewId/regenerate-cell",
      "GET /:reviewId/chats",
      "DELETE /:reviewId/chats/:chatId",
      "GET /:reviewId/chats/:chatId/messages",
      "POST /:reviewId/chat",
    ];
    expect(registered.size).toBe(expected.length);
    for (const route of expected) {
      expect(registered).toContain(route);
    }
  });

  it("keeps route and controller free of infrastructure imports", async () => {
    for (const path of [
      "../../src/modules/tabular/tabular.routes.ts",
      "../../src/modules/tabular/tabular.controller.ts",
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
          expect.stringMatching(/(?:^|\/)(?:db|storage|mail|llm|aiRegistry)(?:\/|\.|$)/),
        ]),
      );
      expect(source).not.toContain("tabular.legacy");
    }
  });
});
