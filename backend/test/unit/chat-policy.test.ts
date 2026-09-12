import { describe, expect, it, vi } from "vitest";
import { ChatPolicy, documentIdsFromMessages } from "../../src/modules/chat/chat.policy.js";
import { stubAccessAuthority } from "./access-test-helpers.js";

function dependencies(role: "viewer" | "editor" = "viewer") {
  return {
    authority: stubAccessAuthority(() => ({
      role,
      source: "member",
      documentRole: null,
      documentLifecycle: null,
    })),
    assertDocumentActionAllowed: vi.fn(async () => {
      throw new Error("not used");
    }),
    documentPermissionMessage: (error: unknown) =>
      error instanceof Error ? error.message : "denied",
    documentPermissionStatus: () => 403,
  };
}

describe("chat policy", () => {
  it("requires write access for the project chat route", async () => {
    const policy = new ChatPolicy(dependencies("viewer"));

    await expect(
      policy.authorizeRoute({
        userId: "user-1",
        userEmail: "user@example.com",
        routeMode: "project",
        scope: { type: "project", projectId: "project-1" },
        messages: [{ role: "user", content: "Hello" }],
      }),
    ).resolves.toEqual({
      kind: "error",
      status: 403,
      detail: "You do not have permission to use project editing tools",
    });
  });

  it("maps workspace access failures to the existing not-found response", async () => {
    const deps = dependencies("editor");
    deps.authority = stubAccessAuthority(() => null);
    const policy = new ChatPolicy(deps);

    await expect(
      policy.authorizeRoute({
        userId: "user-1",
        routeMode: "workspace",
        scope: { type: "workspace", workspaceId: "workspace-1" },
        messages: [{ role: "user", content: "Hello" }],
      }),
    ).resolves.toEqual({
      kind: "error",
      status: 404,
      detail: "Workspace not found",
    });
  });

  it("deduplicates and trims document ids before authorization", () => {
    expect(
      documentIdsFromMessages([
        {
          role: "user",
          content: "Review",
          files: [
            { filename: "one.docx", document_id: " document-1 " },
            { filename: "again.docx", document_id: "document-1" },
            { filename: "none.docx" },
          ],
        },
      ]),
    ).toEqual(["document-1"]);
  });
});
