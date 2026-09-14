# Deploy and operate Prism

Prism needs a frontend, an API, a worker, PostgreSQL, object storage, and a mail provider. RAG and server-managed AI connections are optional.

The checked-in [`render.yaml`](../render.yaml) is the production reference. The checked-in [`compose.yaml`](../compose.yaml) is a loopback-only local stack.

## Tutorial: run the local Compose stack

Build and start PostgreSQL 16, Mailpit, the API, the worker, and the frontend.

```sh
docker compose up --build
```

Open:

- Prism at `http://localhost:8080`.
- The API at `http://localhost:8003`.
- Swagger UI at `http://localhost:8003/api-docs`.
- Mailpit at `http://localhost:8025`.
- PostgreSQL at `localhost:5432`.

All published ports bind to loopback. The API and worker share the `prism_storage` volume. PostgreSQL uses the `postgres_data` volume.

The Compose file contains development fallback secrets. Do not expose this stack to another network or reuse those values in a deployed environment.

The backend container runs migrations automatically before it starts the API. The migration runner records the applied baseline in Drizzle's journal. The stack does not run seeds.

Seed core records from the built backend container:

```sh
docker compose exec backend node dist/scripts/seedApprovalPolicies.js
docker compose exec backend node dist/scripts/seedWorkflows.js
docker compose exec backend node dist/scripts/seedAiCatalog.js
```

The backend image includes the bundled template inputs and compiled seed scripts. Seed all 61 templates:

```sh
docker compose exec backend node dist/scripts/seedTemplates.js
docker compose exec backend node dist/scripts/seedBundledDocxTemplates.js
```

The commands seed seven HTML templates and 54 DOCX templates. They can be rerun without creating duplicate system templates. See the [template catalog](template-catalog.md) for the inventory and license.

To import additional licensed or operator-owned DOCX files, copy them into a temporary operator directory and pass that directory explicitly:

```sh
docker compose exec backend mkdir -p operator-docx
docker compose cp /absolute/path/to/licensed-docx/. backend:/app/backend/operator-docx/
docker compose exec backend node dist/scripts/seedDocxTemplates.js operator-docx
```

Both DOCX seeds write source objects to the persistent `prism_storage` volume. A copied operator input directory is ephemeral.

Stop the stack without deleting data:

```sh
docker compose down
```

Use `docker compose down -v` only when you intend to delete both named volumes.

## Tutorial: deploy the Render Blueprint

1. Create or fork the repository in a Git provider that Render can access.
2. Create a Render Blueprint from [`render.yaml`](../render.yaml).
3. Enter every secret marked `sync: false` before the first deploy.
4. Wait for the PostgreSQL database, backend, worker, and static frontend to deploy.
5. Confirm `GET /health` on the backend.
6. Seed core records and the bundled templates from a backend shell, with the required object-store configuration in place.

   ```sh
   cd ..
   node backend/dist/scripts/seedApprovalPolicies.js
   node backend/dist/scripts/seedWorkflows.js
   node backend/dist/scripts/seedAiCatalog.js
   node backend/dist/scripts/seedTemplates.js
   node backend/dist/scripts/seedBundledDocxTemplates.js
   ```

7. Sign in, send an OTP, upload a synthetic document, and test an AI connection if one is configured.

The Blueprint creates:

- `futurixai-prism-backend`, a Docker web service.
- `futurixai-prism-worker`, a Docker background worker.
- `futurixai-prism-frontend`, a static site.
- `futurixai-prism-postgres`, a private PostgreSQL 16 database.

The backend pre-deploy command runs Drizzle migrations. The frontend build embeds `VITE_API_BASE_URL`; redeploy the static site after that URL changes.

## How-to: complete required Render configuration

The Blueprint does not provision object storage. Create an S3-compatible bucket and set:

```sh
OBJECT_STORE_ENDPOINT=https://object-store.example.com
OBJECT_STORE_REGION=us-east-1
OBJECT_STORE_BUCKET=prism
OBJECT_STORE_ACCESS_KEY_ID=replace-me
OBJECT_STORE_SECRET_ACCESS_KEY=replace-me
OBJECT_STORE_FORCE_PATH_STYLE=false
```

Create and retain a credential-encryption keyring:

```sh
AI_CREDENTIAL_ACTIVE_KEY_ID=v1
AI_CREDENTIAL_ENCRYPTION_KEYS='{"v1":"replace-with-a-long-random-secret"}'
```

The Blueprint generates the three application secrets for the backend and references them from the worker. It does not generate the AI credential keyring because operators must retain that keyring with backups.

The Blueprint selects Resend. Set:

```sh
RESEND_API_KEY=re_replace_me
MAIL_FROM=prism@example.com
```

`EMAIL_REPLY_TO` is optional. Set at least one provider key if users need a server-managed AI connection. See [Configure AI providers](providers.md).

RAG is disabled because the Blueprint leaves `QDRANT_URL` empty. Set the Qdrant HTTPS endpoint and API key only when a cluster is available.

## How-to: use custom domains

After attaching custom domains, update all URL settings together:

- Backend `BETTER_AUTH_URL` to the public API origin.
- Backend `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` to the public frontend origin.
- Frontend `VITE_API_BASE_URL` to the public API origin.

If Google sign-in is enabled, register the callback at:

```text
https://api.example.com/auth/callback/google
```

Redeploy the frontend after changing `VITE_API_BASE_URL`. Restart both backend processes after changing shared runtime settings.

## How-to: seed templates on a hosted database

The runtime image includes both bundled template packs. From a backend container shell, after migrations and with production database, application-secret, and S3-compatible object-store configuration in place, run:

```sh
cd ..
node backend/dist/scripts/seedTemplates.js
node backend/dist/scripts/seedBundledDocxTemplates.js
```

The shell starts in the container's `/app/backend` working directory; `cd ..` selects `/app`. The commands seed seven HTML templates and 54 DOCX templates. DOCX sources are uploaded to the configured object store; the image's bundled input files are not a substitute for persistent document storage.

Alternatively, use a trusted checkout with Node dependencies and network access to the hosted PostgreSQL database and object store:

1. Set the production `DATABASE_URL`, application secrets, object-store variables, and `NODE_ENV=production`.
2. Run the seed commands.

   ```sh
   npm run seed:templates --workspace @prism/backend
   npm run seed:bundled-docx --workspace @prism/backend
   ```

3. Remove temporary database network access.
4. Confirm the expected templates in the application.

To add further DOCX templates, follow [Import operator-owned DOCX templates](template-catalog.md#import-operator-owned-docx-templates) and pass the licensed directory to `seed:docx-templates`.

Do not put production secrets in shell history or repository files. If policy forbids a workstation connection, create a short-lived private seeding job from a reviewed image that includes only the required seed inputs.

## How-to: release safely

1. Back up PostgreSQL, object storage, and the AI credential keyring. Follow [Back up and restore Prism](backups-and-restore.md).
2. Run the repository CI sequence against the release revision.

   ```sh
   npm run ci
   ```

3. Review generated migration SQL.
4. Deploy the backend. Render runs migrations before replacing the web process.
5. Deploy the worker from the same revision and with the same shared configuration.
6. Deploy the frontend.
7. Check health, sign-in, upload, download, conversion, mail, and one queued operation.

Code rollback does not undo a database migration. Use a forward repair when possible. Restore the coordinated backup when a migration cannot be made backward-compatible.

## Reference: runtime defaults

- Host-run API port: `3001`.
- Host-run Vite port: `5173`.
- Compose and backend container port: `8003`.
- Compose frontend port: `8080`.
- Compose Mailpit UI port: `8025`.
- Compose PostgreSQL port: `5432`.
- Production storage: disabled unless S3-compatible credentials are complete.
- Development storage: local filesystem when no S3 configuration is present.
- Mail: console provider when no provider is selected.
- RAG: disabled when `QDRANT_URL` is empty.
- Worker concurrency: `4`.
- API and worker graceful-shutdown timeout: 10 seconds by default; the Render Blueprint sets 25 seconds.
- Local conversion: LibreOffice for DOC and DOCX, Chromium for HTML.

Render filesystems are ephemeral. Never use local storage for deployed documents. The backend rejects local storage in production and whenever it detects Render.

## How-to: monitor and recover

Monitor the public `/health` endpoint from outside Render. Use the authenticated status page for recorded database, API, and mail checks. Review API and worker logs together when a queued operation fails.

The worker uses database leases. After a restart, it can reclaim expired jobs and outbox events. Repeated failure still needs operator action; inspect the stored attempt and error before retrying.

For an incident:

1. Stop writes if data consistency is at risk.
2. Preserve API, worker, PostgreSQL, and object-store evidence.
3. Identify the deployed Git revision and migration level.
4. Restore into an isolated environment.
5. Validate database references and object availability.
6. Resume public traffic only after representative workflows pass.

## Explanation: deployment boundaries

The API is stateless apart from process-local rate-limit counters and active requests. Durable state belongs in PostgreSQL and object storage. This permits replacement deployments, but it means all API instances need identical secrets and external-service configuration.

The worker is not optional for a complete product deployment. The API can answer health checks without it while email, indexing, compliance, tabular generation, health history, and storage reconciliation remain queued.
