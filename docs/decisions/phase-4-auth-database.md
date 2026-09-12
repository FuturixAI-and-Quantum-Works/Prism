# Phase 4 authentication and database checkpoint

Captured on 2026-09-01 from branch `prism-publication-modernization`.

## Authentication

- The backend pins `better-auth` and `@better-auth/drizzle-adapter` at `1.7.2`. The frontend pins `better-auth` at `1.7.2`.
- The backend mounts Better Auth at `/auth`. Better Auth owns the PostgreSQL identity, session, verification, and rate-limit records.
- Browser authentication now uses Better Auth cookies. The frontend auth client, RTK Query base, and manual fetch calls include credentials. The frontend transport test rejects bearer headers, query tokens, browser storage tokens, and missing cookie credentials.
- Express exposes one required `AppAuthContext` at `res.locals.auth`. The context uses Better Auth's inferred session type and a database-loaded profile.
- The migration replaced 204 caller accesses to `res.locals.userId`, `res.locals.userEmail`, and `res.locals.userRole`. It then removed the three compatibility assignments. `npm run check:auth-locals` reports no remaining legacy auth-local references.

The 204 count is reproducible from the current diff:

```sh
git diff -U0 -- backend/src \
  | rg '^\-.*res\.locals\.(userId|userEmail|userRole)' \
  | rg -vc '^\-\s*res\.locals\.(userId|userEmail|userRole)\s*='
```

## Database ownership

- `backend/src/db/schema/index.ts` exports 17 schema modules. Sixteen modules define 67 PostgreSQL tables, while `enums.ts` owns shared enum types.
- Approval policy is database-driven. `approval_roles`, `approval_policies`, and `approval_policy_rules` supply enabled roles and the default policy for each subject type. The core seed validates and upserts five neutral roles and five semantic rules in one transaction.
- Three system workflows and eight supported AI models have idempotent database seed scripts. Stable keys drive conflict updates.
- Drizzle has one generated migration, `backend/drizzle/0000_prism_baseline.sql`, one snapshot, and one journal entry. The baseline contains schema only.

`npm run db:verify` checks the migration journal, regenerates SQL from the modular schema, compares normalized statements with the checked-in baseline, compares the Better Auth schema with the application tables, and applies the baseline to PGlite. The check reported 67 tables.

## Verification

`npm run ci` exited 0 on 2026-09-01. The complete gate passed publication checks, the legacy auth-local check, database verification, all seed dry-runs, formatting, lint, both strict typechecks, tests, the production dependency audit, and both builds.

The test results were:

- 45 security tests passed.
- Two production compatibility tests passed.
- 24 unit tests passed across nine Vitest files.
- 71 tests passed in total.

The seed dry-runs validated five approval roles, five approval rules, three system workflows, eight AI catalog models, seven core templates, three DOCX templates, and the explicit admin email input. `npm audit --omit=dev` reported zero vulnerabilities.

The run retained three non-blocking warnings. npm reported the obsolete local `devdir` setting. Node reported that no `--localstorage-file` was provided. Vite reported a 2,365.26 kB minified entry chunk.

## Live verification limit

Live browser verification did not run. This includes PostgreSQL-backed OTP sign-in, Google OAuth, cookie persistence, onboarding, sign-out, and real email delivery.

The local prerequisites were unavailable:

- `DATABASE_URL` was unset. The Docker daemon was unavailable. The `postgres`, `initdb`, `pg_ctl`, and `podman` executables were unavailable.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` were unset.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `FROM_EMAIL` were unset. `EMAIL_DEV_FALLBACK` was also unset.
- `BETTER_AUTH_SECRET`, `AUTH_OTP_SECRET`, `DOWNLOAD_TOKEN_SECRET`, and `PUBLIC_TOKEN_PEPPER` were unset. The HTTP service could not pass startup validation.

The automated cookie transport and middleware tests passed. PGlite also applied the complete baseline. These checks do not replace a browser run against live PostgreSQL, Google OAuth, and Resend services.
