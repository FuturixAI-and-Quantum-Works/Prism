# Phase 5 providers and background work checkpoint

Captured on 2026-09-01 from branch `prism-publication-modernization`.

## Configuration and application lifecycle

- `parseAppConfig` parses the environment into one `AppConfig` value and recursively freezes it. Discriminated unions describe runtime mode, storage, mail, RAG, conversion, and AI provider states.
- `installAppConfig` accepts the same object more than once but rejects replacement with a different object. Consumers cannot read configuration before installation.
- `createApplication` accepts `AppConfig` and explicit dependencies. It does not read `process.env`, listen on a socket, start timers, or own process signals.
- `backend/src/index.ts` owns HTTP startup. `backend/src/worker.ts` owns background worker startup. Both bind configuration and the database before constructing production dependencies.

The lifecycle registry runs cleanup in reverse registration order. Shutdown is idempotent and aggregates cleanup failures. The HTTP process stops accepting connections, closes idle connections, and forces remaining connections closed after the configured timeout. The worker stops polling, drains active handlers, and aborts them if its shutdown timeout expires.

## Object storage

`ObjectStore` exposes `put`, `get`, `delete`, `copy`, `signRead`, `health`, and `close` through one typed contract.

- Local storage validates relative POSIX keys, rejects traversal and symlink escapes, writes through a temporary file and atomic rename, syncs files and parent directories, and returns application download URLs backed by signed bearer tokens. Configuration rejects local storage in production and on Render.
- S3 storage supports the same data operations, maps missing objects to `ObjectNotFoundError`, creates provider-signed reads, checks bucket health, and destroys the SDK client once.
- Disabled storage rejects every data operation with `ObjectStoreDisabledError` and reports an unhealthy `disabled` state. It never falls back to process-local persistence.

The local and mocked S3 implementations pass the same contract tests. The tests also cover idempotent close, missing objects, copy overwrite behavior, signed-read TTL bounds, token tampering, and sanitized health failures.

## Mail delivery

`MailProvider` returns explicit sent, suppressed, and failed results. Failures include permanence and retry semantics.

- The console provider logs a fixed suppression event, reports `suppressed`, and never claims delivery.
- The SMTP provider applies connection and operation timeouts. It probes the transport for health, treats SMTP 5xx responses as permanent, and marks transient or ambiguous failures as at-least-once retries.
- The Resend provider passes the outbox idempotency key to Resend. It treats 408, 429, 5xx, transport failures, and timeouts as transient provider-idempotent retries. Other provider responses are permanent.

Template action links must use a configured trusted HTTPS origin before a real provider receives the message. Better Auth OTP delivery remains synchronous because authentication needs the delivery result. Other application email is inserted into the PostgreSQL outbox.

## Document conversion

`DocumentConverter` has separate FIFO queues for LibreOffice and Chromium. Each adapter has its own concurrency and queue bounds, so one adapter does not block the other.

The converter rejects oversized input before dispatch and checks output size before returning bytes. Each conversion uses a new temporary directory. LibreOffice also receives a per-operation profile directory. HTML conversion disables JavaScript, blocks resources outside `about:`, `data:`, and `blob:`, and uses an isolated Chromium profile.

Every request combines the caller signal with the configured timeout. Cancellation removes queued work, terminates the owned LibreOffice process group, or closes the owned Chromium browser. `close` rejects queued work, aborts active work, waits for cleanup, and returns the same promise to every caller.

## PostgreSQL jobs and outbox

The database owns `jobs`, `job_attempts`, and `outbox_events`. Enqueue operations use idempotency keys and reject reuse for different work. Claims use `FOR UPDATE SKIP LOCKED`, record ownership and lease expiry, and reject completion after ownership changes.

The worker renews active leases, recovers stale leases, applies bounded exponential retry delays, and stops at each record's attempt limit. With more than one lane, one lane reserves outbox capacity while the remaining lanes process jobs. Graceful shutdown stops new claims before draining active handlers.

The worker now owns:

- scheduled service health checks and retention cleanup;
- RAG indexing, retry classification, and retry delays;
- collaboration, governance, sharing, and admin test email delivery through the outbox.

The authenticated manual provider check remains an inline request path. OTP email also remains inline.

## Verification

The Phase 5 `npm run ci` run completed at 2026-09-01T18:07:47Z. It passed publication policy, the auth-local check, database verification, seed dry-runs, formatting, lint, both strict typechecks, tests, the production dependency audit, and both builds.

The test results were:

- 45 security tests passed.
- Two production compatibility tests passed.
- 144 unit tests passed across 18 Vitest files.
- 191 tests passed in total.

`npm run db:verify` regenerated the modular schema, compared it with `backend/drizzle/0000_prism_baseline.sql`, checked the Better Auth schema, and applied the baseline to PGlite. The run reported 67 tables. `npm audit --omit=dev` reported zero vulnerabilities. `npm run check:publication` passed.

A recording-time rerun did not reproduce the green checkpoint because the shared working tree had moved beyond the recorded Phase 5 source state. The rerun observed schema drift and later in-progress AI provider type and test failures. This record does not treat those later changes as Phase 5 results.

A focused recording-time run of the nine Phase 5 unit files passed all 131 tests. The publication check, production dependency audit, Markdown format check, TSV shape check, and whitespace check also passed.

## Environment limits

The verified CI run used Node 26.7.0 although the repository requires Node 22.x. npm also reported the obsolete local `devdir` setting. Vitest reported that Node had no `--localstorage-file`. Vite reported a 2,365.26 kB minified entry chunk.

Live PostgreSQL and provider integration checks did not run. `DATABASE_URL`, the S3 credentials, `RESEND_API_KEY`, `SMTP_HOST`, `MAIL_FROM`, `RAG_API_URL`, and `CONVERSION_SERVICE_URL` were unset. The Docker client was installed, but its daemon socket was unavailable. Local PostgreSQL executables and Podman were unavailable. LibreOffice was installed, while the Puppeteer Chromium binary was unavailable after install scripts were withheld.

Unit and PGlite checks cover the provider contracts, conversion controls, worker behavior, and database statements. They do not replace live checks against PostgreSQL, S3, SMTP, Resend, the RAG service, or Chromium.
