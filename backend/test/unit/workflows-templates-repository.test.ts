import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DrizzleTemplatesRepository } from "../../src/modules/templates/templates.repository.js";
import { DrizzleWorkflowsRepository } from "../../src/modules/workflows/workflows.repository.js";

const userId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const workflowId = "00000000-0000-4000-8000-000000000003";
const templateId = "00000000-0000-4000-8000-000000000004";

describe("workflow and template repositories", () => {
  let pglite: PGlite;
  let workflows: DrizzleWorkflowsRepository;
  let templates: DrizzleTemplatesRepository;

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email varchar(255) NOT NULL,
        full_name varchar(255) NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE user_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        display_name varchar(255),
        role text DEFAULT 'user' NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE workflows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stable_key varchar(100),
        user_id uuid REFERENCES users(id),
        title varchar(500) NOT NULL,
        type varchar(50) NOT NULL,
        prompt_md text,
        columns_config jsonb,
        practice varchar(255),
        is_system boolean DEFAULT false NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE workflow_shares (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id uuid NOT NULL REFERENCES workflows(id),
        shared_by_user_id uuid NOT NULL REFERENCES users(id),
        shared_with_email varchar(255) NOT NULL,
        allow_edit boolean DEFAULT false,
        created_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(workflow_id, shared_with_email)
      );
      CREATE TABLE hidden_workflows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        workflow_id uuid NOT NULL REFERENCES workflows(id),
        created_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(user_id, workflow_id)
      );
      CREATE TABLE templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stable_key varchar(120),
        user_id uuid REFERENCES users(id),
        name varchar(255) NOT NULL,
        category varchar(100) NOT NULL,
        description text,
        content_html text NOT NULL,
        fields jsonb,
        source_filename varchar(500),
        source_storage_path varchar(1000),
        source_mime_type varchar(255),
        source_checksum varchar(128),
        source_metadata jsonb,
        is_created_by_user boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);
    await pglite.query(
      `INSERT INTO users (id, email, full_name) VALUES
       ($1, 'owner@example.com', 'Owner'),
       ($2, 'other@example.com', 'Other')`,
      [userId, otherId],
    );
    const database = drizzle(pglite, { schema });
    workflows = new DrizzleWorkflowsRepository(database);
    templates = new DrizzleTemplatesRepository(database);
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("resolves stable workflow keys and shared workflow metadata", async () => {
    await pglite.query(
      `INSERT INTO workflows
       (id, stable_key, user_id, title, type, is_system)
       VALUES ($1, NULL, $2, 'Owned workflow', 'assistant', false),
              (gen_random_uuid(), 'builtin-review', NULL, 'Built in', 'assistant', true)`,
      [workflowId, userId],
    );
    await pglite.query(
      `INSERT INTO workflow_shares
       (workflow_id, shared_by_user_id, shared_with_email, allow_edit)
       VALUES ($1, $2, 'other@example.com', true)`,
      [workflowId, userId],
    );
    await pglite.query(
      "INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Workflow Owner')",
      [userId],
    );

    await expect(workflows.findByIdentifier("builtin-review")).resolves.toMatchObject({
      stableKey: "builtin-review",
      isSystem: true,
    });
    await expect(workflows.listAccessible([workflowId], "other@example.com")).resolves.toEqual([
      expect.objectContaining({
        workflow: expect.objectContaining({ id: workflowId }),
        sharedByName: "Workflow Owner",
      }),
    ]);
  });

  it("keeps user template writes scoped to their owner", async () => {
    await pglite.query(
      `INSERT INTO templates
       (id, user_id, name, category, content_html, is_created_by_user)
       VALUES ($1, $2, 'Agreement', 'Legal', '<p>x</p>', true)`,
      [templateId, userId],
    );

    await expect(
      templates.updateOwned(templateId, otherId, { name: "Blocked" }),
    ).resolves.toBeNull();
    await expect(
      templates.updateOwned(templateId, userId, { name: "Updated" }),
    ).resolves.toMatchObject({ name: "Updated", userId });
    await expect(templates.deleteOwned(templateId, otherId)).resolves.toBeNull();
  });
});
