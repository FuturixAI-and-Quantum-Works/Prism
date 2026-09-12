import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentChat } from './useDocumentChat'

const api = vi.hoisted(() => ({
  streamChat: vi.fn(),
}))

vi.mock('../../store/api/chatApi', () => ({
  streamChat: api.streamChat,
}))

describe('useDocumentChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.streamChat.mockImplementation(
      async (options: { onEvent: (event: { type: 'done' }) => void }) => {
        options.onEvent({ type: 'done' })
        return { kind: 'success' }
      },
    )
  })

  it('leaves model resolution to the saved AI settings', async () => {
    const { result } = renderHook(() =>
      useDocumentChat({
        addComment: vi.fn(async () => true),
        canComment: true,
        canEdit: true,
        contextFiles: [],
        document: {},
        documentId: 'document-1',
        history: [],
        onPlaceholderPrompt: vi.fn(async () => ({ kind: 'presented' as const })),
        onPlaceholderResult: vi.fn(),
        refreshActivity: vi.fn(),
        refreshHistory: vi.fn(),
        refreshHtml: vi.fn(),
        refreshPendingEdits: vi.fn(),
        roleBadge: 'Owner',
      }),
    )

    await act(async () => result.current.send('Summarize this document'))

    expect(api.streamChat).toHaveBeenCalledOnce()
    expect(api.streamChat.mock.calls[0][0]).not.toHaveProperty('model')
  })

  it('appends a placeholder workflow reply without starting a chat stream', async () => {
    const { result } = renderHook(() =>
      useDocumentChat({
        addComment: vi.fn(async () => true),
        canComment: true,
        canEdit: true,
        contextFiles: [],
        document: {},
        documentId: undefined,
        history: [],
        onPlaceholderPrompt: vi.fn(async () => ({
          kind: 'reply' as const,
          message: 'Open a document first.',
        })),
        onPlaceholderResult: vi.fn(),
        refreshActivity: vi.fn(),
        refreshHistory: vi.fn(),
        refreshHtml: vi.fn(),
        refreshPendingEdits: vi.fn(),
        roleBadge: 'Owner',
      }),
    )

    await act(async () => result.current.send('Fill the placeholders'))

    expect(api.streamChat).not.toHaveBeenCalled()
    expect(result.current.messages[result.current.messages.length - 1]).toMatchObject({
      role: 'assistant',
      content: 'Open a document first.',
    })
    expect(result.current.isSending).toBe(false)
    expect(result.current.isStreaming).toBe(false)
  })

  it('settles placeholder workflow failures without leaving the chat busy', async () => {
    const { result } = renderHook(() =>
      useDocumentChat({
        addComment: vi.fn(async () => true),
        canComment: true,
        canEdit: true,
        contextFiles: [],
        document: {},
        documentId: 'document-1',
        history: [],
        onPlaceholderPrompt: vi.fn(async () => {
          throw new Error('Placeholder service unavailable')
        }),
        onPlaceholderResult: vi.fn(),
        refreshActivity: vi.fn(),
        refreshHistory: vi.fn(),
        refreshHtml: vi.fn(),
        refreshPendingEdits: vi.fn(),
        roleBadge: 'Owner',
      }),
    )

    await act(async () => result.current.send('Fill the placeholders'))

    expect(result.current.messages[result.current.messages.length - 1]?.content).toBe(
      'Error: Placeholder service unavailable',
    )
    expect(result.current.isSending).toBe(false)
    expect(result.current.isStreaming).toBe(false)
  })
})
