# Phase 1 security checkpoint

Captured on 2026-09-01 from branch `prism-publication-modernization`.

## Implemented protections

- Startup now rejects missing, weak, or reused values for `JWT_SECRET`, `USER_API_KEYS_ENCRYPTION_SECRET`, and `DOWNLOAD_SIGNING_SECRET`. Each secret must contain at least 32 bytes and eight distinct characters. The three secrets must be pairwise distinct.
- Session and signup JWTs now carry distinct purposes. Signup tokens expire after 10 minutes and cannot pass session verification.
- Download signatures and stored user API keys use their dedicated secrets. Neither implementation falls back to `JWT_SECRET`.
- The `/auth/test-user` route, `/dev-login` flow, test-login UI, and OTP response leakage were removed.
- The HTTP perimeter validates an explicit CORS origin allowlist, disables credential mode, rejects wildcard and malformed origins, bounds production proxy trust to zero or one hop, removes `X-Powered-By`, applies Helmet headers, and installs general and endpoint-specific rate limits.
- OTP, invitation, project and document sharing, public approval, upload, AI generation, file-version, provider-check, and email-test endpoints have dedicated rate-limit policies.
- Only `GET /health` remains unauthenticated among the service health and status routes. `/status` and `POST /health/email/test` now require authentication.
- Document reads, exports, previews, versions, edits, and context-document links now check access to the requested document. A context document must pass its own read check before the API links or returns it.
- Compliance reviews now reject combined project and workspace scopes. Every review and attached document must belong to the selected scope. Viewers retain read access, while only owner, admin, and editor roles can mutate reviews.
- Tabular reviews use one capability map for owners, admins, editors, viewers, and direct shares. Viewers and direct shares are read-only. Project assignment, sharing, deletion, generation, regeneration, cell edits, and chat access are checked independently.
- Approval tokens are stored and looked up as SHA-256 digests. Public approval and invitation responses use allowlisted DTOs and send `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- RAG is disabled when `RAG_API_URL` is absent. Disabled operations fail before a network request. Configured endpoints require HTTPS except for local development, and health output does not expose the configured URL.
- Audited production logs use fixed event names. They no longer include document content, filenames, paths, email addresses, provider responses, or raw errors.

## Verification

`backend/node_modules/.bin/tsx --test backend/test/security/*.test.ts` passed 32 tests in seven files. The suite covers secret validation, token purpose separation, removed temporary auth paths, CORS and proxy parsing, endpoint limits, public-route exposure, compliance scope policy, tabular capabilities, public DTOs, approval-token hashing, RAG fail-safe behavior, and static production-log redaction.

`npm run build --prefix frontend` completed a Vite 8.0.11 production build after transforming 622 modules. The emitted entry artifacts were:

- `dist/index.html` at 0.39 kB, or 0.27 kB gzip.
- `dist/assets/index-BdJrwCtm.css` at 1.34 kB, or 0.51 kB gzip.
- `dist/assets/index-CjyXKzne.js` at 2,378.34 kB, or 609.92 kB gzip.
- `dist/assets/prism-4FMGMmt5.gif` at 1,222.11 kB.

Vite reported that the JavaScript chunk exceeds 500 kB after minification. The build still exited successfully.

`npm run build --prefix backend` remains red only in these known dead files scheduled for deletion in Phase 2:

- `backend/src/lib/interviewStateMachine.ts`
- `backend/src/lib/legalSseStream.ts`
- `backend/src/lib/llm/deepseek.ts`
- `backend/src/lib/llm/kimi.ts`
- `backend/src/routes/rulebooks.ts`
- `backend/src/scripts/seedRulebooks.ts`

The compiler reported 16 errors. They concern removed schema fields, removed provider keys, a stale `StreamChatParams.maxTokens` field, and missing plural rulebook exports.

`node scripts/check-publication.mjs` reports 7 blocker groups. The weak-secret-default group is gone. Legacy branding, a personal address, private hosts, a committed token, Bun lockfiles, the stale schema, and duplicate Vite configuration remain for later phases.

## Unverified database-backed exploit checks

The PostgreSQL-backed HTTP exploit tests that must prove protected requests return `403` without reading data remain unverified. The environment blocker is exact: Docker socket absent, local PostgreSQL not running, and postgres/initdb/pg_ctl/podman unavailable.
