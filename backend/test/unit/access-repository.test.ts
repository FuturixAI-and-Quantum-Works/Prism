import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DrizzleAccessRepository } from "../../src/modules/access/access.repository.js";

const ownerId = "00000000-0000-4000-8000-000000000001";
const memberId = "00000000-0000-4000-8000-000000000002";
const outsiderId = "00000000-0000-4000-8000-000000000003";
const projectId = "00000000-0000-4000-8000-000000000011";
const workspaceId = "00000000-0000-4000-8000-000000000012";
const documentId = "00000000-0000-4000-8000-000000000013";
const reviewId = "00000000-0000-4000-8000-000000000014";
const chatId = "00000000-0000-4000-8000-000000000015";
const workflowId = "00000000-0000-4000-8000-000000000016";
const templateId = "00000000-0000-4000-8000-000000000017";
const invitationId = "00000000-0000-4000-8000-000000000018";
const complianceReviewId = "00000000-0000-4000-8000-000000000019";

const databaseSchema = `
  CREATE TABLE user_profiles (user_id uuid PRIMARY KEY, role text NOT NULL);
  CREATE TABLE projects (id uuid PRIMARY KEY, user_id uuid NOT NULL);
  CREATE TABLE project_members (
    project_id uuid NOT NULL,
    user_id uuid,
    email text NOT NULL,
    role text NOT NULL
  );
  CREATE TABLE workspaces (id uuid PRIMARY KEY, owner_id uuid NOT NULL);
  CREATE TABLE workspace_members (
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL
  );
  CREATE TABLE documents (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid,
    lifecycle_status text NOT NULL
  );
  CREATE TABLE document_shares (
    document_id uuid NOT NULL,
    user_id uuid,
    email text NOT NULL,
    role text NOT NULL
  );
  CREATE TABLE document_members (
    document_id uuid NOT NULL,
    user_id uuid,
    email text,
    role text NOT NULL
  );
  CREATE TABLE tabular_reviews (id uuid PRIMARY KEY, user_id uuid NOT NULL, project_id uuid);
  CREATE TABLE compliance_reviews (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid,
    primary_document_id uuid
  );
  CREATE TABLE tabular_review_shares (
    review_id uuid NOT NULL,
    user_id uuid,
    email text NOT NULL,
    role text NOT NULL
  );
  CREATE TABLE chats (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid
  );
  CREATE TABLE chat_sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid
  );
  CREATE TABLE workflows (
    id uuid PRIMARY KEY,
    stable_key text,
    user_id uuid,
    is_system boolean NOT NULL
  );
  CREATE TABLE workflow_shares (
    workflow_id uuid NOT NULL,
    shared_with_email text NOT NULL,
    allow_edit boolean
  );
  CREATE TABLE templates (
    id uuid PRIMARY KEY,
    user_id uuid,
    is_created_by_user boolean NOT NULL
  );
  CREATE TABLE share_invitations (id uuid PRIMARY KEY, email text NOT NULL, role text NOT NULL);
`;

describe("DrizzleAccessRepository", () => {
  let pglite: PGlite;
  let repository: DrizzleAccessRepository;

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(databaseSchema);
    await pglite.exec(`
      INSERT INTO projects VALUES ('${projectId}', '${ownerId}');
      INSERT INTO workspaces VALUES ('${workspaceId}', '${ownerId}');
      INSERT INTO documents VALUES ('${documentId}', '${ownerId}', '${projectId}', NULL, 'DRAFT');
      INSERT INTO tabular_reviews VALUES ('${reviewId}', '${ownerId}', NULL);
      INSERT INTO compliance_reviews VALUES (
        '${complianceReviewId}',
        '${ownerId}',
        '${projectId}',
        NULL,
        '${documentId}'
      );
      INSERT INTO chats VALUES ('${chatId}', '${ownerId}', '${projectId}', NULL);
      INSERT INTO workflows VALUES ('${workflowId}', NULL, '${ownerId}', false);
      INSERT INTO templates VALUES ('${templateId}', '${ownerId}', true);
      INSERT INTO share_invitations VALUES (
        '${invitationId}',
        'member@example.com',
        'viewer'
      );
    `);
    repository = new DrizzleAccessRepository(drizzle(pglite, { schema }));
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("resolves user and email identities with explicit share roles", async () => {
    await Promise.all([
      pglite.query("INSERT INTO project_members VALUES ($1, $2, 'old@example.com', 'editor')", [
        projectId,
        memberId,
      ]),
      pglite.query(
        "INSERT INTO tabular_review_shares VALUES ($1, NULL, 'member@example.com', 'viewer')",
        [reviewId],
      ),
      pglite.query("INSERT INTO workflow_shares VALUES ($1, 'member@example.com', true)", [
        workflowId,
      ]),
    ]);
    const actor = { userId: memberId, email: "member@example.com" };
    await expect(
      repository.findGrant(actor, { kind: "project", id: projectId }),
    ).resolves.toMatchObject({ role: "editor", source: "member" });
    await expect(
      repository.findGrant(actor, { kind: "tabular-review", id: reviewId }),
    ).resolves.toMatchObject({ role: "viewer", source: "direct-share" });
    await expect(
      repository.findGrant(actor, { kind: "workflow", id: workflowId }),
    ).resolves.toMatchObject({ role: "editor", source: "direct-share" });
    await expect(
      repository.findGrant(actor, { kind: "invitation", id: invitationId }),
    ).resolves.toMatchObject({ role: "viewer", source: "invitation" });
    await expect(
      repository.findGrant(
        { userId: ownerId, email: "owner@example.com" },
        { kind: "compliance-review", id: complianceReviewId },
      ),
    ).resolves.toMatchObject({ role: "owner", source: "owner" });
  });

  it("denies cross-tenant access for every private resource kind", async () => {
    const actor = { userId: outsiderId, email: "outsider@example.com" };
    const resources = [
      { kind: "project", id: projectId },
      { kind: "workspace", id: workspaceId },
      { kind: "document", id: documentId },
      { kind: "tabular-review", id: reviewId },
      { kind: "compliance-review", id: complianceReviewId },
      { kind: "chat", id: chatId },
      { kind: "workflow", id: workflowId },
      { kind: "template", id: templateId },
      { kind: "invitation", id: invitationId },
    ] as const;
    for (const resource of resources) {
      await expect(repository.findGrant(actor, resource)).resolves.toBeNull();
    }
  });

  it("preserves resource-specific platform administrator access", async () => {
    await pglite.query("INSERT INTO user_profiles VALUES ($1, 'admin')", [outsiderId]);
    const actor = { userId: outsiderId, email: "admin@example.com" };

    for (const resource of [
      { kind: "project", id: projectId },
      { kind: "document", id: documentId },
      { kind: "tabular-review", id: reviewId },
      { kind: "chat", id: chatId },
    ] as const) {
      await expect(repository.findGrant(actor, resource)).resolves.toMatchObject({
        role: "admin",
        source: resource.kind === "chat" ? "project" : "global-admin",
      });
    }

    for (const resource of [
      { kind: "workspace", id: workspaceId },
      { kind: "compliance-review", id: complianceReviewId },
      { kind: "workflow", id: workflowId },
      { kind: "template", id: templateId },
    ] as const) {
      await expect(repository.findGrant(actor, resource)).resolves.toBeNull();
    }
    await expect(repository.listWorkspaceGrants(actor)).resolves.toEqual(new Map());
  });
});
