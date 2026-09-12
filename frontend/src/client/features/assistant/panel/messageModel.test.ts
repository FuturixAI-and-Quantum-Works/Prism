import { describe, expect, it } from 'vitest'
import { isValidUUID, normalizeStoredMessage, parseMessageContent } from './messageModel'

describe('assistant panel message model', () => {
  it('reconstructs streamed assistant events from stored history', () => {
    const message = normalizeStoredMessage({
      id: 'message-1',
      role: 'assistant',
      createdAt: '2026-09-02T10:00:00.000Z',
      content: JSON.stringify([
        { type: 'reasoning', text: 'Checking terms' },
        { type: 'content', text: 'The agreement ' },
        { type: 'content', text: 'renews annually.' },
        {
          type: 'doc_created',
          document_id: 'document-1',
          filename: 'Renewal.docx',
        },
      ]),
    })

    expect(message).toMatchObject({
      role: 'assistant',
      content: 'The agreement renews annually.',
      reasoning: 'Checking terms',
      documents: [
        {
          status: 'ready',
          id: 'document-1',
          filename: 'Renewal.docx',
          action: 'created',
          createdAt: '2026-09-02T10:00:00.000Z',
        },
      ],
    })
  })

  it('does not invent an id for a failed stored document event', () => {
    const message = normalizeStoredMessage({
      id: 'message-failed',
      role: 'assistant',
      createdAt: '2026-09-02T10:00:00.000Z',
      content: JSON.stringify([
        {
          type: 'doc_edited',
          filename: 'Renewal.docx',
          error: 'The edit could not be applied.',
        },
      ]),
    })

    expect(message.documents).toEqual([
      {
        status: 'failed',
        action: 'edited',
        filename: 'Renewal.docx',
        error: 'The edit could not be applied.',
        createdAt: '2026-09-02T10:00:00.000Z',
      },
    ])
    expect(message.content).toContain('The edit could not be applied.')
  })

  it('restores user attachments and strips transport metadata', () => {
    const message = normalizeStoredMessage({
      id: 'message-2',
      role: 'user',
      content: 'Review this',
      files: [{ filename: 'Agreement.pdf', document_id: 'document-2' }],
    })

    expect(message.attachedFiles).toEqual([
      {
        id: 'document-2',
        name: 'Agreement.pdf',
        size: 0,
        type: 'application/pdf',
        source: { kind: 'stored-document', documentId: 'document-2' },
      },
    ])
    expect(parseMessageContent('Answer<CITATIONS>[{"id":"one"}]</CITATIONS>')).toBe('Answer')
  })

  it('recognizes document identifiers', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isValidUUID('temporary-document')).toBe(false)
  })
})
