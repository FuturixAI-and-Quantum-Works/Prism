import { startTransition } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ChatStreamEvent } from '@prism/protocol'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AttachedFile } from '../features/assistant/composer/ChatInputConfig'
import { useChat } from './useChat'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  refetchChats: vi.fn(),
  streamChat: vi.fn(),
  triggerGetChat: vi.fn(),
  uploadDocument: vi.fn(),
  useGetChatQuery: vi.fn(),
}))

vi.mock('../store/hooks', () => ({
  useAppDispatch: () => mocks.dispatch,
}))

vi.mock('../store/api/baseApi', () => ({
  baseApi: {
    util: {
      invalidateTags: vi.fn(),
    },
  },
}))

vi.mock('../store/api/chatApi', () => ({
  useGetChatSessionsQuery: () => ({
    data: [],
    isLoading: false,
    refetch: mocks.refetchChats,
  }),
  useGetChatQuery: mocks.useGetChatQuery,
  useLazyGetChatQuery: () => [mocks.triggerGetChat],
  useCreateChatMutation: () => [vi.fn(), { isLoading: false }],
  useCreateSessionMutation: () => [vi.fn()],
  useDeleteChatMutation: () => [vi.fn()],
  useUpdateChatMutation: () => [vi.fn()],
  useGenerateChatTitleMutation: () => [vi.fn()],
  streamChat: mocks.streamChat,
}))

vi.mock('../features/documents/api/documentCoreApi', () => ({
  useUploadDocumentMutation: () => [mocks.uploadDocument],
}))

const storedChat = {
  chat: {
    id: 'chat-1',
    title: 'Contract review',
    userId: 'user-1',
    projectId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  messages: [
    {
      id: 'message-1',
      chatId: 'chat-1',
      role: 'user' as const,
      content: 'Earlier question',
      files: [{ filename: 'Earlier.pdf', document_id: 'document-earlier' }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useGetChatQuery.mockReturnValue({
      data: storedChat,
      isLoading: false,
      isError: false,
    })
    mocks.streamChat.mockResolvedValue({ kind: 'success' })
  })

  it('builds request history before a queued state update runs', async () => {
    const { result } = renderHook(() => useChat('chat-1'))
    let sendResult: ReturnType<typeof result.current.sendMessage> | undefined

    act(() => {
      startTransition(() => {
        result.current.loadChatMessages()
        sendResult = result.current.sendMessage('Follow-up question')
      })
    })

    expect(mocks.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: 'user',
            content: 'Earlier question',
            files: [{ filename: 'Earlier.pdf', document_id: 'document-earlier' }],
          }),
          expect.objectContaining({ role: 'user', content: 'Follow-up question' }),
        ],
      }),
    )

    await act(async () => {
      await sendResult
    })
  })

  it('maps uploaded document IDs to original attachment positions', async () => {
    mocks.uploadDocument.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'document-new', filename: 'New.pdf' }),
    })
    const existingAttachment: AttachedFile = {
      id: 'document-existing',
      name: 'Existing.pdf',
      size: 0,
      type: 'application/pdf',
      source: { kind: 'stored-document', documentId: 'document-existing' },
    }
    const newAttachment: AttachedFile = {
      id: 'local-new',
      name: 'New.pdf',
      size: 3,
      type: 'application/pdf',
      source: {
        kind: 'local-file',
        file: new File(['new'], 'New.pdf', { type: 'application/pdf' }),
      },
    }
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Compare these', {
        files: [existingAttachment, newAttachment],
      })
    })

    await waitFor(() => {
      const userMessage = result.current.messages.find((message) => message.role === 'user')
      expect(userMessage?.files).toEqual([
        existingAttachment,
        expect.objectContaining({
          id: 'local-new',
          source: { kind: 'stored-document', documentId: 'document-new' },
        }),
      ])
    })
    expect(mocks.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            files: [
              { filename: 'Existing.pdf', document_id: 'document-existing' },
              { filename: 'New.pdf', document_id: 'document-new' },
            ],
          }),
        ],
      }),
    )
  })

  it('preserves partial replication results without fabricated document ids', async () => {
    mocks.streamChat.mockImplementation(
      async (options: { onEvent: (event: ChatStreamEvent) => void }) => {
        options.onEvent({
          type: 'doc_replicated',
          filename: 'Agreement.docx',
          count: 3,
          copies: [
            {
              new_filename: 'Agreement (1).docx',
              document_id: 'document-copy-1',
              version_id: 'version-1',
            },
            {
              new_filename: 'Agreement (2).docx',
              document_id: 'document-copy-2',
              version_id: 'version-2',
            },
          ],
          error: 'The third copy could not be stored.',
        })
        options.onEvent({ type: 'done' })
        return { kind: 'success' }
      },
    )
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Make three copies')
    })

    const assistant = result.current.messages.find((message) => message.role === 'assistant')
    expect(assistant?.documents).toEqual([
      expect.objectContaining({
        status: 'ready',
        id: 'document-copy-1',
        filename: 'Agreement (1).docx',
      }),
      expect.objectContaining({
        status: 'ready',
        id: 'document-copy-2',
        filename: 'Agreement (2).docx',
      }),
      expect.objectContaining({
        status: 'failed',
        error: 'The third copy could not be stored.',
        completedCount: 2,
        expectedCount: 3,
      }),
    ])
    expect(assistant?.documents?.filter((artifact) => artifact.status === 'ready')).toHaveLength(2)
  })

  it.each([
    [404, 'unavailable'],
    [500, 'failed'],
  ] as const)('maps a %s chat query error to %s', (status, kind) => {
    mocks.useGetChatQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status },
    })

    const { result } = renderHook(() => useChat('chat-1'))

    expect(result.current.chatLoadState.kind).toBe(kind)
  })
})
