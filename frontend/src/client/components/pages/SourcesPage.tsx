import { useEffect, useRef, useState } from 'react'
import Layout from '../Layout'
import { useResponsive } from '../../hooks'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  pollSourcesUntilSettled,
  useBackfillSourcesMutation,
  useGetSourcesHealthQuery,
  useGetSourcesQuery,
  useRetryAllFailedSourcesMutation,
  useRetrySourceMutation,
  type SourceIndexEntry,
  type SourceIndexStatus,
  type SourcesResponse,
} from '../../store/api/sourcesApi'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const statusLabels: Record<SourceIndexStatus, string> = {
  indexed: 'Indexed',
  pending: 'Pending',
  failed: 'Failed',
  skipped_unsupported: 'Skipped',
}

const statusColors: Record<SourceIndexStatus, { bg: string; fg: string }> = {
  indexed: { bg: '#ECFDF3', fg: '#027A48' },
  pending: { bg: '#FFF8E5', fg: '#9A6700' },
  failed: { bg: '#FEF3F2', fg: '#B42318' },
  skipped_unsupported: { bg: '#F2F4F7', fg: '#475467' },
}

type SourceMutationOperation =
  { kind: 'backfill' } | { kind: 'retry-all' } | { kind: 'retry'; sourceId: string }

type SourcesSyncState =
  | { kind: 'idle' }
  | { kind: 'polling'; operation: SourceMutationOperation }
  | { kind: 'refreshing' }
  | { kind: 'settled' }
  | { kind: 'exhausted' }
  | { kind: 'error'; message: string }

function syncStatusMessage(state: SourcesSyncState) {
  switch (state.kind) {
    case 'idle':
      return null
    case 'polling':
      return 'Waiting for persisted source status updates.'
    case 'refreshing':
      return 'Refreshing persisted source statuses.'
    case 'settled':
      return 'Sources are up to date.'
    case 'exhausted':
      return 'Source status polling ended before an updated terminal state was persisted. Refresh to check again.'
    case 'error':
      return state.message
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function countByStatus(sources: SourceIndexEntry[], status: SourceIndexStatus) {
  return sources.filter((source) => source.status === status).length
}

function retryText(source: SourceIndexEntry) {
  if (!source.retryable) return null
  if (source.retry_after_seconds)
    return `Retryable. Suggested retry after ${source.retry_after_seconds}s.`
  return 'Retryable transient provider error.'
}

export default function SourcesPage() {
  const { isMobile } = useResponsive()
  const { data, error: sourcesError, isLoading, isError, refetch } = useGetSourcesQuery()
  const { data: health } = useGetSourcesHealthQuery()
  const [backfillSources] = useBackfillSourcesMutation()
  const [retrySource] = useRetrySourceMutation()
  const [retryAllFailed] = useRetryAllFailedSourcesMutation()
  const [syncState, setSyncState] = useState<SourcesSyncState>({ kind: 'idle' })
  const syncControllerRef = useRef<AbortController | null>(null)
  const sources = data?.sources ?? []
  const failedCount = countByStatus(sources, 'failed')
  const isSyncing = syncState.kind === 'polling' || syncState.kind === 'refreshing'
  const syncMessage = syncStatusMessage(syncState)
  const healthStatus = health?.status ?? (health?.ok ? 'healthy' : 'unavailable')
  const healthLabel =
    healthStatus === 'degraded'
      ? 'Degraded'
      : healthStatus === 'healthy'
        ? 'Healthy'
        : 'Unavailable'
  const healthColor =
    healthStatus === 'degraded' ? '#B54708' : healthStatus === 'healthy' ? '#027A48' : '#B42318'

  useEffect(
    () => () => {
      syncControllerRef.current?.abort()
    },
    [],
  )

  const beginSync = () => {
    syncControllerRef.current?.abort()
    const controller = new AbortController()
    syncControllerRef.current = controller
    return controller
  }

  const setCurrentSyncState = (controller: AbortController, state: SourcesSyncState) => {
    if (syncControllerRef.current === controller && !controller.signal.aborted) setSyncState(state)
  }

  const refreshSources = async (): Promise<SourcesResponse> => {
    const result = await refetch()
    if (result.error) throw result.error
    if (!result.data) throw new Error('The sources response was empty.')
    return result.data
  }

  const runMutationAndPoll = async (
    operation: SourceMutationOperation,
    mutate: () => Promise<unknown>,
    fallbackError: string,
  ) => {
    const controller = beginSync()
    setSyncState({ kind: 'polling', operation })

    try {
      await mutate()
      const outcome = await pollSourcesUntilSettled({
        initialSources: sources,
        refresh: refreshSources,
        signal: controller.signal,
      })

      if (outcome.kind === 'aborted') return
      setCurrentSyncState(
        controller,
        outcome.kind === 'settled' ? { kind: 'settled' } : { kind: 'exhausted' },
      )
    } catch (error) {
      if (controller.signal.aborted) return
      setCurrentSyncState(controller, {
        kind: 'error',
        message: getRequestErrorMessage(error, fallbackError),
      })
    } finally {
      if (syncControllerRef.current === controller) syncControllerRef.current = null
    }
  }

  const handleRefresh = async () => {
    const controller = beginSync()
    setSyncState({ kind: 'refreshing' })

    try {
      await refreshSources()
      setCurrentSyncState(controller, { kind: 'settled' })
    } catch (error) {
      if (controller.signal.aborted) return
      setCurrentSyncState(controller, {
        kind: 'error',
        message: getRequestErrorMessage(error, 'Could not refresh sources.'),
      })
    } finally {
      if (syncControllerRef.current === controller) syncControllerRef.current = null
    }
  }

  return (
    <Layout activePage="sources">
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          padding: '32px',
          fontFamily,
          color: '#454545',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '30px',
                fontWeight: 590,
                margin: 0,
                color: '#272727',
                letterSpacing: '-0.8px',
              }}
            >
              Sources
            </h1>
            <p style={{ fontSize: '14px', color: '#797979', margin: '8px 0 0' }}>
              Indexed documents and workspace files available to chat retrieval.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {failedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  void runMutationAndPoll(
                    { kind: 'retry-all' },
                    () => retryAllFailed().unwrap(),
                    'Could not retry failed sources.',
                  )
                }}
                disabled={isSyncing}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  border: '1px solid #B42318',
                  borderRadius: '8px',
                  background: isSyncing ? '#FEF3F2' : '#FFFFFF',
                  color: isSyncing ? '#797979' : '#B42318',
                  fontSize: '14px',
                  fontWeight: 590,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                }}
              >
                {syncState.kind === 'polling' && syncState.operation.kind === 'retry-all'
                  ? 'Retrying...'
                  : `Retry All Failed (${failedCount})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void handleRefresh()
              }}
              disabled={isSyncing}
              style={{
                height: '40px',
                padding: '0 16px',
                border: '1px solid #D0D5DD',
                borderRadius: '8px',
                background: '#FFFFFF',
                color: isSyncing ? '#A0A0A0' : '#454545',
                fontSize: '14px',
                fontWeight: 590,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
              }}
            >
              {syncState.kind === 'refreshing' ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => {
                void runMutationAndPoll(
                  { kind: 'backfill' },
                  () => backfillSources().unwrap(),
                  'Could not backfill sources.',
                )
              }}
              disabled={isSyncing}
              style={{
                height: '40px',
                padding: '0 16px',
                border: '1px solid #272727',
                borderRadius: '8px',
                background: isSyncing ? '#F2F4F7' : '#272727',
                color: isSyncing ? '#797979' : '#FFFFFF',
                fontSize: '14px',
                fontWeight: 590,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
              }}
            >
              {syncState.kind === 'polling' && syncState.operation.kind === 'backfill'
                ? 'Backfilling...'
                : 'Backfill existing files'}
            </button>
          </div>
        </div>

        {syncMessage && (
          <div
            role={syncState.kind === 'error' ? 'alert' : 'status'}
            aria-live={syncState.kind === 'error' ? 'assertive' : 'polite'}
            style={{
              color:
                syncState.kind === 'error'
                  ? '#B42318'
                  : syncState.kind === 'exhausted'
                    ? '#B54708'
                    : '#667085',
              fontSize: '13px',
            }}
          >
            {syncMessage}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, minmax(130px, 1fr))',
            gap: '12px',
          }}
        >
          {(
            ['indexed', 'pending', 'failed', 'skipped_unsupported'] satisfies SourceIndexStatus[]
          ).map((status) => (
            <div
              key={status}
              style={{
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                padding: '14px',
                background: '#FFFFFF',
              }}
            >
              <div style={{ fontSize: '12px', color: '#797979' }}>{statusLabels[status]}</div>
              <div
                style={{ fontSize: '28px', fontWeight: 590, color: '#272727', marginTop: '4px' }}
              >
                {countByStatus(sources, status)}
              </div>
            </div>
          ))}
          <div
            style={{
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              padding: '14px',
              background: '#FFFFFF',
            }}
          >
            <div style={{ fontSize: '12px', color: '#797979' }}>RAG Health</div>
            <div
              style={{ fontSize: '14px', fontWeight: 590, color: healthColor, marginTop: '10px' }}
            >
              {healthLabel}
            </div>
            {health?.retryable_failures ? (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#667085' }}>
                {health.retryable_failures} retryable indexing issue
                {health.retryable_failures === 1 ? '' : 's'}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            border: '1px solid #EDEDED',
            borderRadius: '8px',
            background: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 110px 110px 130px 170px 110px',
              padding: '12px 16px',
              background: '#F7F7F7',
              color: '#797979',
              fontSize: '12px',
              fontWeight: 590,
            }}
          >
            <span>Source</span>
            <span>Scope</span>
            <span>Type</span>
            <span>Status</span>
            <span>Updated</span>
            <span />
          </div>
          {isLoading ? (
            <div style={{ padding: '28px', color: '#797979' }}>Loading source index...</div>
          ) : isError ? (
            <div role="alert" style={{ padding: '28px', color: '#B42318' }}>
              {getRequestErrorMessage(sourcesError, 'Could not load sources.')}
            </div>
          ) : sources.length === 0 ? (
            <div style={{ padding: '28px', color: '#797979' }}>
              No sources indexed yet. Run backfill or upload a supported document.
            </div>
          ) : (
            sources.map((source) => {
              const statusColor = statusColors[source.status]
              return (
                <div
                  key={source.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 110px 110px 130px 170px 110px',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderTop: '1px solid #F0F0F0',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: '#272727',
                        fontWeight: 590,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {source.filename}
                    </div>
                    {source.last_error && (
                      <div style={{ marginTop: '5px' }}>
                        <div
                          style={{
                            color: source.retryable ? '#B54708' : '#B42318',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={source.last_error}
                        >
                          {source.last_error}
                        </div>
                        {retryText(source) && (
                          <div style={{ color: '#667085', marginTop: '3px', fontSize: '12px' }}>
                            {retryText(source)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span style={{ textTransform: 'capitalize', color: '#667085' }}>
                    {source.scope_type}
                  </span>
                  <span style={{ color: '#667085' }}>
                    {source.source_type === 'drive_file' ? 'Drive file' : 'Document'}
                  </span>
                  <span
                    style={{
                      justifySelf: 'start',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      background: statusColor.bg,
                      color: statusColor.fg,
                      fontWeight: 590,
                    }}
                  >
                    {statusLabels[source.status]}
                  </span>
                  <span style={{ color: '#667085' }}>{formatDate(source.updated_at)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void runMutationAndPoll(
                        { kind: 'retry', sourceId: source.id },
                        () => retrySource(source.id).unwrap(),
                        `Could not retry ${source.filename}.`,
                      )
                    }}
                    disabled={source.status !== 'failed' || isSyncing}
                    style={{
                      height: '32px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '7px',
                      background: source.status === 'failed' && !isSyncing ? '#FFFFFF' : '#F7F7F7',
                      color: source.status === 'failed' && !isSyncing ? '#454545' : '#A0A0A0',
                      cursor: source.status === 'failed' && !isSyncing ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {syncState.kind === 'polling' &&
                    syncState.operation.kind === 'retry' &&
                    syncState.operation.sourceId === source.id
                      ? 'Retrying...'
                      : 'Retry'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Layout>
  )
}
