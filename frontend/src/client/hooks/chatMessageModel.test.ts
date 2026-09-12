import { describe, expect, it } from 'vitest'
import type { StoredChatMessage } from '../store/api/chatApi'
import { normalizeStoredMessage, toChatMessageFiles } from './chatMessageModel'

const createdAt = '2026-09-03T00:00:00.000Z'

describe('chat message model', () => {
  it('normalizes persisted assistant events into visible content and artifacts', () => {
    const message: StoredChatMessage = {
      id: 'message-1',
      chatId: 'chat-1',
      role: 'assistant',
      createdAt,
      content: [
        { type: 'reasoning', text: 'Checking terms. ' },
        { type: 'content', text: 'The agreement renews annually.' },
        {
          type: 'doc_edited',
          document_id: 'document-1',
          filename: 'Agreement.docx',
          created_at: createdAt,
        },
      ],
    }

    expect(normalizeStoredMessage(message)).toEqual({
      id: 'message-1',
      role: 'assistant',
      content: 'The agreement renews annually.',
      reasoning: 'Checking terms.',
      documents: [
        {
          status: 'ready',
          id: 'document-1',
          filename: 'Agreement.docx',
          action: 'edited',
          createdAt,
        },
      ],
      createdAt,
    })
  })

  it('restores successful copies and the failure from a partial replication event', () => {
    const message: StoredChatMessage = {
      id: 'message-2',
      chatId: 'chat-1',
      role: 'assistant',
      createdAt,
      content: [
        {
          type: 'doc_replicated',
          filename: 'Agreement.docx',
          count: 2,
          copies: [
            {
              new_filename: 'Agreement (1).docx',
              document_id: 'document-copy-1',
              version_id: 'version-1',
            },
          ],
          error: 'The second copy failed.',
        },
      ],
    }

    const normalized = normalizeStoredMessage(message)

    expect(normalized.documents).toEqual([
      expect.objectContaining({
        status: 'ready',
        id: 'document-copy-1',
        filename: 'Agreement (1).docx',
      }),
      expect.objectContaining({
        status: 'failed',
        error: 'The second copy failed.',
        completedCount: 1,
        expectedCount: 2,
      }),
    ])
    expect(normalized.content).toContain('The second copy failed.')
  })

  it('sends only attachments backed by stored documents', () => {
    expect(
      toChatMessageFiles([
        {
          id: 'stored-1',
          name: 'Stored.pdf',
          size: 0,
          type: 'application/pdf',
          source: { kind: 'stored-document', documentId: 'document-1' },
        },
        {
          id: 'local-1',
          name: 'Local.pdf',
          size: 4,
          type: 'application/pdf',
          source: {
            kind: 'local-file',
            file: new File(['file'], 'Local.pdf', { type: 'application/pdf' }),
          },
        },
      ]),
    ).toEqual([{ filename: 'Stored.pdf', document_id: 'document-1' }])
  })
})
