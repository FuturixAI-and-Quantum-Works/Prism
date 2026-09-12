import { describe, expect, it } from "vitest";
import { ProjectsAuthorizationPolicy } from "../../src/modules/projects/projects.policy.js";
import { stubAccessAuthority } from "./access-test-helpers.js";

const actor = { userId: "user-1", email: "user@example.com" };
const project = {
  id: "project-1",
  userId: "owner-1",
  name: "Matter",
  cmNumber: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("projects authorization policy", () => {
  it("hides missing access and distinguishes denied permissions", async () => {
    const repository = { findById: async () => project };
    const missing = new ProjectsAuthorizationPolicy(
      repository,
      stubAccessAuthority(() => null),
    );
    await expect(missing.require(project.id, actor, "read")).rejects.toMatchObject({
      status: 404,
      message: "Project not found",
    });

    const viewer = new ProjectsAuthorizationPolicy(
      repository,
      stubAccessAuthority(() => ({
        role: "viewer",
        source: "member",
        documentRole: null,
        documentLifecycle: null,
      })),
    );
    await expect(viewer.require(project.id, actor, "write")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("keeps owner-only mutation checks opaque", async () => {
    const policy = new ProjectsAuthorizationPolicy(
      { findById: async () => project },
      stubAccessAuthority(() => ({
        role: "admin",
        source: "member",
        documentRole: null,
        documentLifecycle: null,
      })),
    );
    await expect(policy.requireOwner(project.id, actor)).rejects.toMatchObject({
      status: 404,
      message: "Project not found",
    });
  });
});
