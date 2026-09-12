import { act, renderHook } from '@testing-library/react'
import type { ChatStreamEvent } from '@prism/protocol'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssistantRuntime } from './useAssistantRuntime'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  streamChat: vi.fn(),
}))

vi.mock('../../projects/projectsApi', () => ({
  streamProjectChat: vi.fn(),
  useGetProjectChatsQuery: () => ({ data: [], isLoading: false }),
}))

vi.mock('../../../store/api/drive/driveWorkspaceApi', () => ({
  streamWorkspaceChat: vi.fn(),
  useGetWorkspaceChatsQuery: () => ({ data: [], isLoading: false }),
}))

vi.mock('../../../store/api/chatApi', () => ({
  streamChat: mocks.streamChat,
  useGetChatSessionsQuery: () => ({ data: [], isLoading: false }),
  useLazyGetChatQuery: () => [vi.fn()],
}))

vi.mock('../../documents/api/documentCoreApi', () => ({
  useUploadDocumentMutation: () => [vi.fn()],
}))

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: () => ({
    isActive: false,
    messages: [],
    chatId: undefined,
    projectId: undefined,
    workspaceId: undefined,
  }),
}))

describe('useAssistantRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves partial replication state from the stream', async () => {
    mocks.streamChat.mockImplementation(
      async (options: { onEvent: (event: ChatStreamEvent) => void }) => {
        options.onEvent({
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
        })
        options.onEvent({ type: 'done' })
        return { kind: 'success' }
      },
    )
    const { result } = renderHook(() => useAssistantRuntime({}))

    await act(async () => {
      await result.current.sendMessage({ text: 'Make two copies', files: [], modelId: 'model-1' })
    })

    expect(result.current.messages[1]?.documents).toEqual([
      expect.objectContaining({
        status: 'ready',
        id: 'document-copy-1',
      }),
      expect.objectContaining({
        status: 'failed',
        error: 'The second copy failed.',
        completedCount: 1,
        expectedCount: 2,
      }),
    ])
  })
})
