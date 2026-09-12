import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComplianceReviewResponse } from '../../store/api/complianceApi'
import { useComplianceParameters } from './useComplianceParameters'

const mocks = vi.hoisted(() => ({
  addQuestion: vi.fn(),
  addRule: vi.fn(),
  removeQuestion: vi.fn(),
  removeRule: vi.fn(),
  updateQuestion: vi.fn(),
  updateRule: vi.fn(),
}))

vi.mock('../../store/api/complianceApi', () => ({
  useAddComplianceQuestionMutation: () => [mocks.addQuestion],
  useAddComplianceRuleMutation: () => [mocks.addRule],
  useRemoveComplianceQuestionMutation: () => [mocks.removeQuestion],
  useRemoveComplianceRuleMutation: () => [mocks.removeRule],
  useUpdateComplianceQuestionMutation: () => [mocks.updateQuestion],
  useUpdateComplianceRuleMutation: () => [mocks.updateRule],
}))

vi.mock('../../store/api/workflowsApi', () => ({
  useGetWorkflowsQuery: () => ({ data: [] }),
}))

function mutation<T>(result: T) {
  return { unwrap: vi.fn().mockResolvedValue(result) }
}

function reviewData(
  id: string,
  rules: ComplianceReviewResponse['rules'] = [],
  questions: ComplianceReviewResponse['questions'] = [],
  status: ComplianceReviewResponse['review']['status'] = 'pending',
): ComplianceReviewResponse {
  return {
    review: {
      id,
      userId: 'user-1',
      projectId: null,
      workspaceId: null,
      primaryDocumentId: 'document-1',
      title: 'Review',
      status,
      complianceScore: null,
      results: null,
      aiInsights: null,
      ragCollectionName: null,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    },
    supportingDocs: [],
    rules,
    questions,
  }
}

describe('useComplianceParameters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.addQuestion.mockReturnValue(mutation({ id: 'question-new' }))
    mocks.addRule.mockReturnValue(mutation({ id: 'rule-new' }))
    mocks.removeQuestion.mockReturnValue(mutation(undefined))
    mocks.removeRule.mockReturnValue(mutation(undefined))
    mocks.updateQuestion.mockReturnValue(mutation(undefined))
    mocks.updateRule.mockReturnValue(mutation(undefined))
  })

  it('clears rules and questions when the active review changes to empty data', async () => {
    const first = reviewData(
      'review-1',
      [
        {
          id: 'rule-1',
          reviewId: 'review-1',
          content: 'Rule',
          status: 'pending',
          result: null,
          sortOrder: 0,
          createdAt: '2026-09-01T12:00:00.000Z',
          updatedAt: '2026-09-01T12:00:00.000Z',
        },
      ],
      [
        {
          id: 'question-1',
          reviewId: 'review-1',
          content: 'Question?',
          status: 'pending',
          result: null,
          sortOrder: 0,
          createdAt: '2026-09-01T12:00:00.000Z',
          updatedAt: '2026-09-01T12:00:00.000Z',
        },
      ],
    )
    const second = reviewData('review-2')
    const { result, rerender } = renderHook(
      ({ reviewId, data }) => useComplianceParameters(reviewId, data, null),
      { initialProps: { reviewId: 'review-1', data: first } },
    )
    await waitFor(() => expect(result.current.reviewRules).toHaveLength(1))

    rerender({ reviewId: 'review-2', data: second })

    await waitFor(() => {
      expect(result.current.reviewRules).toEqual([])
      expect(result.current.questions).toEqual([])
    })
  })

  it('clears parameters when the same review changes status', async () => {
    const first = reviewData('review-1', [
      {
        id: 'rule-1',
        reviewId: 'review-1',
        content: 'Stale rule',
        status: 'pending',
        result: null,
        sortOrder: 0,
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-01T12:00:00.000Z',
      },
    ])
    const { result, rerender } = renderHook(
      ({ data }) => useComplianceParameters('review-1', data, null),
      { initialProps: { data: first } },
    )
    await waitFor(() => expect(result.current.reviewRules).toHaveLength(1))

    rerender({ data: reviewData('review-1', [], [], 'running') })

    await waitFor(() => expect(result.current.reviewRules).toEqual([]))
  })

  it('stops synchronization when an RTK mutation rejects', async () => {
    mocks.updateRule.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ data: { detail: 'Rule update rejected' } }),
    })
    const data = reviewData('review-1', [
      {
        id: '00000000-0000-4000-8000-000000000004',
        reviewId: 'review-1',
        content: 'Rule',
        status: 'pending',
        result: null,
        sortOrder: 0,
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-01T12:00:00.000Z',
      },
    ])
    const { result } = renderHook(() => useComplianceParameters('review-1', data, null))
    await waitFor(() => expect(result.current.reviewRules).toHaveLength(1))

    await act(async () => {
      await expect(result.current.syncForRun('review-1')).rejects.toEqual({
        data: { detail: 'Rule update rejected' },
      })
    })

    expect(mocks.addQuestion).not.toHaveBeenCalled()
    expect(mocks.updateQuestion).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Rule update rejected')
  })

  it('ignores an add completion from a review that is no longer active', async () => {
    let resolveRule!: (value: { id: string }) => void
    const pendingRule = new Promise<{ id: string }>((resolve) => {
      resolveRule = resolve
    })
    mocks.addRule.mockReturnValue({ unwrap: () => pendingRule })
    const first = reviewData('review-1')
    const second = reviewData('review-2')
    const { result, rerender } = renderHook(
      ({ reviewId, data }) => useComplianceParameters(reviewId, data, null),
      { initialProps: { reviewId: 'review-1', data: first } },
    )
    let pending!: Promise<void>

    act(() => {
      pending = result.current.dialogs.addEmptyRule()
    })
    rerender({ reviewId: 'review-2', data: second })
    resolveRule({ id: 'rule-from-review-1' })
    await act(async () => pending)

    expect(result.current.reviewRules).toEqual([])
  })
})
