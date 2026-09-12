import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import swaggerJsdoc from "swagger-jsdoc";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { createDocumentsChangesRouter } from "../../src/modules/documents/documents.changes.routes.js";
import { DocumentChangesService } from "../../src/modules/documents/documents.changes.service.js";
import { createDocumentsContentRouter } from "../../src/modules/documents/documents.content.routes.js";
import { DocumentContextService } from "../../src/modules/documents/documents.context.service.js";
import { createDocumentsContextRouter } from "../../src/modules/documents/documents.context.routes.js";
import { createDocumentsCoreRouter } from "../../src/modules/documents/documents.core.routes.js";
import { createDocumentsGovernanceRouter } from "../../src/modules/documents/documents.governance.routes.js";
import { DocumentGovernanceService } from "../../src/modules/documents/documents.governance.service.js";
import { DocumentInsightsService } from "../../src/modules/documents/documents.insights.service.js";
import { createDocumentsInsightsRouter } from "../../src/modules/documents/documents.insights.routes.js";
import { createDocumentsPlaceholdersRouter } from "../../src/modules/documents/documents.placeholders.routes.js";
import { DocumentPlaceholdersService } from "../../src/modules/documents/documents.placeholders.service.js";
import { DocumentsService } from "../../src/modules/documents/documents.service.js";

function registeredRoutes(router: object): Set<string> {
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

function hasNewExpression(node: ts.Node): boolean {
  if (ts.isNewExpression(node)) return true;
  let found = false;
  node.forEachChild((child) => {
    found ||= hasNewExpression(child);
  });
  return found;
}

describe("documents route contract", () => {
  it("preserves core, version, context, insights, and change paths", () => {
    const service: DocumentsService = Object.create(DocumentsService.prototype);
    const context: DocumentContextService = Object.create(DocumentContextService.prototype);
    const insights: DocumentInsightsService = Object.create(DocumentInsightsService.prototype);
    const changes: DocumentChangesService = Object.create(DocumentChangesService.prototype);
    const governance: DocumentGovernanceService = Object.create(
      DocumentGovernanceService.prototype,
    );
    const placeholders: DocumentPlaceholdersService = Object.create(
      DocumentPlaceholdersService.prototype,
    );
    const routes = new Set([
      ...registeredRoutes(createDocumentsCoreRouter(service)),
      ...registeredRoutes(createDocumentsContentRouter(service)),
      ...registeredRoutes(createDocumentsContextRouter(context)),
      ...registeredRoutes(createDocumentsInsightsRouter(insights)),
      ...registeredRoutes(createDocumentsChangesRouter(changes)),
      ...registeredRoutes(createDocumentsGovernanceRouter(governance)),
      ...registeredRoutes(createDocumentsPlaceholdersRouter(placeholders)),
    ]);
    for (const route of [
      "GET /",
      "POST /",
      "POST /upload",
      "GET /:documentId",
      "PATCH /:documentId",
      "DELETE /:documentId",
      "GET /:documentId/versions",
      "POST /:documentId/versions",
      "POST /:documentId/versions/from-html",
      "GET /:documentId/context-files",
      "POST /:documentId/context-files",
      "DELETE /:documentId/context-files/:contextFileId",
      "GET /:documentId/insights",
      "POST /:documentId/edits/:editId/accept",
      "POST /:documentId/edits/:editId/reject",
      "POST /:documentId/change-requests",
      "GET /:documentId/change-requests",
      "PATCH /:documentId/change-requests/:requestId",
      "GET /:documentId/session-context",
      "GET /:documentId/members",
      "POST /:documentId/members",
      "DELETE /:documentId/members/:memberId",
      "GET /:documentId/shares",
      "POST /:documentId/invitations",
      "PATCH /:documentId/shares/:shareId",
      "DELETE /:documentId/shares/:shareId",
      "POST /:documentId/send-review",
      "POST /:documentId/send-approval",
      "POST /:documentId/approve",
      "POST /:documentId/reject",
      "POST /:documentId/finalize",
      "POST /:documentId/request-clarification",
      "GET /:documentId/chat-messages",
      "GET /:documentId/comments",
      "POST /:documentId/comments",
      "PATCH /:documentId/comments/:commentId",
      "DELETE /:documentId/comments/:commentId",
      "GET /:documentId/activity",
      "GET /:documentId/placeholders",
      "PUT /:documentId/placeholders/values",
      "POST /:documentId/placeholders/apply",
      "GET /:documentId/edits",
    ]) {
      expect(routes).toContain(route);
    }
  });

  it("keeps split routes and controllers free of infrastructure imports", async () => {
    const files = [
      "documents.routes.ts",
      "documents.openapi.routes.ts",
      "documents.core.routes.ts",
      "documents.content.routes.ts",
      "documents.context.routes.ts",
      "documents.insights.routes.ts",
      "documents.changes.routes.ts",
      "documents.governance.routes.ts",
      "documents.placeholders.routes.ts",
      "documents.core.controller.ts",
      "documents.content.controller.ts",
      "documents.context.controller.ts",
      "documents.insights.controller.ts",
      "documents.changes.controller.ts",
      "documents.governance.controller.ts",
      "documents.placeholders.controller.ts",
    ];
    for (const filename of files) {
      const path = `../../src/modules/documents/${filename}`;
      const source = await readFile(new URL(path, import.meta.url), "utf8");
      const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
      const imports = parsed.statements.flatMap((statement) =>
        ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
          ? [statement.moduleSpecifier.text]
          : [],
      );
      expect(imports).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/(?:^|\/)(?:ai|db|storage|llm|aiRegistry)(?:\/|\.|$)/),
        ]),
      );
      if (filename.endsWith(".routes.ts")) {
        expect(hasNewExpression(parsed)).toBe(false);
      }
    }
  });

  it("preserves the published document OpenAPI contract", () => {
    const specification = swaggerJsdoc({
      definition: {
        openapi: "3.0.0",
        info: { title: "Document contract", version: "1.0.0" },
      },
      apis: [
        fileURLToPath(
          new URL("../../src/modules/documents/documents.openapi.routes.ts", import.meta.url),
        ),
      ],
      failOnErrors: true,
    });
    const paths = Reflect.get(specification, "paths");
    if (!paths || typeof paths !== "object") throw new Error("OpenAPI paths are unavailable");
    const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);
    const operations = new Set(
      Object.entries(paths).flatMap(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== "object") return [];
        return Object.keys(pathItem)
          .filter((method) => methods.has(method))
          .map((method) => `${method.toUpperCase()} ${path}`);
      }),
    );

    expect(operations).toHaveLength(25);
    expect(operations).toEqual(
      new Set([
        "GET /documents",
        "POST /documents",
        "POST /documents/upload",
        "DELETE /documents/{documentId}",
        "PATCH /documents/{documentId}",
        "GET /documents/{documentId}/display",
        "POST /documents/download-zip",
        "GET /documents/{documentId}/url",
        "GET /documents/{documentId}/docx",
        "GET /documents/{documentId}/html",
        "GET /documents/{documentId}/versions",
        "POST /documents/{documentId}/versions",
        "POST /documents/{documentId}/versions/from-html",
        "POST /documents/{documentId}/export",
        "PATCH /documents/{documentId}/versions/{versionId}",
        "GET /documents/{documentId}/tracked-change-ids",
        "POST /documents/{documentId}/edits/{editId}/accept",
        "POST /documents/{documentId}/edits/{editId}/reject",
        "GET /documents/{documentId}/context-files",
        "POST /documents/{documentId}/context-files",
        "DELETE /documents/{documentId}/context-files/{contextFileId}",
        "GET /documents/{documentId}/insights",
        "POST /documents/{documentId}/change-requests",
        "GET /documents/{documentId}/change-requests",
        "PATCH /documents/{documentId}/change-requests/{requestId}",
      ]),
    );
    expect(createHash("sha256").update(JSON.stringify(paths)).digest("hex")).toBe(
      "e37f6b5b04b4ee63fcb3e064767cc9237478340bf7b47f4f83c5956f64c06512",
    );
  });
});
