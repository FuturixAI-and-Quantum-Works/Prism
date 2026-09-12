# Phase 3 tooling checkpoint

Captured on 2026-09-01 from branch `prism-publication-modernization`.

## Toolchain

- The root `package.json` defines `backend` and `frontend` as npm workspaces.
- The repository has one lockfile at `package-lock.json`. The workspace package metadata is recorded in that lockfile.
- The root, backend, and frontend manifests require Node `22.x`. The root manifest records npm `11.19.0` as the package manager.
- Both TypeScript configurations enable `strict`. `npm run typecheck` runs `tsc --noEmit` in both workspaces.
- The root scripts run Prettier and ESLint across the repository. ESLint treats the configured TypeScript and React rules as errors.
- `.github/workflows/ci.yml` runs the publication check, formatting check, lint, typechecks, tests, production audit, and both builds on Node 22 for pull requests and pushes to `main`.

## Verification

`npm run ci` exited 0 on 2026-09-01. Its component checks produced these results:

- `node scripts/check-publication.mjs` printed `Publication check passed.`
- `prettier --check .` reported that all matched files use Prettier formatting.
- `eslint .` exited 0 with no warnings or errors.
- The backend and frontend strict typechecks passed.
- The security suite passed 38 tests.
- The production dependency compatibility suite passed two tests.
- Vitest passed one test in one test file.
- `npm audit --omit=dev` reported zero vulnerabilities.
- The backend TypeScript build and the frontend Vite production build passed.

Run the same gate with:

```sh
npm run ci
```

## Non-blocking warnings

- The local verification used Node 26.7.0, while the manifests and CI require Node 22.x.
- Node emitted an experimental `localStorage` warning during the compatibility tests because no `--localstorage-file` was provided.
- Vite emitted its chunk-size warning for a 2,400.89 kB minified JavaScript entry chunk, about 2.4 MB.
- DB-backed tests could not run locally. The Docker client is installed, but no Docker socket is available. Local `postgres`, `initdb`, `pg_ctl`, and `podman` executables are also unavailable.

## Formatting tradeoff

Applying Prettier to the existing repository created broad formatting churn. That makes this modernization diff harder to review line by line and weakens blame continuity for reformatted lines. The benefit is one deterministic format and a CI gate that prevents new drift. Future formatting-only changes should stay separate from behavior changes.
