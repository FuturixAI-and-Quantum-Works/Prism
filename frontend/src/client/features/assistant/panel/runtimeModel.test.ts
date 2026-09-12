import { describe, expect, it } from 'vitest'
import { reducePanelMessages } from './runtimeModel'
import type { PanelChatMessage } from './types'

describe('assistant panel runtime model', () => {
  it('accumulates streaming artifacts on the active assistant message', () => {
    const messages: PanelChatMessage[] = [
      { role: 'user', content: 'Review this' },
      { role: 'assistant', content: '', isStreaming: true },
    ]

    const withText = reducePanelMessages(messages, {
      type: 'append_text',
      text: 'Done',
      pendingWizard: null,
    })
    const withReasoning = reducePanelMessages(withText, {
      type: 'append_reasoning',
      text: 'Checked terms',
    })
    const finished = reducePanelMessages(withReasoning, { type: 'finish_stream' })

    expect(finished[1]).toEqual({
      role: 'assistant',
      content: 'Done',
      reasoning: 'Checked terms',
      isStreaming: false,
      wizardData: undefined,
    })
    expect(messages[1]).toEqual({ role: 'assistant', content: '', isStreaming: true })
  })

  it('records uploaded document ids on the matching optimistic message', () => {
    const messages: PanelChatMessage[] = [
      {
        role: 'user',
        content: 'Review this',
        attachedFiles: [
          {
            id: 'document-existing',
            name: 'Existing.pdf',
            size: 0,
            type: 'application/pdf',
            source: { kind: 'stored-document', documentId: 'document-existing' },
          },
          {
            id: 'local-file',
            name: 'Agreement.pdf',
            size: 10,
            type: 'application/pdf',
            source: {
              kind: 'local-file',
              file: new File(['agreement'], 'Agreement.pdf', { type: 'application/pdf' }),
            },
          },
        ],
      },
      { role: 'assistant', content: '', isStreaming: true },
    ]

    const updated = reducePanelMessages(messages, {
      type: 'record_uploads',
      messageText: 'Review this',
      uploads: [
        {
          attachmentIndex: 1,
          file: { filename: 'Agreement.pdf', document_id: 'document-3' },
        },
      ],
    })

    expect(updated[0]?.attachedFiles?.[0]).toEqual(messages[0]?.attachedFiles?.[0])
    expect(updated[0]?.attachedFiles?.[1]).toMatchObject({
      id: 'document-3',
      name: 'Agreement.pdf',
      source: { kind: 'stored-document', documentId: 'document-3' },
    })
  })

  it('keeps successful copies and their batch failure together', () => {
    const messages: PanelChatMessage[] = [{ role: 'assistant', content: '', isStreaming: true }]

    const updated = reducePanelMessages(messages, {
      type: 'append_documents',
      documents: [
        {
          status: 'ready',
          id: 'document-copy-1',
          filename: 'Agreement (1).docx',
          action: 'replicated',
        },
        {
          status: 'failed',
          filename: 'Agreement.docx',
          action: 'replicated',
          error: 'The second copy failed.',
          completedCount: 1,
          expectedCount: 2,
        },
      ],
    })

    expect(updated[0]?.documents).toEqual([
      expect.objectContaining({ status: 'ready', id: 'document-copy-1' }),
      expect.objectContaining({
        status: 'failed',
        error: 'The second copy failed.',
        completedCount: 1,
        expectedCount: 2,
      }),
    ])
  })
})
