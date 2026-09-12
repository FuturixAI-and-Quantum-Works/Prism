import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DrizzleAccessRepository } from "../../src/modules/access/access.repository.js";
import { DrizzleProjectsRepository } from "../../src/modules/projects/projects.repository.js";
import {
  createProjectsTestDatabase,
  inviteeId,
  ownerId,
  projectId,
} from "./projects-test-database.js";

describe("DrizzleProjectsRepository", () => {
  let databaseFixture: Awaited<ReturnType<typeof createProjectsTestDatabase>>;
  let repository: DrizzleProjectsRepository;

  beforeEach(async () => {
    databaseFixture = await createProjectsTestDatabase();
    repository = new DrizzleProjectsRepository(databaseFixture.database);
    await databaseFixture.pglite.query(
      `INSERT INTO projects (id, user_id, name)
       VALUES ($1, $2, 'Matter')`,
      [projectId, ownerId],
    );
  });

  afterEach(async () => {
    await databaseFixture.pglite.close();
  });

  it("stores memberships while the access repository resolves their roles", async () => {
    await databaseFixture.pglite.query(
      `INSERT INTO project_members (project_id, user_id, email, role, invited_by_user_id)
       VALUES ($1, $2, 'invitee@example.com', 'viewer', $3)`,
      [projectId, inviteeId, ownerId],
    );
    const adminId = "00000000-0000-4000-8000-000000000004";
    await databaseFixture.pglite.query(
      "INSERT INTO users (id, email, full_name) VALUES ($1, 'admin@example.com', 'Admin')",
      [adminId],
    );
    await databaseFixture.pglite.query(
      "INSERT INTO user_profiles (user_id, role) VALUES ($1, 'admin')",
      [adminId],
    );

    const access = new DrizzleAccessRepository(databaseFixture.database);
    const resource = { kind: "project" as const, id: projectId };
    await expect(
      access.findGrant({ userId: ownerId, email: "owner@example.com" }, resource),
    ).resolves.toMatchObject({ role: "owner" });
    await expect(
      access.findGrant({ userId: inviteeId, email: "invitee@example.com" }, resource),
    ).resolves.toMatchObject({ role: "viewer" });
    await expect(
      access.findGrant(
        {
          userId: "00000000-0000-4000-8000-000000000099",
          email: "outsider@example.com",
        },
        resource,
      ),
    ).resolves.toBeNull();
    await expect(
      access.findGrant({ userId: adminId, email: "admin@example.com" }, resource),
    ).resolves.toMatchObject({ role: "admin" });
  });

  it("removes membership from the authoritative relation", async () => {
    const member = await databaseFixture.pglite.query<{ id: string }>(
      `INSERT INTO project_members (project_id, user_id, email, role, invited_by_user_id)
       VALUES ($1, $2, 'legacy@example.com', 'editor', $3)
       RETURNING id`,
      [projectId, inviteeId, ownerId],
    );

    await expect(repository.removeMember(projectId, member.rows[0]!.id)).resolves.toBe(true);
    const members = await databaseFixture.pglite.query(
      "SELECT id FROM project_members WHERE project_id = $1",
      [projectId],
    );
    expect(members.rows).toHaveLength(0);
  });
});
