import { describe, expect, it } from 'vitest'
import type { Document } from '../../store/types'
import {
  documentFileTypeLabel,
  formatDocumentFileSize,
  selectDocumentCards,
  toDocumentCard,
} from './documentLibraryModel'

function document(
  id: string,
  filename: string,
  createdAt: string,
  lifecycleStatus: Document['lifecycle_status'] = 'DRAFT',
): Document {
  return {
    id,
    project_id: null,
    workspace_id: null,
    user_id: 'user-1',
    folder_id: null,
    filename,
    file_type: 'pdf',
    size_bytes: 2048,
    page_count: 1,
    status: 'ready',
    lifecycle_status: lifecycleStatus,
    current_version_id: null,
    created_at: createdAt,
    updated_at: createdAt,
  }
}

describe('document library model', () => {
  it('derives display metadata only from API values', () => {
    const card = toDocumentCard(document('1', 'Mutual NDA.pdf', '2026-01-01T00:00:00.000Z'))

    expect(documentFileTypeLabel('pdf', 'Mutual NDA.pdf')).toBe('PDF')
    expect(formatDocumentFileSize(2048)).toBe('2.0 KB')
    expect(card.details).toEqual(['Created 01 Jan 2026', 'PDF · 2.0 KB · 1 page'])
    expect(card).not.toHaveProperty('projectName')
    expect(card).not.toHaveProperty('members')
    expect(card).not.toHaveProperty('documentsCount')
  })

  it('filters by real status before sorting by name', () => {
    const result = selectDocumentCards(
      [
        document('2', 'Zeta NDA.pdf', '2026-02-01T00:00:00.000Z'),
        document('1', 'Alpha NDA.pdf', '2026-01-01T00:00:00.000Z'),
        document('3', 'Approved NDA.pdf', '2026-03-01T00:00:00.000Z', 'APPROVED'),
        document('4', 'Service Contract.pdf', '2026-04-01T00:00:00.000Z'),
      ],
      {
        isShared: false,
        searchQuery: '',
        sortBy: 'Name A-Z',
        statusFilter: 'active',
      },
    )

    expect(result.map((item) => item.title)).toEqual([
      'Alpha NDA.pdf',
      'Service Contract.pdf',
      'Zeta NDA.pdf',
    ])
  })

  it('separates owned and shared documents by the API owner ID', () => {
    const owned = document('owned', 'Owned.pdf', '2026-01-01T00:00:00.000Z')
    const shared = {
      ...document('shared', 'Shared.pdf', '2026-01-02T00:00:00.000Z'),
      user_id: 'user-2',
    }
    const filters = {
      viewerUserId: 'user-1',
      searchQuery: '',
      sortBy: 'Newest' as const,
      statusFilter: 'active' as const,
    }

    expect(
      selectDocumentCards([owned, shared], { ...filters, isShared: false }).map(({ id }) => id),
    ).toEqual(['owned'])
    expect(
      selectDocumentCards([owned, shared], { ...filters, isShared: true }).map(({ id }) => id),
    ).toEqual(['shared'])
  })
})
