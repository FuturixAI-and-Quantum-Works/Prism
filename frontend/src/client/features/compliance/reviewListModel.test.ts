import { describe, expect, it } from 'vitest'
import type { ComplianceReview } from '../../store/api/complianceApi'
import {
  filterAndSortComplianceDocuments,
  getRiskLabel,
  toComplianceListDocument,
  type ComplianceListDocument,
} from './reviewListModel'

function review(complianceScore: number | null): ComplianceReview {
  return {
    id: `review-${String(complianceScore)}`,
    userId: 'user-1',
    projectId: null,
    workspaceId: null,
    primaryDocumentId: 'document-1',
    title: 'Agreement',
    status: 'completed',
    complianceScore,
    results: {
      criticalIssues: 0,
      pendingItems: 0,
      resolvedIssues: 0,
    },
    aiInsights: [],
    ragCollectionName: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:01:00.000Z',
  }
}

function listDocument(id: string, complianceScore: number | null): ComplianceListDocument {
  return {
    id,
    primaryDocumentId: 'document-1',
    workspaceId: null,
    name: id,
    reviewType: 'Document Review',
    riskStatus: 'Low',
    riskCount: 0,
    complianceScore,
    reviewer: 'AI Assistant',
    updatedTime: '1 Sep 2026',
    updatedAt: new Date('2026-09-01T12:00:00.000Z'),
  }
}

describe('compliance list score model', () => {
  it('keeps unavailable and real zero scores distinct', () => {
    expect(toComplianceListDocument(review(null))).toMatchObject({
      complianceScore: null,
      riskStatus: null,
    })
    expect(toComplianceListDocument(review(0))).toMatchObject({
      complianceScore: 0,
      riskStatus: 'Low',
    })
    expect(getRiskLabel(null, 0)).toBe('Not assessed')
  })

  it.each(['score-high', 'score-low'] as const)(
    'sorts unavailable scores last for %s',
    (sortOption) => {
      const sorted = filterAndSortComplianceDocuments(
        [listDocument('unavailable', null), listDocument('zero', 0), listDocument('high', 80)],
        '',
        [],
        sortOption,
      )

      expect(sorted[sorted.length - 1]?.id).toBe('unavailable')
    },
  )
})
