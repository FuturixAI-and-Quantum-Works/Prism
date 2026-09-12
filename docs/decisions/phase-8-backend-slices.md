# Phase 8 backend slices checkpoint

Captured on 2026-09-02 from branch `prism-publication-modernization`.

## Durable compliance and tabular work

Compliance review and tabular generation now run through the PostgreSQL job worker. Both slices persist run state and ordered stream events. Their APIs accept idempotency keys, reconnect from an event sequence or `Last-Event-ID`, and cancel both the run and its queued job.

Compliance analysis applies the shared usage policy before enqueueing work. It bounds document extraction and AI calls with the configured concurrency plan and token budget. The worker retries failed jobs up to the stored attempt limit. Persisted events let a client resume without restarting the analysis.

Tabular generation stores the request hash with the idempotency key. A reused key with different input returns a conflict. Run claims use an execution epoch, and cell transitions plus emitted events share repository transactions. This prevents an old worker or a duplicate delivery from overwriting a newer run.

The job registry handles `compliance.run`, `tabular.generate`, and `drive.storage.reconcile` beside the existing mail, health, and retrieval jobs.

## Domain ownership

The former route and coordinator files are split into module-owned boundaries:

- Documents use a composition root plus core, content, context, insight, change, placeholder, governance, lifecycle, membership, activity, notification, permission, DOCX, artifact, and repository modules. Executable route composition is 35 lines. The 863-line OpenAPI file contains declarative operation documentation.
- Drive uses separate workspace, folder, file, version, invitation, access-request, activity, policy, storage, and reconciliation modules. Its repository work is split across workspace, folder, file, and access-request repositories.
- Projects use route, controller, validator, DTO, policy, service, repository, composition, and OpenAPI modules.
- Workflows and rulebook generation use separate controllers, services, repositories, policies, routes, and OpenAPI definitions. Seeded system workflows remain read-only.
- Templates use route, controller, validator, policy, service, repository, object-storage, composition, and OpenAPI modules.
- Users and downloads each use route, controller, service, repository, policy or DTO support, composition, and OpenAPI modules. Production mounts only `/user`; the duplicate `/users` alias is absent.
- Chat uses separate session, policy, context, intent, persistence, annotation, execution, cancellation, management, coordinator, repository, transport, and OpenAPI modules. The former `chatOrchestrator.ts` and `chatRuntime.ts` compatibility files are absent.

Production composition imports these module routers directly. A source scan found no route or controller that imports Drizzle, the database, object storage, mail providers, or AI providers directly.

## Access and relational sharing

`AccessAuthority` is the shared authorization entry point. Its typed resource and action model covers projects, workspaces, documents, tabular reviews, compliance reviews, chats, workflows, templates, and invitations. One matrix maps owner, admin, editor, viewer, and document lifecycle roles to allowed actions. Repositories resolve grants, while services ask the authority for decisions before protected work.

Sharing uses relational membership and invitation records. Projects, workspaces, documents, tabular reviews, and workflows use their member or share tables. `share_invitations` stores one checked resource reference, a hashed token, an email, a role, an inviter, status, expiry, and acceptance data. Acceptance writes the matching membership or share row.

The legacy `projects.sharedWith` and `tabularReviews.sharedWith` JSON fields are absent from the schema and live DTOs. `tabular_review_shares` has unique review-to-user and review-to-email indexes. Frontend project and tabular requests no longer send `shared_with` or `sharedWith`.

## Storage and content integrity

Drive object changes use `DriveStorageCoordinator`. It persists an idempotent `drive_storage_operations` record before each put or copy, then marks the record committed only after the database callback succeeds. Failures move the record to cleanup. The worker claims stale work with owner and generation fencing, checks all live file and document-version references before deletion, tolerates an already-missing object, and repeats cleanup through a provider-timeout grace period.

This closes the crash window between object storage and PostgreSQL without deleting a path that committed data still references. Drive and templates receive the concrete object-store contract. Downloads and approvals receive drive-owned ports. Document composition receives the converter contract. The former drive and template storage wrappers and the global conversion facade are absent.

`documentContent.ts` is the shared backend importer for Mammoth, XLSX, and PDF.js. It also uses JSZip for bounded DOCX package reads, while `documents.zip.ts` is a separate bounded archive-writing helper. The content service resolves PDF, DOCX, text, HTML, and spreadsheet formats and provides bounded text, HTML, metadata, and DOCX package operations. The DOCX loader normalizes and validates archive paths, rejects duplicate or unsafe entries, limits entry count and expanded bytes, validates XML, propagates cancellation, and releases the archive after use.

Previews, compliance, tabular analysis, document metadata, tracked changes, templates, and AI tools use this shared content layer. Specialized tracked-change interpretation remains separate. Silent lossy DOCX conversion fallbacks are absent.

## Repository splits and final sizes

Compliance persistence is split into review, source, and run-event repositories. Tabular persistence is split into review/source, cell, chat, and run-event repositories. Drive persistence is split into workspace, folder, file/version/quota, access-request, and storage-reconciliation repositories. Chat separates chat records from context persistence. Documents separate the main repository from governance, placeholder, and activity persistence.

No executable backend runtime TypeScript file exceeds 700 lines. The largest files measured with `wc -l -c` are:

- `backend/src/jobs/repository.ts` at 687 lines and 21,681 bytes.
- `backend/src/config.ts` at 679 lines and 23,974 bytes.
- `backend/src/modules/tabular/tabular.run.repository.ts` at 679 lines and 22,293 bytes.
- `backend/src/modules/approvals/approvals.service.ts` at 678 lines and 24,243 bytes.
- `backend/src/modules/tabular/tabular.service.ts` at 673 lines and 24,234 bytes.
- `backend/src/modules/documents/documents.service.ts` at 655 lines and 22,866 bytes.
- `backend/src/modules/content/documentContent.ts` at 644 lines and 20,361 bytes.

The largest backend TypeScript source is `backend/src/modules/documents/documents.openapi.routes.ts` at 863 lines and 24,204 bytes. It contains declarative OpenAPI blocks and no executable domain workflow.

## Verification

The Phase 8 `npm run ci` run completed on 2026-09-02. Publication policy, the legacy auth-local check, database verification, every seed dry-run, formatting, zero-warning lint, all three workspace typechecks, tests, the production dependency audit, and all three builds passed.

The test results were:

- 42 security tests passed.
- Two document-format integration tests passed.
- 559 unit tests passed across 86 Vitest files.
- 603 tests passed in total.

`npm run db:verify` regenerated the modular schema, compared it with `backend/drizzle/0000_prism_baseline.sql`, checked the Better Auth schema, and applied the baseline to PGlite. The run reported 73 tables.

Seed validation checked five approval roles, five approval rules, three system workflows, eight AI models, seven core templates, three DOCX templates, and explicit admin input. `npm audit --omit=dev` reported zero vulnerabilities. `npm run check:publication` passed. The protocol, backend, and frontend production builds passed.

Focused source checks found one backend import site for the PDF, DOCX, and spreadsheet decoder libraries. They found no legacy project or tabular JSON sharing field, no route or controller infrastructure import, and no deleted compatibility facade.

## Environment limits

The verification used Node 26.7.0 although the repository requires Node 22.x. npm reported the obsolete local `devdir` setting. Vitest reported that Node had no `--localstorage-file`. Vite reported a 2,389.72 kB minified entry chunk.

The PostgreSQL client is installed, but `pg_isready -h 127.0.0.1 -p 5432` reported no response. PostgreSQL server binaries are absent. The Docker client is installed, but `/var/run/docker.sock` is absent and `docker info` cannot reach a daemon. The database checks therefore used PGlite. They do not prove leases, concurrent transactions, retries, or reconciliation against a live PostgreSQL server or object-store provider.
