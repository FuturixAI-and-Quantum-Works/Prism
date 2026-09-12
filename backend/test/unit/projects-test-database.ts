import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../src/db/schema/index.js";

const databaseSchema = `
  CREATE TABLE users (
    id uuid PRIMARY KEY,
    email varchar(255) NOT NULL,
    full_name varchar(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    display_name varchar(255),
    organisation varchar(255),
    role text DEFAULT 'user' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    cm_number varchar(100),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE project_subfolders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    parent_folder_id uuid REFERENCES project_subfolders(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE project_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    email varchar(255) NOT NULL,
    role text NOT NULL,
    invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    UNIQUE(project_id, email)
  );
  CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    project_id uuid REFERENCES projects(id),
    folder_id uuid REFERENCES project_subfolders(id),
    filename varchar(500) NOT NULL,
    file_type text,
    size_bytes bigint DEFAULT 0 NOT NULL,
    status text DEFAULT 'ready' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE share_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash varchar(128) NOT NULL UNIQUE,
    resource_type text NOT NULL,
    document_id uuid,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id uuid,
    email varchar(255) NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    invited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_by_user_id uuid,
    accepted_at timestamp,
    expires_at timestamp NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic varchar(120) NOT NULL,
    aggregate_type varchar(120) NOT NULL,
    aggregate_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    idempotency_key varchar(255) NOT NULL UNIQUE,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 10 NOT NULL,
    available_at timestamp DEFAULT now() NOT NULL,
    locked_by varchar(255),
    locked_until timestamp,
    published_at timestamp,
    last_error text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  );
  CREATE TABLE attention_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    source_type text NOT NULL,
    source_id uuid,
    secondary_source_id uuid,
    severity varchar(20) NOT NULL,
    title varchar(500) NOT NULL,
    description text,
    metadata jsonb,
    status text DEFAULT 'pending' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    resolved_at timestamp
  );
`;

export const ownerId = "00000000-0000-4000-8000-000000000001";
export const inviteeId = "00000000-0000-4000-8000-000000000002";
export const projectId = "00000000-0000-4000-8000-000000000003";

export async function createProjectsTestDatabase() {
  const pglite = new PGlite();
  await pglite.exec(databaseSchema);
  await pglite.query(
    `INSERT INTO users (id, email, full_name) VALUES
      ($1, 'owner@example.com', 'Owner'),
      ($2, 'invitee@example.com', 'Invitee')`,
    [ownerId, inviteeId],
  );
  return {
    pglite,
    database: drizzle(pglite, { schema }),
  };
}
