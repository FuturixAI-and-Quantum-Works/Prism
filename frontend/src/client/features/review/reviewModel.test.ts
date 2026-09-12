import { describe, expect, it } from 'vitest'
import {
  applyTabularGenerateEvent,
  makePendingCells,
  normalizeColumns,
  toApiColumns,
  type ColumnConfig,
  type ReviewDocument,
  type TabularCell,
} from './reviewModel'

const columns: ColumnConfig[] = [
  {
    id: 'second',
    index: 1,
    name: 'Term',
    prompt: 'Extract term',
    format: 'text',
    width: 250,
  },
  {
    id: 'first',
    index: 0,
    name: 'Risk',
    prompt: 'Extract risk',
    format: 'yes_no',
    width: 320,
  },
]

const documents: ReviewDocument[] = [
  {
    id: 'document-1',
    name: 'contract.pdf',
    type: 'pdf',
    date: '1 Sep 2026',
  },
]

describe('review model', () => {
  it('normalizes missing column identity, format, and width', () => {
    expect(normalizeColumns([{ name: 'Risk' }])).toEqual([
      {
        id: 'col-0',
        index: 0,
        name: 'Risk',
        prompt: '',
        format: 'text',
        tags: undefined,
        width: 250,
      },
    ])
  })

  it('replaces malformed persisted column fields with defaults', () => {
    expect(
      normalizeColumns([
        {
          id: 12,
          name: ['Risk'],
          prompt: false,
          format: 'unsupported',
          tags: ['valid', 42],
          width: 'wide',
        },
      ]),
    ).toEqual([
      {
        id: 'col-0',
        index: 0,
        name: 'Column 1',
        prompt: '',
        format: 'text',
        tags: undefined,
        width: 250,
      },
    ])
  })

  it('sorts and reindexes columns at the API boundary', () => {
    expect(toApiColumns(columns)).toEqual([
      expect.objectContaining({ id: 'first', index: 0 }),
      expect.objectContaining({ id: 'second', index: 1 }),
    ])
  })

  it('creates one pending cell for every document and column', () => {
    expect(makePendingCells('review-1', documents, columns)).toEqual([
      expect.objectContaining({
        id: 'pending-review-1-document-1-1',
        documentId: 'document-1',
        columnIndex: 1,
        status: 'pending',
      }),
      expect.objectContaining({
        id: 'pending-review-1-document-1-0',
        documentId: 'document-1',
        columnIndex: 0,
        status: 'pending',
      }),
    ])
  })

  it('applies a matching cell update without changing unrelated cells', () => {
    const cells: TabularCell[] = [
      {
        id: 'cell-1',
        documentId: 'document-1',
        columnIndex: 0,
        content: null,
        status: 'generating',
      },
      {
        id: 'cell-2',
        documentId: 'document-1',
        columnIndex: 1,
        content: { summary: 'Existing' },
        status: 'done',
      },
    ]

    const result = applyTabularGenerateEvent(cells, {
      type: 'cell_update',
      document_id: 'document-1',
      column_index: 0,
      status: 'done',
      content: { summary: 'Updated', flag: 'yellow' },
    })

    expect(result[0]).toEqual({
      ...cells[0],
      status: 'done',
      content: { summary: 'Updated', flag: 'yellow', reasoning: undefined },
    })
    expect(result[1]).toBe(cells[1])
  })
})
