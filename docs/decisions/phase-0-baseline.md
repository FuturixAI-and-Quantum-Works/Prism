# Phase 0 publication baseline

Captured on 2026-09-01 from branch `prism-publication-modernization`.

## Repository

- The branch was clean before Phase 0 changes.
- Git tracks 668 files, including 94 backend TypeScript files, 128 frontend TypeScript or TSX files, and 57 DOCX files.
- Static import analysis found 74 of 94 backend TypeScript files and 96 of 129 frontend JavaScript or TypeScript modules reachable from their runtime entrypoints.
- `node_modules` was absent at the root, backend, and frontend.

## Available scripts

- Root has `dev`, `dev:backend`, `dev:frontend`, and a placeholder `test`.
- Backend has `dev`, `build`, `start`, Drizzle commands, and seed commands. It has no test or lint command.
- Frontend has `dev`, `build`, and `preview`. It has no test or lint command.
- `npm test` exited 1 because no tests are configured.
- `npm run build --prefix backend` exited 127 because `tsc` is not installed.
- `npm run build --prefix frontend` exited 127 because `vite` is not installed.

## Dependency advisories

`npm audit --omit=dev --json` used the committed lockfiles without installing dependencies.

- Root exited 1 with 2 critical production advisories.
- Backend exited 1 with 8 moderate and 12 high production advisories.
- Frontend exited 1 with 2 low, 1 moderate, and 6 high production advisories.

## Publication check

`node scripts/check-publication.mjs` exited 1 and reported all 8 expected blocker groups:

- legacy branding
- a personal email address
- private or temporary service hosts
- a committed JWT
- a weak secret default
- two Bun lockfiles
- the stale `backend/schema.sql`
- duplicate frontend Vite configuration

This failure is the Phase 0 baseline. Later phases must remove the underlying files and values until the same command exits 0.
