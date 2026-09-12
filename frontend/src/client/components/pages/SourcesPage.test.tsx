import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SourcesPage from './SourcesPage'

const mocks = vi.hoisted(() => ({
  backfill: vi.fn(),
  backfillUnwrap: vi.fn(),
  pollSourcesUntilSettled: vi.fn(),
  refetch: vi.fn(),
  retry: vi.fn(),
  retryAll: vi.fn(),
  retryAllUnwrap: vi.fn(),
  retryUnwrap: vi.fn(),
  useBackfillSourcesMutation: vi.fn(),
  useGetSourcesHealthQuery: vi.fn(),
  useGetSourcesQuery: vi.fn(),
  useRetryAllFailedSourcesMutation: vi.fn(),
  useRetrySourceMutation: vi.fn(),
}))

vi.mock('../Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))

vi.mock('../../store/api/sourcesApi', () => ({
  pollSourcesUntilSettled: mocks.pollSourcesUntilSettled,
  useBackfillSourcesMutation: mocks.useBackfillSourcesMutation,
  useGetSourcesHealthQuery: mocks.useGetSourcesHealthQuery,
  useGetSourcesQuery: mocks.useGetSourcesQuery,
  useRetryAllFailedSourcesMutation: mocks.useRetryAllFailedSourcesMutation,
  useRetrySourceMutation: mocks.useRetrySourceMutation,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.backfill.mockReturnValue({ unwrap: mocks.backfillUnwrap })
  mocks.retry.mockReturnValue({ unwrap: mocks.retryUnwrap })
  mocks.retryAll.mockReturnValue({ unwrap: mocks.retryAllUnwrap })
  mocks.backfillUnwrap.mockResolvedValue({ queued: 0, documents: 0, drive_files: 0 })
  mocks.retryUnwrap.mockResolvedValue({})
  mocks.retryAllUnwrap.mockResolvedValue({ total_failed: 0, retried: 0, errors: 0 })
  mocks.refetch.mockResolvedValue({ data: { sources: [] } })
  mocks.pollSourcesUntilSettled.mockResolvedValue({
    kind: 'settled',
    response: { sources: [] },
  })
  mocks.useGetSourcesQuery.mockReturnValue({
    data: { sources: [] },
    error: undefined,
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  })
  mocks.useGetSourcesHealthQuery.mockReturnValue({
    data: { ok: true, status: 'healthy' },
  })
  mocks.useBackfillSourcesMutation.mockReturnValue([mocks.backfill, {}])
  mocks.useRetrySourceMutation.mockReturnValue([mocks.retry, {}])
  mocks.useRetryAllFailedSourcesMutation.mockReturnValue([mocks.retryAll, {}])
})

describe('SourcesPage', () => {
  it('refreshes persisted source status on demand', async () => {
    const user = userEvent.setup()
    render(<SourcesPage />)

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(mocks.refetch).toHaveBeenCalledOnce()
    expect(await screen.findByRole('status')).toHaveTextContent('Sources are up to date.')
  })

  it('surfaces mutation errors', async () => {
    const user = userEvent.setup()
    mocks.backfillUnwrap.mockRejectedValue({
      data: { detail: 'Backfill service is unavailable.' },
    })
    render(<SourcesPage />)

    await user.click(screen.getByRole('button', { name: 'Backfill existing files' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Backfill service is unavailable.')
  })

  it('surfaces explicit refresh errors', async () => {
    const user = userEvent.setup()
    mocks.refetch.mockResolvedValue({
      error: { data: { detail: 'Could not reach the source index.' } },
    })
    render(<SourcesPage />)

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the source index.')
  })
})
