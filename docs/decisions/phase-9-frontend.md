# Phase 9 frontend checkpoint

Captured on 2026-09-02 from the Phase 9 completion snapshot. This record covers
frontend architecture and verification only.

## Canonical navigation and authentication

`frontend/src/client/routeManifest.ts` is the route source of truth. It declares
28 routes and lazy-loads feature-owned route modules behind shared suspense and
error boundaries.

- Public: `/login`, `/approval/:token`, `/share/accept/:token`, and the `*`
  not-found route.
- Onboarding: `/onboarding`.
- Protected: `/status`, `/`, `/assistant`, `/assistant/history`, `/workspaces`,
  `/workspaces/:workspaceId`, `/library`, `/templates`,
  `/template-preview/:id`, `/shared`, `/shared-documents`, `/review`,
  `/review/:reviewId`, `/sources`, `/rulebook`, `/settings`, `/documents`,
  `/documents/new`, `/documents/:documentId`, `/compliance`,
  `/compliance/workspaces/:workspaceId`, `/compliance/documents/:documentId`,
  and `/compliance/reviews/:reviewId`.

The route graph rejects legacy singular project/document aliases, checks
frontend and backend-generated links against the manifest, and rejects orphaned
project entrypoints.

`frontend/src/client/hooks/useAuth.ts` derives its state from Better Auth's
cookie-backed `useSession` result and the authenticated profile query. The
application distinguishes loading, signed-out, onboarding-required,
authenticated, and error states. Public token routes remain reachable without a
session, protected routes redirect to `/login`, incomplete profiles are sent to
`/onboarding`, and completed profiles cannot return to onboarding. A shared
session-loss event clears API, chat, process, and durable-run client state before
returning the user to login.

## Network and stream contract

Browser HTTP access is centralized through
`frontend/src/client/lib/apiTransport.ts` and RTK Query's credentialed base
query. The transport scan rejects bare `fetch`, aliased fetch,
`XMLHttpRequest`, and `EventSource` use outside the approved transport module.
Both paths send cookies and publish the same session-loss event on `401`.

All streamed features use `frontend/src/client/lib/sseTransport.ts`. It parses
events with `@prism/protocol`, accepts multiline SSE data, preserves numeric
event cursors, requires a protocol terminal event, and returns distinct HTTP,
unauthorized, aborted, server, and protocol outcomes. Chat, drive, project,
tabular-review, and compliance callers share this contract rather than
maintaining feature-local parsers.

Compliance runs and tabular generation/regeneration use the durable wrapper.
Starts carry a generated `Idempotency-Key`; run identifiers and event cursors
are persisted under `prism_durable_run:*`; interrupted streams reconnect with
`run_id` and `after`; successful completion clears the cursor. Local aborts use
`AbortSignal`, while user cancellation sends `DELETE` for the persisted run and
clears local state only after the server accepts it. Browser journeys exercise
reconnect and cancel for both compliance and tabular runs.

## Modular frontend and editor

Route modules are lazy and features own their screens, models, hooks, and API
registrations. Thin compatibility facades were removed; retained page shells
resolve route parameters or route-specific composition.

The measured maximum production TypeScript file under
`frontend/src/client` is `hooks/useChat.ts` at 723 lines. Every other production
file is at most 673 lines (`features/documentEditor/ContextFilesPanel.tsx`).
Feature-boundary tests enforce 700-line limits in the assistant, compliance,
review, rulebook, document, and drive slices. The current tree therefore does
not support an unconditional claim that every production frontend file is
below 700 lines.

`features/documentEditor/DocumentEditorWorkspace.tsx` is a 436-line composition
shell. Layout, canvas, Tiptap integration, document persistence, comments,
versions, sharing, approvals, context files, chat, export, risk fixes, and
placeholder workflows live in focused modules. Boundary tests prevent the
editor feature from importing route entry modules.

## HTML and accessibility

`frontend/src/client/lib/sanitizeHtml.ts` is the shared DOMPurify boundary for
editor content, document loads, template selection, template rendering, and
template preview. Its allowlist preserves supported document formatting while
removing executable tags, interactive controls, event handlers, unsafe URLs,
and arbitrary data attributes. The template iframe receives sanitized content,
and the Tiptap editor initializes from sanitized HTML.

Shared accessibility behavior includes:

- `AccessibleDialog` and `useDialogFocus` for labelled modal semantics, initial
  focus, focus containment, Escape handling, and focus restoration.
- `Tabs`, `TabList`, `Tab`, and `TabPanel` for linked tab semantics and
  Arrow/Home/End keyboard navigation.
- `Button` and `IconButton` for safe default button types and required
  accessible icon names.
- `useMenuFocus` for roving menu focus, Arrow/Home/End navigation, Escape, and
  trigger focus restoration.

The mocked Chromium suite has 16 journeys with `retries: 0` and 22 axe
checkpoints. Axe fails moderate, serious, and critical WCAG 2/2.1 A/AA findings
except documented node-specific contrast exceptions, and it also fails stale
exceptions. Every journey rejects unexpected page errors, console errors,
network failures, and unhandled mocked requests.

Representative artifacts are:

- `test-results/screenshots/dashboard.png`
- `test-results/screenshots/document-editor.png`
- `test-results/screenshots/review.png`
- `test-results/durable-runs-tabular-revie-d9b2d-ancels-a-resumed-generation-chromium/video*.webm`

The screenshots are checked for expected dimensions, minimum size, and
nonblank color content. The global policy retains video only for failed
journeys. The durable-run journey overrides that policy with `video: "on"` so a
successful run also retains its video. The generated filename may vary between
runs.

## Bundle and verification

The earliest successful frontend baseline in
`docs/decisions/phase-1-security.md` emitted one 2,378.34 kB JavaScript entry
chunk, 609.92 kB gzip. The Phase 9 build emits a 364.91 kB entry chunk,
117.75 kB gzip: 84.7% smaller raw and 80.7% smaller gzip. Feature and editor
chunks are lazy output, so this comparison is the Vite entry artifact rather
than a claim about every route's total downloaded graph.

The final Phase 9 `npm run ci` passed:

- 928 root Vitest unit tests, including 418 frontend tests.
- 42 backend security tests and 2 document-format tests.
- 16 no-retry Chromium journeys.
- 988 tests and journeys in total.
- Publication and legacy-auth-local checks.
- The 73-table database baseline and every seed dry run.
- Prettier, ESLint, and TypeScript checks.
- Protocol, backend, and frontend production builds.
- `npm audit --omit=dev` with 0 vulnerabilities.

The browser result is intentionally labeled mocked. `MockBackend` intercepts
the browser's API requests and serves deterministic in-memory fixtures, so the
journeys verify frontend behavior, accessibility, request shape, SSE
reconnection, and cancellation. They do not verify a live Express process,
PostgreSQL persistence, object storage, mail delivery, document converters,
OAuth, or external AI/RAG providers.
