import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComplianceRunOptions } from '../../store/api/complianceApi'
import { useComplianceRun } from './useComplianceRun'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  hasComplianceRun: false,
  streamComplianceRun: vi.fn(),
}))

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: () => [],
}))

vi.mock('../../store/api/complianceApi', () => ({
  cancelComplianceRun: vi.fn().mockResolvedValue(undefined),
  hasComplianceRun: () => mocks.hasComplianceRun,
  streamComplianceRun: mocks.streamComplianceRun,
}))

describe('useComplianceRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasComplianceRun = false
    mocks.streamComplianceRun.mockResolvedValue({ kind: 'completed' })
  })

  it('does not start a stream when parameter persistence fails', async () => {
    const syncForRun = vi.fn().mockRejectedValue({ data: { detail: 'Rule save failed' } })
    const { result } = renderHook(() =>
      useComplianceRun(
        { kind: 'document', documentId: 'document-1' },
        {
          id: 'review-1',
          status: 'pending',
          documentName: 'Agreement.pdf',
          workspaceName: undefined,
          refetch: vi.fn(),
        },
        { syncForRun },
        { applyRunEvent: vi.fn(), reset: vi.fn() },
      ),
    )

    await act(async () => result.current.run())

    expect(mocks.streamComplianceRun).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Rule save failed')
  })

  it('ignores late events from a run after the review identity changes', async () => {
    let firstRunOptions: ComplianceRunOptions | undefined
    mocks.streamComplianceRun.mockImplementation((options: ComplianceRunOptions) => {
      firstRunOptions = options
      return new Promise(() => undefined)
    })
    const applyRunEvent = vi.fn()
    const syncForRun = vi.fn().mockResolvedValue(undefined)
    const refetch = vi.fn().mockResolvedValue(undefined)
    const { result, rerender } = renderHook(
      ({ reviewId }) =>
        useComplianceRun(
          { kind: 'document', documentId: `document-${reviewId}` },
          {
            id: reviewId,
            status: 'pending',
            documentName: `${reviewId}.pdf`,
            workspaceName: undefined,
            refetch,
          },
          { syncForRun },
          { applyRunEvent, reset: vi.fn() },
        ),
      { initialProps: { reviewId: 'review-1' } },
    )

    act(() => {
      void result.current.run()
    })
    await waitFor(() => expect(firstRunOptions).toBeDefined())

    rerender({ reviewId: 'review-2' })
    act(() => {
      firstRunOptions?.onEvent({
        type: 'summary',
        compliance_score: 100,
        critical_issues: 0,
        pending_items: 0,
        resolved_issues: 1,
      })
    })

    expect(firstRunOptions?.signal?.aborted).toBe(true)
    expect(applyRunEvent).not.toHaveBeenCalled()
  })
})
