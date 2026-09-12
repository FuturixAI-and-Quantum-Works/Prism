import { baseApi } from './baseApi'

export type SourceScopeType = 'personal' | 'project' | 'workspace'
export type SourceType = 'document' | 'drive_file'
export type SourceIndexStatus = 'pending' | 'indexed' | 'failed' | 'skipped_unsupported'

export interface SourceIndexEntry {
  id: string
  collection_id: string | null
  collection_name: string | null
  collection_display_name: string | null
  scope_type: SourceScopeType
  scope_id: string
  source_type: SourceType
  source_id: string
  version_id: string
  project_id: string | null
  workspace_id: string | null
  filename: string
  mime_type: string
  storage_path: string
  status: SourceIndexStatus
  last_error: string | null
  last_error_code: string | null
  last_error_category: string | null
  last_error_details: Record<string, unknown> | null
  retryable: boolean
  retry_after_seconds: number | null
  indexed_at: string | null
  updated_at: string
  created_at: string
}

export interface SourcesResponse {
  sources: SourceIndexEntry[]
}

export interface SourcesHealthResponse {
  ok: boolean
  status?: string
  api_status?: string | null
  error?: string
  failed_sources?: number
  retryable_failures?: number
  skipped_sources?: number
}

export interface SourcesBackfillResponse {
  queued: number
  documents: number
  drive_files: number
}

export interface RetryAllFailedResponse {
  total_failed: number
  retried: number
  errors: number
}

export type SourcePollingEntry = Pick<SourceIndexEntry, 'id' | 'status' | 'updated_at'>

export type SourcePollingOutcome =
  | { kind: 'settled'; response: SourcesResponse }
  | { kind: 'exhausted'; lastResponse: SourcesResponse | null }
  | { kind: 'aborted' }

export interface PollSourcesOptions {
  initialSources: readonly SourcePollingEntry[]
  refresh: () => Promise<SourcesResponse>
  signal: AbortSignal
  delaySchedule?: readonly number[]
  wait?: (delayMs: number, signal: AbortSignal) => Promise<void>
}

const sourcePollingDelays = [400, 800, 1600, 3200, 5000] as const

function sourceSnapshot(sources: readonly SourcePollingEntry[]) {
  return JSON.stringify(
    [...sources]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(({ id, status, updated_at }) => ({ id, status, updated_at })),
  )
}

function waitForPollingDelay(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const timeout = globalThis.setTimeout(finish, delayMs)
    signal.addEventListener('abort', finish, { once: true })

    function finish() {
      globalThis.clearTimeout(timeout)
      signal.removeEventListener('abort', finish)
      resolve()
    }
  })
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error !== null && typeof error === 'object' && Reflect.get(error, 'name') === 'AbortError')
  )
}

export async function pollSourcesUntilSettled({
  initialSources,
  refresh,
  signal,
  delaySchedule = sourcePollingDelays,
  wait = waitForPollingDelay,
}: PollSourcesOptions): Promise<SourcePollingOutcome> {
  const initialSnapshot = sourceSnapshot(initialSources)
  let lastResponse: SourcesResponse | null = null

  for (const delayMs of delaySchedule) {
    if (signal.aborted) return { kind: 'aborted' }

    try {
      await wait(delayMs, signal)
      if (signal.aborted) return { kind: 'aborted' }
      lastResponse = await refresh()
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return { kind: 'aborted' }
      throw error
    }

    if (signal.aborted) return { kind: 'aborted' }

    const changed = sourceSnapshot(lastResponse.sources) !== initialSnapshot
    const terminal = lastResponse.sources.every((source) => source.status !== 'pending')
    if (changed && terminal) return { kind: 'settled', response: lastResponse }
  }

  return { kind: 'exhausted', lastResponse }
}

export const sourcesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSources: builder.query<SourcesResponse, void>({
      query: () => '/sources',
      providesTags: [{ type: 'Sources', id: 'LIST' }],
    }),
    getSourcesHealth: builder.query<SourcesHealthResponse, void>({
      query: () => '/sources/health',
      providesTags: [{ type: 'Sources', id: 'HEALTH' }],
    }),
    backfillSources: builder.mutation<SourcesBackfillResponse, void>({
      query: () => ({
        url: '/sources/backfill',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Sources', id: 'LIST' }],
    }),
    retrySource: builder.mutation<SourceIndexEntry, string>({
      query: (sourceId) => ({
        url: `/sources/${sourceId}/retry`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, sourceId) => [
        { type: 'Sources', id: 'LIST' },
        { type: 'Sources', id: sourceId },
      ],
    }),
    retryAllFailedSources: builder.mutation<RetryAllFailedResponse, void>({
      query: () => ({
        url: '/sources/retry-all-failed',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Sources', id: 'LIST' },
        { type: 'Sources', id: 'HEALTH' },
      ],
    }),
  }),
})

export const {
  useGetSourcesQuery,
  useGetSourcesHealthQuery,
  useBackfillSourcesMutation,
  useRetrySourceMutation,
  useRetryAllFailedSourcesMutation,
} = sourcesApi
