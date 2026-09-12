import { describe, expect, it } from 'vitest'
import { resolveComplianceTarget } from './complianceModels'

describe('compliance route targets', () => {
  it.each([
    [{ reviewId: 'review-1' }, { kind: 'review', reviewId: 'review-1' }],
    [{ documentId: 'document-1' }, { kind: 'document', documentId: 'document-1' }],
    [{ workspaceId: 'workspace-1' }, { kind: 'workspace', workspaceId: 'workspace-1' }],
  ] as const)('keeps identifier namespaces distinct', (params, target) => {
    expect(resolveComplianceTarget(params)).toEqual(target)
  })

  it('rejects ambiguous route parameters', () => {
    expect(() =>
      resolveComplianceTarget({
        reviewId: 'review-1',
        workspaceId: 'workspace-1',
      }),
    ).toThrow('exactly one route identifier')
  })
})
