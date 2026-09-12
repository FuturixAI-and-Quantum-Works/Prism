import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComplianceReviewResponse } from '../../store/api/complianceApi'
import { useComplianceReviewData } from './useComplianceReviewData'

const mocks = vi.hoisted(() => ({
  currentReviewData: undefined as ComplianceReviewResponse | undefined,
  staleReviewData: undefined as ComplianceReviewResponse | undefined,
}))

vi.mock('../documents/api/documentCoreApi', () => ({
  useGetDocumentQuery: () => ({ currentData: undefined, isLoading: false }),
  useGetDocumentsQuery: () => ({ currentData: [] }),
}))

vi.mock('../../store/api/drive/driveFileApi', () => ({
  useGetDriveFilesQuery: () => ({ currentData: { files: [] } }),
}))

vi.mock('../../store/api/drive/driveWorkspaceApi', () => ({
  useGetDriveWorkspaceQuery: () => ({ currentData: undefined }),
}))

vi.mock('../../store/api/complianceApi', () => ({
  useGetComplianceReviewQuery: () => ({
    currentData: mocks.currentReviewData,
    data: mocks.staleReviewData,
    refetch: vi.fn(),
  }),
  useGetComplianceReviewForDocumentQuery: () => ({
    currentData: undefined,
    data: undefined,
    refetch: vi.fn(),
  }),
  useGetComplianceReviewForWorkspaceQuery: () => ({
    currentData: undefined,
    data: undefined,
    refetch: vi.fn(),
  }),
}))

function reviewData(id: string): ComplianceReviewResponse {
  return {
    review: {
      id,
      userId: 'user-1',
      projectId: null,
      workspaceId: null,
      primaryDocumentId: `document-${id}`,
      title: id,
      status: 'completed',
      complianceScore: 100,
      results: {
        criticalIssues: 0,
        pendingItems: 0,
        resolvedIssues: 1,
      },
      aiInsights: [],
      ragCollectionName: null,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    },
    supportingDocs: [],
    rules: [],
    questions: [],
  }
}

describe('useComplianceReviewData', () => {
  beforeEach(() => {
    mocks.currentReviewData = undefined
    mocks.staleReviewData = reviewData('old')
  })

  it('does not expose cached data from the previous review while the current review loads', () => {
    const { result, rerender } = renderHook(() =>
      useComplianceReviewData({ kind: 'review', reviewId: 'new' }, undefined),
    )

    expect(result.current.complianceData).toBeUndefined()
    expect(result.current.reviewId).toBeNull()
    expect(result.current.documentId).toBeUndefined()

    mocks.currentReviewData = reviewData('new')
    rerender()

    expect(result.current.reviewId).toBe('new')
    expect(result.current.documentId).toBe('document-new')
  })
})
