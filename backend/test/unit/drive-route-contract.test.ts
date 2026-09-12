import { readFile } from "node:fs/promises";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { DriveServices } from "../../src/modules/drive/drive.controller.js";
import { DriveFilesService } from "../../src/modules/drive/drive.files.service.js";
import { DriveFoldersService } from "../../src/modules/drive/drive.folders.service.js";
import { DriveInvitationsService } from "../../src/modules/drive/drive.invitations.service.js";
import { createDriveRouter } from "../../src/modules/drive/drive.routes.js";
import { DriveVersionsService } from "../../src/modules/drive/drive.versions.service.js";
import { DriveWorkspacesService } from "../../src/modules/drive/drive.workspaces.service.js";

function services(): DriveServices {
  return {
    files: Object.create(DriveFilesService.prototype),
    folders: Object.create(DriveFoldersService.prototype),
    versions: Object.create(DriveVersionsService.prototype),
    workspaces: Object.create(DriveWorkspacesService.prototype),
    invitations: Object.create(DriveInvitationsService.prototype),
  };
}

function registeredRoutes(): Set<string> {
  const stack = Reflect.get(createDriveRouter(services()), "stack");
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

describe("drive route contract", () => {
  it("preserves every existing endpoint", () => {
    const routes = registeredRoutes();
    for (const route of [
      "GET /files",
      "POST /files",
      "POST /files/copy",
      "POST /items/move",
      "POST /items/delete",
      "GET /files/:fileId",
      "PATCH /files/:fileId",
      "DELETE /files/:fileId",
      "GET /files/:fileId/url",
      "GET /files/:fileId/preview-summary",
      "GET /files/:fileId/versions",
      "POST /files/:fileId/versions",
      "GET /files/:fileId/activity",
      "GET /folders",
      "POST /folders",
      "GET /folders/:folderId",
      "PATCH /folders/:folderId",
      "DELETE /folders/:folderId",
      "GET /workspaces",
      "POST /workspaces",
      "GET /workspaces/:workspaceId",
      "PATCH /workspaces/:workspaceId",
      "DELETE /workspaces/:workspaceId",
      "GET /workspaces/:workspaceId/activity",
      "GET /workspaces/:workspaceId/members",
      "POST /workspaces/:workspaceId/members",
      "DELETE /workspaces/:workspaceId/members",
      "GET /workspaces/:workspaceId/invitations",
      "POST /workspaces/:workspaceId/invitations",
      "POST /workspaces/:workspaceId/request-access",
      "GET /workspaces/:workspaceId/access-requests",
      "PATCH /workspaces/:workspaceId/access-requests/:requestId",
    ]) {
      expect(routes).toContain(route);
    }
  });

  it("keeps routes and controllers free of infrastructure imports", async () => {
    for (const path of [
      "../../src/modules/drive/drive.routes.ts",
      "../../src/modules/drive/drive.controller.ts",
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
    }
  });

  it("keeps the published Drive paths in generated API source", async () => {
    const source = await readFile(
      new URL("../../src/modules/drive/drive.routes.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("@swagger");
    expect(source).toContain("/drive/files:");
    expect(source).toContain("/drive/folders/{folderId}:");
    expect(source).toContain("/drive/workspaces/{workspaceId}/access-requests/{requestId}:");
  });
});
