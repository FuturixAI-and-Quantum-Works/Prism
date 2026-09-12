# Phase 10 source-publication checkpoint

Captured on 2026-09-03 from the uncommitted
`prism-publication-modernization` tree based on
`11c21473a07ee6911c25959453c6d3af689d5237`.

This checkpoint assesses the current working tree for public review. It does
not certify a production deployment or a later revision.

## Publication assets and provenance

The tree deletes all 57 DOCX files that lacked evidence of redistribution
rights. No tracked DOCX file remains in the working tree. The old
`backend/Templates` and `backend/sampleTemplates` directories are retired.

Operator-owned DOCX import remains available through
`backend/src/scripts/seedDocxTemplates.ts`. The command requires an explicit
directory. It uploads each DOCX source when object storage is enabled and keeps
an operator path for local storage-disabled use. Core setup seeds seven
redistributable HTML templates and does not depend on an operator template
directory.

`docs/template-provenance.json` is the machine-readable provenance manifest. Its
empty `docx` list matches the current tree. `npm run check:publication` rejects
tracked DOCX files without complete source, author, license, redistribution
grant, and attribution fields. It also rejects DOCX files in either retired
directory.

## Repository quality and retained browser evidence

`npm run check:orphans` runs Knip as part of `ci:quality`. The cleanup removed
the unused `fast-diff` dependency, three redundant Tiptap table dependencies,
the unused `StreamMode` export, and duplicate tooling ownership. `knip.json`
contains one frontend test entry and one narrow unresolved-import exception for
the nested Vitest setup path.

The mocked Chromium suite writes run output to `test-results`. The repository
retains three reviewed screenshots:

- `e2e/artifacts/screenshots/dashboard.png`
- `e2e/artifacts/screenshots/document-editor.png`
- `e2e/artifacts/screenshots/review.png`

The durable-run journey enables video while the global policy remains
`retain-on-failure`; generated videos are not tracked. The suite exercises
deterministic browser behavior against `MockBackend`, not a live API or provider
integration.

## Authorization and independent review

The final authorization fixes close two bypasses found during review.
Authenticated approval decisions now require the verified account email to
match the designated approver. Change-request approval and rejection bind both
the request ID and the authorized document ID.

`backend/test/unit/approvals-drive-ports.test.ts` rejects a decision from a
different authenticated reader and accepts the normalized designated address.
`backend/test/unit/documents-changes-access.test.ts` rejects a change request
submitted through another document URL and verifies document-bound rejection.
The tests also preserve secret-token approval behavior and prevent repository
work after hidden-resource denial.

The final independent Security Review examined the current branch diff and
reported no concrete medium, high, or critical finding. It checked both
authorization fixes and the wider changed authentication, storage, SSRF,
credential, upload, conversion, and HTML-rendering paths. The final Bugbot
review reported no bugs.

## Publication contract

The repository declares `AGPL-3.0-only` in the root and workspace package
manifests. `LICENSE`, `README.md`, and the hosted-modification notice state the
same license. The license check enforces this agreement.

The publication documentation covers local setup, environment variables,
provider configuration, operations, backups, template licensing, security
reporting, and contribution rules. The documentation check validates links,
documented commands, migration order, and the current DOCX catalog.

Both environment examples describe the validated configuration fields without
shipping application secrets. The local setup applies the single Drizzle
baseline before seeds. The complete Compose stack applies migrations before the
API starts. Private databases created before the baseline use the manual
export-and-import guide in `docs/pre-baseline-database-migration.md`.

`ARCHITECTURE.md` records the frontend, API, worker, PostgreSQL, object-store,
mail, converter, AI, and RAG boundaries. The AI SDK registry resolves
Anthropic, Google, OpenAI, and compatible providers. Personal provider
credentials use encrypted database records. Backend feature ownership lives
under `backend/src/modules`, shared stream types live in `packages/protocol`,
and the browser uses feature modules behind one route and transport contract.

## Verification boundary

The fresh canonical `npm run ci` completed after this file was created. It
passed:

- 44 backend security tests;
- 2 document-format tests;
- 1,158 Vitest unit tests in 218 files;
- 16 no-retry mocked Chromium journeys with 22 axe checkpoints;
- 1,220 tests and browser journeys in total;
- publication, license, environment-example, legacy-auth, and Knip checks;
- the 73-table PGlite baseline and all seed dry runs;
- Prettier, ESLint, TypeScript, the production dependency audit with zero
  vulnerabilities, and all production builds.

The run used Node 26.7.0 instead of the declared Node 22.x runtime. npm reported
the obsolete local `devdir` setting, Node reported that no
`--localstorage-file` was provided, and Vite warned about chunks larger than
500 kB. These warnings did not fail the canonical command.

`docker compose -f compose.yaml config --quiet` passed without contacting a
daemon. `git diff --check` also passed.

The local evidence is deterministic, PGlite-backed, or mocked. This machine
does not provide the following production dependencies:

- a live PostgreSQL service for `npm run ci:postgres`;
- a Docker daemon for image builds and the container smoke test;
- Render Blueprint validation or a Render deployment;
- external Better Auth OAuth, SMTP or Resend, S3-compatible storage, AI, RAG,
  or remote conversion services;
- a live LibreOffice or Chromium conversion exercise against production input.

These checks are release-environment gates. The checked-in CI workflow defines
a PostgreSQL 16 integration job and a Docker-conditional container smoke job.
The deployment, provider, backup, and migration runbooks define the remaining
operator checks. Render Blueprint validation and deployment still require
Render access.

The unavailable checks do not block publication of the source because the
source tree, deterministic gates, configuration contracts, and operator
runbooks are reviewable without those credentials. They do block production
deployment certification. An operator must pass the applicable live checks for
the exact revision and environment before serving users.

## Verdict

At this checkpoint, the current working tree is ready for source publication.
This verdict applies only while the tree remains unchanged. Production
deployment certification remains open until the release environment passes
PostgreSQL, container, Render, and configured external-service checks.
