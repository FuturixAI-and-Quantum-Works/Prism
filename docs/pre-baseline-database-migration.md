# Move a pre-baseline private database

The public repository starts with [`backend/drizzle/0000_prism_baseline.sql`](../backend/drizzle/0000_prism_baseline.sql). That file creates a new database. It is not an in-place upgrade for private databases created from the earlier Supabase schema or the former `0000` through `0023` Drizzle migrations.

There is no supported automatic converter. Move retained data into a new database and keep the source database unchanged until validation is complete.

## Tutorial: prepare a migration rehearsal

1. Stop writes to the old deployment.
2. Back up PostgreSQL and every stored object. Follow [Back up and restore Prism](backups-and-restore.md).
3. Record the exact old application revision.
4. Inspect the old identity layout.

   ```sh
   psql "$SOURCE_DATABASE_URL" -c "select to_regclass('auth.users') as supabase_users, to_regclass('public.users') as public_users, to_regclass('public.auth_sessions') as legacy_sessions, to_regclass('public.sessions') as better_auth_sessions;"
   ```

5. Create an empty target database.
6. Point `DATABASE_URL` at the target and apply the baseline.

   ```sh
   npm run db:migrate --workspace @prism/backend
   ```

7. Perform the first import as a rehearsal. Do not direct users to this database.

The source can have one of two identity layouts:

- Supabase-era databases store identities in `auth.users`. Application tables can contain text user IDs, and `public.user_profiles.user_id` references `auth.users`.
- Later private Drizzle databases store identities in `public.users` and use `auth_accounts`, `auth_sessions`, and `auth_otp`.

The baseline uses Better Auth's `users`, `accounts`, `sessions`, `verifications`, and `rate_limits` tables. Detect the source layout instead of assuming it.

## How-to: export data

Use `\copy` from `psql` so files are written by the client, not the database server.

Export each retained table with an explicit column list.

```sh
psql "$SOURCE_DATABASE_URL"
```

At the `psql` prompt, an export has this form:

```sql
\copy (select id, user_id, name, cm_number, created_at, updated_at from public.projects order by id) to 'legacy-projects.csv' with (format csv, header true)
```

Do not use `select *`. The baseline removes some columns, adds constraints, and changes several identity fields.

Export the object store separately and preserve each object key exactly. The values in `document_versions.storage_path`, `document_versions.pdf_storage_path`, `files.storage_path`, `file_versions.storage_path`, and template source paths must still identify the copied objects.

## How-to: rebuild identities

Preserve user UUIDs. Almost every owned record refers to them.

For a later private Drizzle database, export the Better Auth user fields from the old `users` table:

```sql
\copy (
  select
    id,
    lower(email) as email,
    full_name,
    coalesce(email_verified, false) as email_verified,
    created_at,
    updated_at
  from public.users
  order by id
) to 'legacy-users.csv' with (format csv, header true)
```

In the target database, load the file through a staging table and then insert explicit fields:

```sql
create temporary table legacy_users (
  id uuid,
  email varchar(255),
  full_name varchar(255),
  email_verified boolean,
  created_at timestamp,
  updated_at timestamp
);

\copy legacy_users from 'legacy-users.csv' with (format csv, header true)

insert into public.users (
  id,
  email,
  full_name,
  email_verified,
  image,
  created_at,
  updated_at
)
select
  id,
  email,
  full_name,
  email_verified,
  null,
  created_at,
  updated_at
from legacy_users;
```

For a Supabase-era database, build the same six-column export from `auth.users`. Derive `full_name` from trusted profile metadata or `public.user_profiles.display_name`, and inspect every missing value. Do not copy password hashes or provider tokens into Better Auth tables.

Rebuild `user_profiles` after users. In the later private Drizzle layout:

- Move `country`, `jurisdiction`, `organization`, `role`, `storage_limit_bytes`, and `storage_used_bytes` from the old `users` row.
- Move `display_name`, `message_credits_used`, `credits_reset_date`, and `tier` from the old `user_profiles` row.
- Rename old `organisation` to `organization` only when the old user row has no organization.
- Set `professional_role` to `null` when no trustworthy source exists.
- Set `onboarding_completed` only after the required country and organization values have been reviewed.

Do not import `auth_sessions`, `auth_otp`, old `accounts`, `sessions`, or verification records. Make every user sign in again. Do not import `user_api_keys`; their legacy ciphertext is not the current provider-connection format. Users must add personal provider connections again.

## How-to: import application records

Load application records in dependency order:

1. Users and user profiles.
2. Workspaces, projects, memberships, and folders.
3. Documents and drive files without current-version pointers.
4. Document versions and file versions.
5. Current-version pointers.
6. Chats, messages, workflows, user templates, compliance reviews, and tabular reviews.
7. Shares, invitations, approvals, comments, activity, and notifications.

Use a temporary staging table for every CSV. Convert and validate values in `insert ... select` statements. Let target foreign keys and checks reject invalid rows; do not disable them.

Common tables in the later private Drizzle schema mostly retain their primary keys and column names, but that is not a guarantee for every private revision. Compare the recorded source revision with the current files under [`backend/src/db/schema/`](../backend/src/db/schema/) before preparing each insert.

Handle these cases explicitly:

- Omit the removed `projects.shared_with` JSON column. Import normalized project membership and sharing rows instead.
- Insert documents with `current_version_id` set to `null`, import their versions, and then set the pointer.
- Preserve parent folders only after their parents exist.
- Preserve enum spelling and case. Invalid lifecycle, role, share, approval, RAG, and notification values need a documented mapping.
- Import only user-created templates. Reseed maintained system templates.
- Skip service-health history, expired invitations, expired verification data, completed queue leases, and other operational data unless a retention requirement says otherwise.
- Do not import RAG collection state unless the same external index is retained. Prefer new collection records and reindex the restored sources.

Copy source and target row counts into a migration worksheet. Record each skipped or transformed row and its reason.

## How-to: seed and validate the target

Install maintained system records after user data is present.

```sh
npm run seed:core --workspace @prism/backend
npm run seed:templates --workspace @prism/backend
```

Check the target schema and seed data.

```sh
npm run db:verify
npm run seed:validate
```

Also validate:

- Every source user maps to one target user UUID and normalized email.
- Every foreign key resolves.
- Owner and member counts match the migration worksheet.
- Every current document version belongs to its document.
- Every referenced object exists and its checksum matches when a checksum is available.
- Sample DOCX, PDF, spreadsheet, and text files open and download.
- Users can sign in again and receive an OTP.
- User-created templates and workflows remain distinct from seeded system records.
- RAG sources can be reindexed.

Run the application against the target in an isolated environment and complete representative browser journeys before scheduling the final cutover.

## Reference: data that needs a new start

These old records are not portable as-is:

- Authentication sessions, OTPs, and account-provider records.
- Legacy encrypted user API keys.
- In-flight asynchronous work.
- External RAG indexes that were not copied with the database.

The baseline adds tables for Better Auth, AI provider connections and preferences, job attempts, outbox events, compliance runs, tabular runs, and storage reconciliation. Leave new operational tables empty unless a reviewed mapping requires otherwise.

## Explanation: why the baseline is not an upgrade

The baseline is a squashed description of the current schema. It has no instructions for preserving data from an older shape. Applying it to a populated database can stop on duplicate objects and cannot perform semantic transformations such as moving profile fields, invalidating old sessions, normalizing shares, or converting provider credentials.

A side-by-side export and import makes every transformation inspectable and keeps the original database available for rollback.
