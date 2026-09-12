<p align="center">
  <a href="https://www.futurixai.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/assets/futurixai-wordmark-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="docs/assets/futurixai-wordmark-light.svg">
      <img src="docs/assets/futurixai-wordmark-light.svg" alt="FuturixAI" height="32">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://prism.futurixai.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/assets/prism-mark-dark.gif">
      <source media="(prefers-color-scheme: light)" srcset="docs/assets/prism-mark-light.gif">
      <img src="docs/assets/prism-mark-light.gif" alt="Animated Prism logo" width="112" height="112">
    </picture>
  </a>
</p>

<h1 align="center">Prism</h1>

<p align="center"><strong>Contract litigation management system</strong></p>

<p align="center">
  A unified workspace for contract disputes, legal documents, review workflows,<br>
  approvals, source-backed research, and auditable collaboration.
</p>

<p align="center">
  <a href="https://github.com/FuturixAI-and-Quantum-Works/Prism/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/FuturixAI-and-Quantum-Works/Prism/ci.yml?branch=main&amp;style=flat-square&amp;label=CI&amp;logo=githubactions"></a>
  <a href="LICENSE"><img alt="AGPL-3.0-only license" src="https://img.shields.io/badge/license-AGPL--3.0--only-6e56cf?style=flat-square"></a>
  <img alt="Node.js 22" src="https://img.shields.io/badge/Node.js-22-339933?style=flat-square&amp;logo=nodedotjs&amp;logoColor=white">
  <img alt="PostgreSQL 16" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&amp;logo=postgresql&amp;logoColor=white">
</p>

<p align="center">
  <a href="#start-prism-locally">Quick start</a> ·
  <a href="./ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/deployment.md">Deployment</a> ·
  <a href="mailto:connect@futurixai.com">Enterprise</a>
</p>

---

Prism is an open-source contract litigation management system for drafting, reviewing, sharing, and managing legal work. Luna is the AI assistant inside Prism. The browser application uses React and Vite. The API uses Express, Better Auth, PostgreSQL, and Drizzle ORM.

## Platform preview

### Work with the Prism Assistant

Create, compare, and summarize documents from one focused workspace.

![Prism Assistant showing document creation, comparison, and summarization actions](docs/assets/screenshots/prism-assistant.jpg)

### Start from a seeded template

Launch common legal workflows from the included agreement and policy templates.

![Prism template library populated with seven seeded legal templates](docs/assets/screenshots/seeded-template-library.jpg)

## Built for contract litigation

- ⚖️ **Matters and collaboration** — Organize projects, matters, folders, participants, and access in one workspace.
- 📝 **Drafting and comparison** — Create, edit, compare, version, export, and share legal documents.
- 🔎 **Source-backed intelligence** — Index document sources and use retrieval-backed assistance without losing the underlying evidence.
- ✅ **Approvals and compliance** — Coordinate review policies, approval flows, rulebooks, compliance runs, and tabular reviews.
- 🤝 **Controlled collaboration** — Invite participants, assign roles, and keep work scoped to the right people.
- 🛡️ **Deployment control** — Self-host with PostgreSQL, S3-compatible storage, and optional Qdrant-backed retrieval.

> [!IMPORTANT]
> **Enterprise deployments**
>
> For private infrastructure, custom integrations, migration support, or managed rollouts, contact [connect@futurixai.com](mailto:connect@futurixai.com).

## What runs

The repository has three application processes and one required data service:

- [`frontend/`](frontend/) contains the React 19 and Vite 8 single-page application.
- [`backend/src/index.ts`](backend/src/index.ts) starts the Express API.
- [`backend/src/worker.ts`](backend/src/worker.ts) processes PostgreSQL-backed jobs and email outbox events.
- PostgreSQL 16 stores application data, Better Auth records, queues, and outbox events.

The shared event contract lives in [`packages/protocol/`](packages/protocol/). Uploaded and generated files use local storage during development or an S3-compatible object store in production.

## Start Prism locally

This tutorial starts PostgreSQL and Mailpit in Docker and runs Prism on the host.

### Prerequisites

Install these tools:

- Node.js 22.x.
- npm 11.19.0.
- Docker Engine with Docker Compose.
- LibreOffice if you need DOC or DOCX to PDF conversion.

Puppeteer installs its Chromium build with the normal dependency install. If you suppress Puppeteer install scripts, HTML to PDF conversion does not work until Chromium is available.

### Install the workspaces

From the repository root, install the locked dependencies.

```sh
npm ci
```

### Start PostgreSQL and Mailpit

```sh
docker compose up -d postgres mailpit
```

PostgreSQL is available on `localhost:5432`. Mailpit receives local email on port `1025` and shows it at `http://localhost:8025`. On a new volume, PostgreSQL creates an empty `prism` database. The migration step below applies the schema.

### Set the required environment

Run these commands in the shell that will start Prism. Generate a different value for every secret.

```sh
export NODE_ENV=development
export DATABASE_URL=postgresql://prism:prism-local-db@localhost:5432/prism
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
export AUTH_OTP_SECRET="$(openssl rand -hex 32)"
export DOWNLOAD_SIGNING_SECRET="$(openssl rand -hex 32)"
export AI_CREDENTIAL_ACTIVE_KEY_ID=v1
export AI_CREDENTIAL_ENCRYPTION_KEYS="{\"v1\":\"$(openssl rand -hex 32)\"}"
export BETTER_AUTH_URL=http://localhost:3001
export FRONTEND_URL=http://localhost:5173
export VITE_API_BASE_URL=http://localhost:3001
export MAIL_PROVIDER=smtp
export SMTP_HOST=127.0.0.1
export SMTP_PORT=1025
export MAIL_FROM=no-reply@prism.localhost
```

`VITE_API_BASE_URL` is required for this setup. The frontend source fallback is `http://localhost:3001`, matching the API default.

### Configure sign-in delivery

Better Auth uses six-digit email codes. The local settings above send them to Mailpit. Open `http://localhost:8025` to read a code.

For SMTP, set at least these values:

```sh
export MAIL_PROVIDER=smtp
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export MAIL_FROM=prism@example.com
```

Set both `SMTP_USERNAME` and `SMTP_PASSWORD` when the server requires authentication. Set `SMTP_SECURE=true` only for implicit TLS, which commonly uses port `465`.

For Resend, set these values:

```sh
export MAIL_PROVIDER=resend
export RESEND_API_KEY=re_replace_me
export MAIL_FROM=prism@example.com
```

You can instead configure Google sign-in with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register `http://localhost:3001/auth/callback/google` with Google for this local setup.

### Configure Qdrant for RAG

Source indexing and source-backed search need a Qdrant cluster. Leave `QDRANT_URL` unset to keep RAG disabled. Uploads still work in that mode.

Create a [Qdrant Cloud](https://cloud.qdrant.io/) cluster, then copy the cluster URL and API key. Prism sends document text to Qdrant inference for dense and BM25 vectors (`sentence-transformers/all-minilm-l6-v2` and `qdrant/bm25`), so the cluster must expose that inference API.

Set both values in the same environment that starts the API and worker. Copy them into `backend/.env` from [`.env.example`](.env.example), or export them in the shell:

```sh
export QDRANT_URL=https://your-cluster.cloud.qdrant.io
export QDRANT_API_KEY=replace-with-qdrant-api-key
```

`QDRANT_URL` and `QDRANT_API_KEY` must be set together. The URL must be absolute, must not include credentials, a query string, or a fragment, and must use HTTPS outside local development. In development only, a loopback HTTP URL such as `http://127.0.0.1:6333` is accepted. `RAG_REQUEST_TIMEOUT_MS` is optional and defaults to `15000`.

Restart both the API and the worker after you change these values. The worker claims `rag.index` jobs, extracts text from stored files, and upserts chunks into Qdrant. Open `http://localhost:5173/sources` while signed in to inspect indexed, pending, failed, and skipped sources.

For the Compose stack, set the same two variables in the host environment before `docker compose up`. The Blueprint leaves them empty until a cluster is available.

### Create the schema and seed data

Apply the Drizzle migrations to the empty database before you seed it:

```sh
npm run db:migrate --workspace @prism/backend
```

Seed application records:

```sh
npm run seed:core --workspace @prism/backend
npm run seed:templates --workspace @prism/backend
```

`seed:core` installs approval policies, workflows, and the AI model catalog. `seed:templates` installs seven HTML templates. Prism does not bundle DOCX templates. To import licensed or operator-owned DOCX files, follow the [template catalog](docs/template-catalog.md#import-operator-owned-docx-templates).

The baseline at [`backend/drizzle/0000_prism_baseline.sql`](backend/drizzle/0000_prism_baseline.sql) is for a new database. Do not apply it over a private database created before the baseline. Use the [pre-baseline database migration guide](docs/pre-baseline-database-migration.md).

### Start the application

```sh
npm run dev
```

Open `http://localhost:5173`. The API listens on `http://localhost:3001`. API documentation is available at `http://localhost:3001/api-docs`. The worker does not open a network port.

To grant an existing account the global administrator role, run:

```sh
npm run seed:admin --workspace @prism/backend -- --email admin@example.com
```

### Stop local services

```sh
docker compose down
```

The command keeps the `postgres_data` and `prism_storage` volumes. Adding `-v` deletes the local database and stored files.

## Run the complete Docker stack

The root Compose file can also build and run the frontend, API, worker, PostgreSQL, and Mailpit:

```sh
docker compose up --build
```

The backend container runs migrations automatically before it starts the API. Do not run a separate migration command for the complete Docker stack.

In this mode, open Prism at `http://localhost:8080` and the API at `http://localhost:8003`. See [Deploy and operate Prism](docs/deployment.md#tutorial-run-the-local-compose-stack) for seed behavior, volumes, and operational limits.

## Know the default behavior

- AI is unavailable until an administrator sets a server key or a user adds a provider connection under **Settings > AI settings**.
- RAG is disabled when `QDRANT_URL` is unset. Uploads still work, but source indexing and source-backed search do not. See [Configure Qdrant for RAG](#configure-qdrant-for-rag).
- Storage defaults to `backend/data` in development when the backend starts through its workspace script. Storage defaults to disabled in test and production.
- Local filesystem storage is rejected in production and on Render. Configure S3-compatible storage before either the API or worker starts.
- Mail defaults to the console provider. It records delivery as suppressed and does not expose email contents or OTP codes.
- DOC and DOCX conversion uses local LibreOffice. HTML to PDF conversion uses local Puppeteer Chromium. `CONVERSION_SERVICE_URL` is validated but is not used by the current converter.
- The worker handles RAG indexing, compliance runs, tabular generation, email delivery, health checks, and storage reconciliation. Run it whenever you need those features.

Read [provider setup](docs/providers.md) and [deployment operations](docs/deployment.md) for the complete configuration.

## Run the checks

Run the documentation check first.

```sh
node scripts/check-docs.mjs
```

Run the publication blocker scan.

```sh
npm run check:publication
```

Run the full local CI sequence.

```sh
npm run ci
```

The full sequence verifies the publication rules, authentication migration guard, database baseline, seed data, formatting, lint, types, unit and security tests, production dependency audit, builds, and mocked browser journeys.

## Read the documentation

### Tutorials

- This README contains the local first-run tutorial.

### How-to guides

- [Contribute to Prism](./CONTRIBUTING.md).
- [Report and handle security issues](./SECURITY.md).
- [Configure AI providers](docs/providers.md).
- [Configure Qdrant for RAG](#configure-qdrant-for-rag).
- [Back up and restore Prism](docs/backups-and-restore.md).
- [Move a pre-baseline private database](docs/pre-baseline-database-migration.md).
- [Deploy and operate Prism](docs/deployment.md).

### Reference

- [Template packs, jurisdictions, and licensing](docs/template-catalog.md).
- [Frontend design system](./frontend/DESIGN_SYSTEM.md).

### Explanation

- [Prism architecture](./ARCHITECTURE.md).

## License and hosted modifications

Prism is licensed under [GNU Affero General Public License version 3 only](LICENSE). If you modify Prism and let users interact with that modified version over a network, section 13 requires you to offer those users the Corresponding Source of the running version at no charge through a standard method. Sections 4 through 6 also contain notice and source requirements for distribution.

The application does not add a source-code link for an operator. A host of a modified version must provide an appropriate source offer that matches the deployed version. Keep the license and notices with redistributed copies.

This paragraph summarizes repository obligations. It is not legal advice. Read the license and ask qualified counsel how it applies to your deployment.
