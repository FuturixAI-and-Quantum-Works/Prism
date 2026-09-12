import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ComplianceReviewResponse } from '../../store/api/complianceApi'
import { emptyComplianceResultState } from './complianceResultsModel'
import { useComplianceResults } from './useComplianceResults'

function reviewData(
  id: string,
  status: ComplianceReviewResponse['review']['status'],
): ComplianceReviewResponse {
  return {
    review: {
      id,
      userId: 'user-1',
      projectId: null,
      workspaceId: null,
      primaryDocumentId: 'document-1',
      title: id,
      status,
      complianceScore: status === 'completed' ? 50 : null,
      results:
        status === 'completed' ? { criticalIssues: 1, pendingItems: 0, resolvedIssues: 1 } : null,
      aiInsights: status === 'completed' ? ['Review the issue'] : null,
      ragCollectionName: null,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    },
    supportingDocs: [],
    rules: [],
    questions: [],
  }
}

describe('useComplianceResults', () => {
  it('clears completed results while a different review is unresolved', async () => {
    const initialProps: { data: ComplianceReviewResponse | undefined } = {
      data: reviewData('review-1', 'completed'),
    }
    const { result, rerender } = renderHook(
      ({ data }: { data: ComplianceReviewResponse | undefined }) => useComplianceResults(data),
      { initialProps },
    )
    await waitFor(() => expect(result.current.state.summary?.complianceScore).toBe(50))

    rerender({ data: undefined })

    await waitFor(() => expect(result.current.state).toEqual(emptyComplianceResultState()))
  })

  it('clears completed results when the same review starts another run', async () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: ComplianceReviewResponse }) => useComplianceResults(data),
      { initialProps: { data: reviewData('review-1', 'completed') } },
    )
    await waitFor(() => expect(result.current.state.summary?.complianceScore).toBe(50))

    rerender({ data: reviewData('review-1', 'running') })

    await waitFor(() => expect(result.current.state).toEqual(emptyComplianceResultState()))
  })
})
