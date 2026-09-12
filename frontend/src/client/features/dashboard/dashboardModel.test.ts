import { describe, expect, it } from 'vitest'
import type { AttentionItem } from '../../store/api/attentionApi'
import type { Document } from '../../store/types'
import {
  formatDashboardRelativeTime,
  getAttentionItemRoute,
  selectActionableAttentionItems,
  selectBrowseFiles,
  selectInformationalAttentionItems,
} from './dashboardModel'

function attention(overrides: Partial<AttentionItem>): AttentionItem {
  return {
    id: 'attention-1',
    user_id: 'user-1',
    source_type: 'access_request',
    source_id: 'request-1',
    secondary_source_id: null,
    severity: 'medium',
    title: 'Access requested',
    description: null,
    metadata: { workspaceId: 'workspace-1' },
    status: 'pending',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    resolved_at: null,
    ...overrides,
  }
}

describe('dashboard model', () => {
  it('routes review, document, and workspace identifiers to their own destinations', () => {
    const [workspaceItem] = selectActionableAttentionItems([attention({})])

    expect(workspaceItem.metadata).toEqual({ workspaceId: 'workspace-1' })
    expect(getAttentionItemRoute(workspaceItem)).toBe('/workspaces/workspace-1')
    const [documentItem, reviewItem] = selectInformationalAttentionItems([
      attention({
        source_type: 'document_risk',
        source_id: 'document-1',
      }),
      attention({
        source_type: 'compliance_issue',
        source_id: 'review-1',
      }),
    ])
    expect(getAttentionItemRoute(documentItem)).toBe('/documents/document-1')
    expect(getAttentionItemRoute(reviewItem)).toBe('/compliance/reviews/review-1')
  })

  it('excludes resolved requests from actionable items', () => {
    expect(selectActionableAttentionItems([attention({ status: 'resolved' })])).toEqual([])
  })

  it('maps document extensions into browse-file types', () => {
    const document = {
      id: 'document-1',
      filename: 'scan.webp',
      file_type: null,
      created_at: '2026-01-01T00:00:00.000Z',
    } as Document

    expect(selectBrowseFiles([document])[0].type).toBe('image')
  })

  it('formats relative activity time against an explicit clock', () => {
    expect(
      formatDashboardRelativeTime(
        new Date('2026-01-01T11:30:00.000Z'),
        new Date('2026-01-01T12:00:00.000Z'),
      ),
    ).toBe('30m ago')
  })
})
