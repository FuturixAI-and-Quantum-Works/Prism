import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DrizzleProjectsRepository } from "../../src/modules/projects/projects.repository.js";
import {
  createProjectsTestDatabase,
  inviteeId,
  ownerId,
  projectId,
} from "./projects-test-database.js";

const invitation = {
  email: "invitee@example.com",
  role: "editor" as const,
  invitedByUserId: ownerId,
  tokenHash: "token-hash",
  actionUrl: "https://app.example.com/share/accept/token",
  expiresAt: new Date("2026-09-09T00:00:00.000Z"),
  senderName: "Owner",
};

describe("projects repository transactions", () => {
  let databaseFixture: Awaited<ReturnType<typeof createProjectsTestDatabase>>;
  let repository: DrizzleProjectsRepository;

  beforeEach(async () => {
    databaseFixture = await createProjectsTestDatabase();
    repository = new DrizzleProjectsRepository(databaseFixture.database);
  });

  afterEach(async () => {
    await databaseFixture.pglite.close();
  });

  it("persists a project invitation, outbox event, and attention item atomically", async () => {
    const project = await repository.createProject(
      { userId: ownerId, email: "owner@example.com" },
      { name: "Matter" },
    );
    const result = await repository.createInvitation(project, invitation);

    const [invitations, outbox, attention] = await Promise.all([
      databaseFixture.pglite.query<{ status: string }>(
        "SELECT status FROM share_invitations WHERE project_id = $1",
        [project.id],
      ),
      databaseFixture.pglite.query<{ payload: { email: { template: string } } }>(
        "SELECT payload FROM outbox_events WHERE aggregate_id = $1",
        [result.invitation.id],
      ),
      databaseFixture.pglite.query(
        "SELECT id FROM attention_items WHERE secondary_source_id = $1",
        [project.id],
      ),
    ]);
    expect(invitations.rows).toEqual([{ status: "pending" }]);
    expect(outbox.rows[0]?.payload.email.template).toBe("project-invitation");
    expect(attention.rows).toHaveLength(1);
    expect(result.delivery).toEqual({
      email: "invitee@example.com",
      status: "queued",
      attempts: 0,
    });
  });

  it("rolls back an invitation when durable enqueue fails", async () => {
    const project = await repository.createProject(
      { userId: ownerId, email: "owner@example.com" },
      { name: "Matter" },
    );
    await databaseFixture.pglite.exec(
      "ALTER TABLE outbox_events ADD CONSTRAINT reject_project_email CHECK (aggregate_type <> 'share_invitation')",
    );

    await expect(repository.createInvitation(project, invitation)).rejects.toThrow();
    const [projects, invitations] = await Promise.all([
      databaseFixture.pglite.query("SELECT id FROM projects"),
      databaseFixture.pglite.query("SELECT id FROM share_invitations"),
    ]);
    expect(projects.rows).toHaveLength(1);
    expect(invitations.rows).toHaveLength(0);
  });

  it("rolls back document moves when folder deletion fails", async () => {
    const folderId = "00000000-0000-4000-8000-000000000004";
    const documentId = "00000000-0000-4000-8000-000000000005";
    await databaseFixture.pglite.query(
      "INSERT INTO projects (id, user_id, name) VALUES ($1, $2, 'Matter')",
      [projectId, ownerId],
    );
    await databaseFixture.pglite.query(
      `INSERT INTO project_subfolders (id, project_id, user_id, name)
       VALUES ($1, $2, $3, 'Evidence')`,
      [folderId, projectId, ownerId],
    );
    await databaseFixture.pglite.query(
      `INSERT INTO documents (id, user_id, project_id, folder_id, filename)
       VALUES ($1, $2, $3, $4, 'evidence.pdf')`,
      [documentId, ownerId, projectId, folderId],
    );
    await databaseFixture.pglite.exec(
      "CREATE TABLE folder_guards (folder_id uuid REFERENCES project_subfolders(id) ON DELETE RESTRICT)",
    );
    await databaseFixture.pglite.query("INSERT INTO folder_guards (folder_id) VALUES ($1)", [
      folderId,
    ]);

    await expect(repository.deleteFolder(projectId, folderId)).rejects.toThrow();
    const document = await databaseFixture.pglite.query<{ folder_id: string | null }>(
      "SELECT folder_id FROM documents WHERE id = $1",
      [documentId],
    );
    expect(document.rows[0]?.folder_id).toBe(folderId);
  });

  it("supports concurrent membership removals", async () => {
    const secondUserId = "00000000-0000-4000-8000-000000000006";
    await databaseFixture.pglite.query(
      "INSERT INTO users (id, email, full_name) VALUES ($1, 'second@example.com', 'Second')",
      [secondUserId],
    );
    await databaseFixture.pglite.query(
      `INSERT INTO projects (id, user_id, name)
       VALUES ($1, $2, 'Matter')`,
      [projectId, ownerId],
    );
    const members = await databaseFixture.pglite.query<{ id: string }>(
      `INSERT INTO project_members (project_id, user_id, email, role, invited_by_user_id)
       VALUES
         ($1, $2, 'invitee@example.com', 'editor', $4),
         ($1, $3, 'second@example.com', 'editor', $4)
       RETURNING id`,
      [projectId, inviteeId, secondUserId, ownerId],
    );

    await Promise.all(members.rows.map(({ id }) => repository.removeMember(projectId, id)));
    const stored = await databaseFixture.pglite.query(
      "SELECT id FROM project_members WHERE project_id = $1",
      [projectId],
    );
    expect(stored.rows).toEqual([]);
  });
});
