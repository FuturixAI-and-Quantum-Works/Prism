import { describe, expect, it } from 'vitest'
import { emptyComplianceResultState, projectComplianceResults } from './complianceResultsModel'

describe('compliance result projection', () => {
  it('replaces a repeated streamed result without duplicating it', () => {
    const first = projectComplianceResults(emptyComplianceResultState(), {
      type: 'sse',
      event: {
        type: 'rule_result',
        rule_id: 'rule-1',
        result: { summary: 'Initial finding' },
        status: 'non_compliant',
      },
    })
    const updated = projectComplianceResults(first, {
      type: 'sse',
      event: {
        type: 'rule_result',
        rule_id: 'rule-1',
        result: { summary: 'Resolved finding' },
        status: 'compliant',
      },
    })

    expect(updated.rules).toEqual([
      {
        id: 'rule-1',
        summary: 'Resolved finding',
        status: 'compliant',
      },
    ])
  })

  it('resets every projected result collection before a new run', () => {
    const populated = projectComplianceResults(emptyComplianceResultState(), {
      type: 'sse',
      event: {
        type: 'summary',
        compliance_score: 82,
        critical_issues: 1,
        pending_items: 2,
        resolved_issues: 3,
      },
    })

    expect(projectComplianceResults(populated, { type: 'reset' })).toEqual(
      emptyComplianceResultState(),
    )
  })

  it('clears stale rules when a completed persisted review has no rules', () => {
    const stale = projectComplianceResults(emptyComplianceResultState(), {
      type: 'sse',
      event: {
        type: 'rule_result',
        rule_id: 'stale-rule',
        result: { summary: 'Stale finding' },
        status: 'non_compliant',
      },
    })

    const hydrated = projectComplianceResults(stale, {
      type: 'hydrate',
      data: {
        review: {
          id: 'review-1',
          userId: 'user-1',
          projectId: null,
          workspaceId: null,
          primaryDocumentId: 'document-1',
          title: 'Review',
          status: 'completed',
          complianceScore: 100,
          results: null,
          aiInsights: null,
          ragCollectionName: null,
          createdAt: '2026-09-01T12:00:00.000Z',
          updatedAt: '2026-09-01T12:01:00.000Z',
        },
        supportingDocs: [],
        rules: [],
        questions: [],
      },
    })

    expect(hydrated.rules).toEqual([])
  })

  it('clears every stale result when the review is not completed', () => {
    const populated = projectComplianceResults(emptyComplianceResultState(), {
      type: 'sse',
      event: {
        type: 'summary',
        compliance_score: 75,
        critical_issues: 1,
        pending_items: 1,
        resolved_issues: 2,
      },
    })

    const hydrated = projectComplianceResults(populated, {
      type: 'hydrate',
      data: {
        review: {
          id: 'review-2',
          userId: 'user-1',
          projectId: null,
          workspaceId: null,
          primaryDocumentId: 'document-2',
          title: 'Pending review',
          status: 'pending',
          complianceScore: null,
          results: null,
          aiInsights: null,
          ragCollectionName: null,
          createdAt: '2026-09-01T12:00:00.000Z',
          updatedAt: '2026-09-01T12:01:00.000Z',
        },
        supportingDocs: [],
        rules: [],
        questions: [],
      },
    })

    expect(hydrated).toEqual(emptyComplianceResultState())
  })

  it('distinguishes an unavailable score from a real zero and preserves zero counts', () => {
    const unavailable = projectComplianceResults(emptyComplianceResultState(), {
      type: 'sse',
      event: {
        type: 'summary',
        compliance_score: null,
        critical_issues: 0,
        pending_items: 0,
        resolved_issues: 0,
      },
    })
    const zero = projectComplianceResults(emptyComplianceResultState(), {
      type: 'sse',
      event: {
        type: 'summary',
        compliance_score: 0,
        critical_issues: 0,
        pending_items: 0,
        resolved_issues: 0,
      },
    })

    expect(unavailable.summary).toEqual({
      complianceScore: null,
      criticalIssues: 0,
      pendingItems: 0,
      resolvedIssues: 0,
    })
    expect(zero.summary?.complianceScore).toBe(0)
  })
})
