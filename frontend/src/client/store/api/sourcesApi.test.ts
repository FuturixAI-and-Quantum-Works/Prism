import { describe, expect, it, vi } from 'vitest'
import {
  pollSourcesUntilSettled,
  type SourceIndexEntry,
  type SourceIndexStatus,
  type SourcesResponse,
} from './sourcesApi'

function source(id: string, status: SourceIndexStatus, updatedAt: string): SourceIndexEntry {
  return {
    id,
    collection_id: null,
    collection_name: null,
    collection_display_name: null,
    scope_type: 'personal',
    scope_id: 'user-1',
    source_type: 'document',
    source_id: `document-${id}`,
    version_id: `version-${id}`,
    project_id: null,
    workspace_id: null,
    filename: `${id}.pdf`,
    mime_type: 'application/pdf',
    storage_path: `${id}.pdf`,
    status,
    last_error: null,
    last_error_code: null,
    last_error_category: null,
    last_error_details: null,
    retryable: false,
    retry_after_seconds: null,
    indexed_at: status === 'indexed' ? updatedAt : null,
    updated_at: updatedAt,
    created_at: '2026-09-01T12:00:00.000Z',
  }
}

function response(...sources: SourceIndexEntry[]): SourcesResponse {
  return { sources }
}

describe('source status polling', () => {
  it('uses increasing backoff and continues through pending snapshots', async () => {
    const initial = source('source-1', 'pending', '2026-09-01T12:00:00.000Z')
    const refresh = vi
      .fn<() => Promise<SourcesResponse>>()
      .mockResolvedValueOnce(response(initial))
      .mockResolvedValueOnce(response(source('source-1', 'pending', '2026-09-01T12:00:01.000Z')))
      .mockResolvedValueOnce(response(source('source-1', 'indexed', '2026-09-01T12:00:02.000Z')))
    const waits: number[] = []

    const outcome = await pollSourcesUntilSettled({
      initialSources: [initial],
      refresh,
      signal: new AbortController().signal,
      wait: async (delayMs) => {
        waits.push(delayMs)
      },
    })

    expect(waits).toEqual([400, 800, 1600])
    expect(refresh).toHaveBeenCalledTimes(3)
    expect(outcome.kind).toBe('settled')
  })

  it('ignores ordering changes and settles on a changed terminal snapshot', async () => {
    const first = source('source-1', 'indexed', '2026-09-01T12:00:00.000Z')
    const second = source('source-2', 'failed', '2026-09-01T12:00:00.000Z')
    const changed = source('source-2', 'indexed', '2026-09-01T12:00:01.000Z')
    const refresh = vi
      .fn<() => Promise<SourcesResponse>>()
      .mockResolvedValueOnce(response(second, first))
      .mockResolvedValueOnce(response(changed, first))

    const outcome = await pollSourcesUntilSettled({
      initialSources: [first, second],
      refresh,
      signal: new AbortController().signal,
      delaySchedule: [1, 2],
      wait: async () => {},
    })

    expect(refresh).toHaveBeenCalledTimes(2)
    expect(outcome).toEqual({ kind: 'settled', response: response(changed, first) })
  })

  it('reports exhaustion when no changed terminal snapshot arrives', async () => {
    const initial = source('source-1', 'pending', '2026-09-01T12:00:00.000Z')
    const latest = response(source('source-1', 'pending', '2026-09-01T12:00:01.000Z'))
    const refresh = vi.fn<() => Promise<SourcesResponse>>().mockResolvedValue(latest)

    const outcome = await pollSourcesUntilSettled({
      initialSources: [initial],
      refresh,
      signal: new AbortController().signal,
      delaySchedule: [1, 2],
      wait: async () => {},
    })

    expect(refresh).toHaveBeenCalledTimes(2)
    expect(outcome).toEqual({ kind: 'exhausted', lastResponse: latest })
  })

  it('aborts without refreshing after cancellation', async () => {
    const controller = new AbortController()
    const refresh = vi.fn<() => Promise<SourcesResponse>>()

    const outcome = await pollSourcesUntilSettled({
      initialSources: [],
      refresh,
      signal: controller.signal,
      delaySchedule: [1],
      wait: async () => {
        controller.abort()
      },
    })

    expect(outcome).toEqual({ kind: 'aborted' })
    expect(refresh).not.toHaveBeenCalled()
  })
})
