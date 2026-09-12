# Phase 6 AI registry checkpoint

Captured on 2026-09-01 from branch `prism-publication-modernization`.

## Provider registry

The backend uses AI SDK 7.0.89 and its provider packages for Anthropic 4.0.47, Google 4.0.61, OpenAI 4.0.55, and OpenAI-compatible providers 3.0.42. `Provider` admits only `anthropic`, `google`, `openai`, and `openai-compatible`. `providerRegistry.ts` constructs each `LanguageModel` through the matching package.

The registry resolves models from database records instead of model-name prefixes. A model binds to an explicit connection when supplied. Otherwise, the registry prefers a matching personal connection over a server connection. It rejects unknown models and connections whose provider or stored connection binding does not match the model.

## Custom endpoints and credentials

OpenAI-compatible connections require a credential, an endpoint, and at least one model. The endpoint validator requires HTTPS. Development can opt into HTTP only for loopback hosts. The validator rejects embedded credentials, query strings, fragments, metadata hostnames, unresolved hosts, non-global addresses, and local HTTP addresses that resolve outside loopback.

The request transport resolves the hostname again for each request and redirect. It pins the connection to the first validated address through an Undici dispatcher. Redirects stay on the configured origin, every hop receives the same address checks, and the transport allows at most four redirects by default.

Personal credentials use AES-256-GCM envelopes with a format version, key id, 12-byte IV, and authentication tag. Additional authenticated data binds the ciphertext to the format version, user id, and provider. Reads reject unknown versions or key ids. A read under an inactive key re-encrypts the credential with the active key. API responses expose only `hasCredential: true`; they do not return credential material.

## Models, capabilities, and preferences

The managed catalog contains eight models. Each record has a stable application id, provider model id, display name, enabled state, supported tasks, and explicit capabilities for text, image, and PDF input plus text, structured, and tool-call output. Optional token limits use the same capability value.

Catalog seeding disables stale managed records, then upserts current records by stable id. It does not disable user-owned models. Custom connection edits match models by supplied stable id or, for an id-less input, by provider model id. Removed custom models become disabled instead of being deleted. Edits preserve model ids, preferences, and unchanged ciphertext.

Preferences store a connection and model pair for `main`, `title`, or `tabular`. Writes accept only enabled, available models that declare the requested task. Runtime resolution honors the saved connection only when it belongs to the selected model. Capability checks reject unsupported tasks, tools, images, and PDFs before calling a provider.

## Prompt ownership and APIs

`backend/src/lib/prompts/luna.ts` owns Luna's name, identity, and prompt composition. Document chat and tabular review import that shared prompt. Provider adapters do not own product identity.

Authenticated user APIs expose:

- `GET`, `POST`, `PUT`, and `DELETE /user/ai/connections`;
- `POST /user/ai/connections/:connectionId/test`;
- `GET /user/ai/models`;
- `GET /user/ai/preferences`;
- `PUT /user/ai/preferences/:task`.

Connection inputs validate provider-specific fields and custom model definitions. The test route performs a bounded generation request and returns a fixed failure message without provider payloads.

## Frontend settings

The AI settings page loads connections, models, and preferences in parallel through cookie-authenticated requests. It treats all response data as untrusted and parses the complete connection, model, capability, task, and preference shapes before rendering.

Administrators own server connections, which the page shows as read-only. A user can create, edit, test, disable, re-enable, and delete personal connections. Deletion requires inline confirmation. Credential inputs use password fields, never render returned secret-like fields, clear after both successful and failed saves, and remain optional when an edit keeps the stored credential.

Custom provider forms collect the endpoint, model ids, display names, capabilities, and tasks. The browser rejects non-HTTPS endpoints except loopback HTTP during development. The server remains authoritative and applies DNS and network checks. Preference selectors include only models for the requested task on enabled connections. Compliance review and tabular analysis intentionally share the `tabular` preference and remain synchronized.

## Removed legacy paths

The native `claude.ts`, `deepseek.ts`, `gemini.ts`, `kimi.ts`, and `openai.ts` adapters are absent. The former `userApiKeys.ts` helper and `user_api_keys` table are also absent. The current schema uses `ai_provider_connections`, `ai_provider_models`, and `user_ai_preferences`.

## Verification

The Phase 6 `npm run ci` run completed on 2026-09-01. It passed the publication policy, legacy auth-local check, database verification, all seed dry-runs, formatting, lint, both strict typechecks, tests, the production dependency audit, and both builds.

The test results were:

- 45 security tests passed.
- Two production compatibility tests passed.
- 229 unit tests passed across 23 Vitest files.
- 276 tests passed in total.

`npm run db:verify` regenerated the modular schema, compared it with `backend/drizzle/0000_prism_baseline.sql`, checked the Better Auth schema, and applied the baseline to PGlite. The run reported 66 tables. Seed validation checked five approval roles, five approval rules, three system workflows, eight AI models, seven core templates, three DOCX templates, and explicit admin input. `npm audit --omit=dev` reported zero vulnerabilities. `npm run check:publication` passed. Both production builds passed.

## Environment limits

The verification run used Node 26.7.0 although the repository requires Node 22.x. npm reported the obsolete local `devdir` setting. Vitest reported that Node had no `--localstorage-file`. Vite reported a 2,385.14 kB minified entry chunk.

Live PostgreSQL and provider checks did not run. `DATABASE_URL`, the Anthropic and Claude keys, the OpenAI key, and the Google and Gemini keys were unset. The Docker client was installed, but its daemon was unavailable. Podman and local PostgreSQL executables were unavailable.

PGlite and mocked-provider tests cover schema application, model reconciliation, preference preservation, credential binding and rotation, custom endpoint policy, DNS rebinding, redirect checks, API response filtering, and settings behavior. They do not prove behavior against a live PostgreSQL server or live Anthropic, Google, OpenAI, or custom OpenAI-compatible endpoints.
