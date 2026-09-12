import { describe, expect, it, vi } from 'vitest'
import type { DocumentSessionContext } from '../documents/api/documentGovernanceApi'
import { deriveDocumentPermissions } from './documentPermissions'
import { parseMessageContent } from './messageParsing'
import { compareVersionHtml } from './versionComparison'
import { getRejectionFixPrompt, mapDocumentComments } from './commentsModel'
import { parseToolResult, updateToolCalls } from './chatToolEvents'
import { collectRiskFixResult, resolveRiskEdits } from './riskFixModel'
import {
  isPlaceholderFillPrompt,
  placeholderValues,
  templatePlaceholderFields,
  updatePlaceholderValue,
} from './placeholderModel'

function session(overrides: Partial<DocumentSessionContext> = {}): DocumentSessionContext {
  return {
    document_id: 'document-1',
    document_state: 'DRAFT',
    document_role: 'DRAFTER',
    role_badge: 'DRAFTER',
    product_role: 'editor',
    access_source: 'document',
    is_owner: false,
    is_workspace_admin: false,
    is_owner_admin: false,
    allowed_actions: [],
    visible_tabs: ['prism', 'comments'],
    ...overrides,
  }
}

describe('document editor models', () => {
  it('derives role actions while respecting locked lifecycle states', () => {
    const draft = deriveDocumentPermissions({
      documentId: 'document-1',
      documentStatus: 'DRAFT',
      session: session({
        allowed_actions: ['edit_document', 'add_comment', 'fill_placeholders', 'send_approval'],
      }),
      sessionLoading: false,
    })
    expect(draft).toMatchObject({
      canEdit: true,
      canComment: true,
      canFillPlaceholders: true,
      canSendForApproval: true,
      visibleTabs: ['prism', 'comments'],
    })

    const pendingApproval = deriveDocumentPermissions({
      documentId: 'document-1',
      documentStatus: 'DRAFT',
      session: session({
        document_state: 'PENDING_APPROVAL',
        is_owner_admin: true,
        allowed_actions: ['edit_document', 'fill_placeholders'],
      }),
      sessionLoading: false,
    })
    expect(pendingApproval).toMatchObject({
      canEdit: false,
      canFillPlaceholders: false,
      canOwnerReviewApproval: true,
      isLockedForEditing: true,
    })
  })

  it('parses stream citations and bottleneck tool payloads', () => {
    const parsed = parseMessageContent(
      [
        'Review complete.',
        '<CITATIONS>[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}]</CITATIONS>',
        '```json',
        '{"bottlenecks":[{"bottleneck":"Termination","reason":"One-sided","heading":"Exit"}]}',
        '```',
      ].join('\n'),
    )

    expect(parsed.cleanContent).toBe('Review complete.')
    expect(parsed.citations).toEqual([{ ref: 1, doc_id: 'doc-1', page: 2, quote: 'Clause' }])
    expect(parsed.citationState).toBe('valid')
    expect(parsed.bottlenecks).toEqual([
      { bottleneck: 'Termination', reason: 'One-sided', heading: 'Exit' },
    ])
  })

  it.each([
    [
      'malformed JSON',
      'Answer<CITATIONS>[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}</CITATIONS>',
      'invalid',
    ],
    [
      'schema-invalid citation',
      'Answer<CITATIONS>[{"ref":"first","doc_id":"doc-1","page":2,"quote":"Clause"}]</CITATIONS>',
      'invalid',
    ],
    [
      'invalid page',
      'Answer<CITATIONS>[{"ref":1,"doc_id":"doc-1","page":0,"quote":"Clause"}]</CITATIONS>',
      'invalid',
    ],
    [
      'unclosed block',
      'Answer<CITATIONS>[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}]',
      'incomplete',
    ],
  ])('keeps %s visible', (_name, content, citationState) => {
    expect(parseMessageContent(content)).toMatchObject({
      cleanContent: content,
      citations: [],
      citationState,
    })
  })

  it('parses an ascending page range without removing trailing prose', () => {
    expect(
      parseMessageContent(
        'Before<CITATIONS>[{"ref":1,"doc_id":"doc-1","page":" 4 - 7 ","quote":"Clause"}]</CITATIONS>After',
      ),
    ).toMatchObject({
      cleanContent: 'BeforeAfter',
      citations: [{ ref: 1, doc_id: 'doc-1', page: '4-7', quote: 'Clause' }],
      citationState: 'valid',
    })
  })

  it('does not consume bottleneck-shaped data inside an invalid citation block', () => {
    const content =
      'Answer<CITATIONS>{"bottlenecks":[{"bottleneck":"Hidden","reason":"","heading":""}]}</CITATIONS>'

    expect(parseMessageContent(content)).toEqual({
      cleanContent: content,
      citations: [],
      citationState: 'invalid',
      bottlenecks: [],
    })
  })

  it('drops malformed citations and tool result entries', () => {
    expect(
      parseMessageContent(
        '<CITATIONS>[{"ref":"first","doc_id":"doc-1","page":2,"quote":"Clause"}]</CITATIONS>',
      ).citations,
    ).toEqual([])

    expect(
      parseToolResult('compare_documents', {
        ok: true,
        doc_a: { doc_id: 'a', filename: 'A.docx' },
        doc_b: { doc_id: 'b', filename: 'B.docx' },
        summary: {},
        differences: [{ type: 'added', lineNumber: 'first', text: 'Clause' }],
      }),
    ).toMatchObject({ kind: 'compare', value: { differences: [] } })
    expect(
      parseToolResult('extract_clauses', { ok: true, clauses: [{ title: 42 }] }),
    ).toMatchObject({ kind: 'clauses', value: { clauses: [] } })
    expect(parseToolResult('suggest_edit', { ok: true, suggestions: [{ id: 42 }] })).toMatchObject({
      kind: 'suggestions',
      value: { suggestions: [] },
    })
    expect(
      parseToolResult('extract_placeholders', {
        ok: true,
        fields: [{ key: 'party', required: 'yes' }],
      }),
    ).toMatchObject({ kind: 'placeholders', fields: [] })
  })

  it('compares normalized document lines and caps samples', () => {
    const result = compareVersionHtml(
      '<p>Alpha</p><p>Beta</p><p>Removed</p>',
      '<p>Alpha</p><p>Changed</p><p>Added</p><p>Fourth</p>',
    )

    expect(result).toMatchObject({
      added: 1,
      removed: 0,
      changed: 2,
      previousLineCount: 3,
      currentLineCount: 4,
    })
    expect(result.samples).toEqual([
      { type: 'modified', lineNumber: 2, before: 'Beta', after: 'Changed' },
      { type: 'modified', lineNumber: 3, before: 'Removed', after: 'Added' },
      { type: 'added', lineNumber: 4, after: 'Fourth' },
    ])
  })

  it('maps comment replies and rejection targets', () => {
    const comments = mapDocumentComments(
      [
        {
          id: 'parent',
          document_id: 'document-1',
          version_id: null,
          user_id: 'user-1',
          user_email: 'owner@example.com',
          user_name: 'Owner User',
          parent_comment_id: null,
          body: 'Original review',
          anchor_text: null,
          anchor_start: null,
          anchor_end: null,
          metadata: null,
          resolved: false,
          resolved_by_user_id: null,
          resolved_at: null,
          created_at: '2026-09-02T08:00:00.000Z',
          updated_at: '2026-09-02T08:00:00.000Z',
        },
        {
          id: 'rejection',
          document_id: 'document-1',
          version_id: null,
          user_id: 'user-2',
          user_email: 'approver@example.com',
          user_name: null,
          parent_comment_id: 'parent',
          body: 'Narrow the termination right.',
          anchor_text: 'Either party may terminate',
          anchor_start: null,
          anchor_end: null,
          metadata: {
            kind: 'rejection',
            page_number: 4,
            section_ref: 'Termination',
          },
          resolved: false,
          resolved_by_user_id: null,
          resolved_at: null,
          created_at: '2026-09-02T08:30:00.000Z',
          updated_at: '2026-09-02T08:30:00.000Z',
        },
      ],
      new Date('2026-09-02T09:00:00.000Z').getTime(),
    )

    expect(comments[1]).toMatchObject({
      replyTo: { mention: '@Owner User', preview: 'Original review' },
      clauseRef: 'Page 4 | Section: Termination | Selected: Either party may terminate',
      kind: 'rejection',
    })
    expect(getRejectionFixPrompt(comments[1])).toContain('Section: Termination')
  })

  it('carries tool inputs into stream results and parses presentation state', () => {
    const started = updateToolCalls(new Map(), {
      type: 'tool_call_start',
      tool_call_id: 'call-1',
      tool: 'compare_documents',
      input: { left: 'a', right: 'b' },
    })
    const completed = updateToolCalls(started, {
      type: 'tool_result',
      tool_call_id: 'call-1',
      tool: 'compare_documents',
      status: 'complete',
      output: {
        ok: true,
        doc_a: { doc_id: 'a', filename: 'A.docx' },
        doc_b: { doc_id: 'b', filename: 'B.docx' },
        summary: { added: 2, removed: 1, modified: 3 },
        differences: [],
      },
    })

    expect(completed.get('call-1')).toMatchObject({
      input: { left: 'a', right: 'b' },
      status: 'complete',
    })
    expect(parseToolResult('compare_documents', completed.get('call-1')?.output)).toMatchObject({
      kind: 'compare',
      value: {
        status: 'complete',
        docA: { id: 'a', filename: 'A.docx' },
        summary: { added: 2, removed: 1, modified: 3 },
      },
    })
  })

  it('collects and resolves every risk-fix edit with the chosen decision', async () => {
    const result = collectRiskFixResult([
      { edit_id: 'edit-1', deleted_text: 'old' },
      { edit_id: 'edit-1', inserted_text: 'new' },
      { edit_id: 'edit-2', inserted_text: 'second' },
    ])
    expect(result).toEqual({
      editIds: ['edit-1', 'edit-2'],
      annotations: [
        { kind: 'del', text: 'old' },
        { kind: 'ins', text: 'new' },
        { kind: 'ins', text: 'second' },
      ],
    })

    const acceptEdit = vi.fn().mockResolvedValue(undefined)
    const rejectEdit = vi.fn().mockResolvedValue(undefined)
    await resolveRiskEdits({
      decision: 'reject',
      documentId: 'document-1',
      editIds: result.editIds,
      acceptEdit,
      rejectEdit,
    })

    expect(acceptEdit).not.toHaveBeenCalled()
    expect(rejectEdit.mock.calls).toEqual([
      [{ documentId: 'document-1', editId: 'edit-1' }],
      [{ documentId: 'document-1', editId: 'edit-2' }],
    ])
  })

  it('builds and updates placeholder collection state without mutating it', () => {
    const fields = templatePlaceholderFields({
      fields: [
        {
          id: 'email',
          label: 'Contact Email',
          type: 'email',
          required: true,
        },
      ],
    })
    const state = {
      fields,
      values: placeholderValues(fields),
      status: 'collecting' as const,
    }
    const updated = updatePlaceholderValue(state, 'email', 'legal@example.com')

    expect(isPlaceholderFillPrompt('Please complete this agreement')).toBe(true)
    expect(fields[0]).toMatchObject({ key: 'email', type: 'text', occurrences: 1 })
    expect(state.values.email).toBe('')
    expect(updated.values.email).toBe('legal@example.com')
  })
})
