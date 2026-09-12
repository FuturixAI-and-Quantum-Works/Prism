import { describe, expect, it, vi } from "vitest";
import { DownloadsAuthorizationPolicy } from "../../src/modules/downloads/downloads.policy.js";
import type { DownloadsRepository } from "../../src/modules/downloads/downloads.repository.js";

const actor = { userId: "user-1", email: "user@example.com" };

describe("downloads authorization policy", () => {
  it("hides storage paths with no owning record", async () => {
    const policy = new DownloadsAuthorizationPolicy(
      { findOwner: async () => null },
      { canReadDocument: vi.fn() },
      { file: vi.fn() },
    );
    await expect(policy.canRead("missing", actor)).resolves.toBe(false);
  });

  it("delegates document and drive access without leaking storage details", async () => {
    const owners = new Map([
      [
        "document-path",
        {
          kind: "document" as const,
          document: { id: "document-1", user_id: "owner-1", project_id: "project-1" },
        },
      ],
      ["file-path", { kind: "drive-file" as const, fileId: "file-1" }],
    ]);
    const repository: DownloadsRepository = {
      findOwner: async (path) => owners.get(path) ?? null,
    };
    const canReadDocument = vi.fn(async () => true);
    const file = vi.fn(async () => {
      throw new Error("denied");
    });
    const policy = new DownloadsAuthorizationPolicy(repository, { canReadDocument }, { file });

    await expect(policy.canRead("document-path", actor)).resolves.toBe(true);
    await expect(policy.canRead("file-path", actor)).resolves.toBe(false);
    expect(canReadDocument).toHaveBeenCalledWith(owners.get("document-path")?.document, actor);
    expect(file).toHaveBeenCalledWith({ userId: actor.userId }, "file-1", "read");
  });
});
