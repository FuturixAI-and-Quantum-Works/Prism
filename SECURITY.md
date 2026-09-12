# Report and handle security issues

This guide explains how to report a vulnerability and how operators must protect a Prism deployment.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/FuturixAI-and-Quantum-Works/Prism/security/advisories/new). Include:

- The affected revision or deployment version.
- The prerequisites for exploitation.
- Reproduction steps with synthetic data.
- The impact you observed.
- A suggested fix, if you have one.

Do not include production credentials, access tokens, personal data, or customer documents. If private vulnerability reporting is unavailable, ask the repository owner for a private contact method without publishing vulnerability details.

The project currently supports the code on `main`. It does not publish maintained release branches or a response-time guarantee.

## Protect secrets

Store these values in a secret manager:

- `DATABASE_URL`.
- `BETTER_AUTH_SECRET`.
- `AUTH_OTP_SECRET`.
- `DOWNLOAD_SIGNING_SECRET`.
- `AI_CREDENTIAL_ENCRYPTION_KEYS`.
- Provider, object-store, OAuth, and mail credentials.

Generate each application secret independently. The backend rejects weak secrets and rejects a secret reused for another purpose.

Never commit an environment file. Do not paste secrets into issue reports, logs, screenshots, or chat prompts.

Keep every old AI credential-encryption key during rotation. Prism re-encrypts a stored provider credential when it reads that credential with a newer active key. Removing an old key first makes unread credentials unrecoverable.

## Protect network boundaries

Use HTTPS for every public origin and external service endpoint. Production startup rejects insecure `BETTER_AUTH_URL`, frontend origins, RAG endpoints, conversion-service endpoints, and object-store endpoints.

Set `TRUST_PROXY_HOPS=1` only when exactly one trusted reverse proxy sits in front of the API. Leave it unset when clients connect directly. An incorrect value can make client IP checks trust attacker-controlled forwarding headers.

List every browser origin in `FRONTEND_URL` or `CORS_ALLOWED_ORIGINS`. Prism rejects wildcard origins. Unsafe cookie-authenticated requests also require an allowed `Origin` header.

OpenAI-compatible endpoints receive user prompts and attached content that a model request needs. Prism blocks private, reserved, and metadata network addresses. Redirects must remain on the configured origin. Do not weaken those checks at a proxy.

The Express rate limiter uses process memory. Each API instance therefore has its own counters. Put a shared rate limit at the edge before you scale the API horizontally.

## Protect stored data

PostgreSQL contains identities, sessions, document metadata, comments, chat history, approvals, encrypted AI credentials, and work queues. Object storage contains source documents, versions, renditions, and generated files.

Back up the database, object store, and encryption keyring as one recovery set. Encrypt backups and restrict access. Follow [Back up and restore Prism](docs/backups-and-restore.md).

Local filesystem storage is for development. The backend rejects it in production and whenever it detects Render.

## Run document converters safely

DOC and DOCX conversion starts LibreOffice as a child process. HTML to PDF conversion starts Chromium with JavaScript disabled and blocks external resources.

Keep the Chromium sandbox enabled. If your runtime cannot start Chromium with its sandbox, prefer a compatible runtime. Set both `CONVERSION_CHROMIUM_SANDBOX_MODE=disabled` and `CONVERSION_CHROMIUM_NO_SANDBOX_ACKNOWLEDGED=true` only after you accept the isolation loss.

Treat every uploaded document as untrusted input. Keep Prism and its parser dependencies current, limit network access from application services, and run conversion workloads with the least filesystem and operating-system access they need.

## Check a deployment

Before exposing Prism to users:

1. Run the full repository checks.

   ```sh
   npm run ci
   ```

2. Confirm that the API health endpoint returns success.

   ```sh
   curl --fail https://api.example.com/health
   ```

3. Sign in through each enabled authentication method.
4. Upload, download, and delete a synthetic document.
5. Test each configured AI connection from **Settings > AI settings**.
6. Confirm that the worker processes an email and a queued job.
7. Restore the latest backup into an isolated environment.

The authenticated status page reports recorded API, database, and mail checks. It does not replace external monitoring.

## Read the license

Security fixes and hosted modifications remain subject to the [AGPL-3.0-only license](LICENSE). The summary in [README.md](README.md#license-and-hosted-modifications) is operational guidance, not legal advice.
