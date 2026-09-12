# Phase 7 tool and streaming checkpoint

Captured on 2026-09-01 from branch `prism-publication-modernization`.

## Tool registry

`backend/src/modules/ai/tools/registry.ts` is the only AI tool registry. It contains 23 unique tool definitions. Each definition owns one Zod input schema, its allowed scopes, an authorizer, and an executor. `getAiToolSchemas` derives provider-facing JSON schemas from those same definitions.

`defineTool` parses input, runs authorization, checks cancellation, and only then calls the executor. Document tools resolve the document in the active chat scope before `assertDocumentActionAllowed` checks the requested action.

The registry owns the visible lifecycle for every invocation. It emits one `tool_call_start` and one terminal `tool_result` with `complete` or `error` status. Validation failures, authorization failures, executor failures, missing results, and cancellation all pass through that lifecycle. Executors do not emit `tool_call_start` or `tool_result`.

Execution is split across six domain modules:

- `documentExecutors.ts`
- `projectWorkspaceExecutors.ts`
- `searchExecutors.ts`
- `tabularExecutors.ts`
- `templateExecutors.ts`
- `workflowExecutors.ts`

`chatRuntime.ts` calls `toolRegistry.execute` directly. The former `runToolCalls` and `executeRegisteredTool` compatibility functions are absent. `backend/src/lib/chatTools.ts` is deleted, and backend source has no `chatTools` reference.

## Shared stream protocol

`packages/protocol/src/index.ts` owns one 45-variant `StreamEvent` union. The same registry derives validation, stream-family membership, and terminal classification. The backend and frontend import their stream types and guards from `@prism/protocol`.

`backend/src/lib/sseHelpers.ts` contains the only backend `data:` JSON encoder. Its writer accepts one terminal event. A `done` event marks success, an `error` event marks failure, and later events are ignored. `runSSEStream` does not append `done` after an error.

`frontend/src/client/lib/sseTransport.ts` contains the only frontend event-stream parser. It handles LF and CRLF line endings, comments, `data:` fields with or without a space, multiline data, arbitrary byte boundaries, and a final buffered event. It rejects invalid JSON, unknown events, unexpected event families, missing response bodies, and streams that end without `done` or `error`.

The transport returns distinct outcomes for success, HTTP failure, unauthorized responses, protocol failure, server failure, and cancellation. It calls `onComplete` only after `done`. A terminal `error` calls `onError` and cannot also complete successfully.

Six clients use `streamSSE`:

- personal chat in `chatApi.ts`;
- project chat in `projectsApi.ts`;
- workspace chat in `driveApi.ts`;
- compliance runs in `complianceApi.ts`;
- tabular generation in `tabularReviewApi.ts`;
- tabular chat in `tabularReviewApi.ts`.

Each client accepts an `AbortSignal` and exposes an `AbortController` through its API wrapper. On the backend, `createSSESession` aborts on an aborted request or closed response. The signal reaches chat orchestration, tool execution, AI SDK calls, compliance generation, and tabular generation.

## Current file sizes

The counts below come from `wc -l -c` at this checkpoint:

- `backend/src/lib/chatOrchestrator.ts` has 1,042 lines and 33,668 bytes.
- `backend/src/modules/ai/tools/chatRuntime.ts` has 2,039 lines and 61,210 bytes.
- `backend/src/modules/ai/tools/registry.ts` has 478 lines and 15,438 bytes.
- `backend/src/modules/ai/tools/types.ts` has 73 lines and 2,049 bytes.
- `backend/src/modules/ai/tools/documentExecutors.ts` has 1,177 lines and 38,854 bytes.
- `backend/src/modules/ai/tools/searchExecutors.ts` has 37 lines and 1,150 bytes.
- `backend/src/modules/ai/tools/templateExecutors.ts` has 216 lines and 6,979 bytes.
- `backend/src/modules/ai/tools/workflowExecutors.ts` has 32 lines and 982 bytes.
- `backend/src/modules/ai/tools/projectWorkspaceExecutors.ts` has 87 lines and 2,359 bytes.
- `backend/src/modules/ai/tools/tabularExecutors.ts` has 37 lines and 1,807 bytes.
- `packages/protocol/src/index.ts` has 603 lines and 20,682 bytes.
- `backend/src/lib/sseHelpers.ts` has 80 lines and 2,215 bytes.
- `frontend/src/client/lib/sseTransport.ts` has 189 lines and 5,338 bytes.

The tool and stream ownership is centralized, but the two runtime coordinators remain large. This checkpoint records their present size without claiming that Phase 7 completed the planned coordinator split.

## Verification

The Phase 7 `npm run ci` run completed on 2026-09-01. Publication policy, the legacy auth-local check, database verification, every seed dry-run, formatting, lint, all three workspace typechecks, tests, the production dependency audit, and all three builds passed.

The test results were:

- 45 security tests passed.
- Two production compatibility tests passed.
- 262 unit tests passed across 28 Vitest files.
- 309 tests passed in total.

`npm run db:verify` regenerated the modular schema, compared it with `backend/drizzle/0000_prism_baseline.sql`, checked the Better Auth schema, and applied the baseline to PGlite. The run reported 66 tables.

Seed validation checked five approval roles, five approval rules, three system workflows, eight AI models, seven core templates, three DOCX templates, and explicit admin input. `npm audit --omit=dev` reported zero vulnerabilities. `npm run check:publication` passed. The protocol, backend, and frontend production builds passed.

Focused checks also passed. The unit suite rerun reported 262 tests across 28 files. Duplicate searches found one backend SSE encoder, one frontend parser, six production `streamSSE` calls, no executor-owned tool lifecycle events, no compatibility dispatcher, and no backend `chatTools` reference.

## Environment limits

The verification run used Node 26.7.0 although the repository requires Node 22.x. npm reported the obsolete local `devdir` setting. Vitest reported that Node had no `--localstorage-file`. Vite reported a 2,389.72 kB minified entry chunk.

The checks use PGlite and mocked AI providers. They do not prove cancellation, streaming, authorization, or tool effects against a live PostgreSQL server or live provider endpoint.
