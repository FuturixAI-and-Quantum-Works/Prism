import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AttachedFile } from '../composer/ChatInputConfig'
import { useConversationController } from './useConversationController'

const mocks = vi.hoisted(() => ({
  clearMessages: vi.fn(),
  createSession: vi.fn(() => Promise.resolve({ success: true, sessionId: 'session-new' })),
  createTemplate: vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'template-new' }) })),
  sendMessage: vi.fn(() => Promise.resolve({ success: true, chatId: 'chat-initial' })),
  storage: new Map<string, string>(),
  chatLoadState: { kind: 'idle' } as { kind: string; error?: unknown },
}))

vi.mock('../../../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))

vi.mock('../../../hooks/useChat', () => ({
  useChat: () => ({
    sessions: [],
    messages: [],
    isLoadingChats: false,
    status: 'ready',
    stoppedMessageIds: {},
    sendMessage: mocks.sendMessage,
    clearMessages: mocks.clearMessages,
    createSession: mocks.createSession,
    chatLoadState: mocks.chatLoadState,
  }),
}))

vi.mock('../../../store/api/chatApi', () => ({
  streamChat: vi.fn(),
}))

vi.mock('../../templates/templatesApi', () => ({
  useCreateTemplateMutation: () => [mocks.createTemplate, { isLoading: false }],
  useGetTemplatesQuery: () => ({ data: [], isLoading: false }),
}))

describe('useConversationController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.storage.clear()
    mocks.chatLoadState = { kind: 'idle' }
    vi.stubGlobal('localStorage', {
      clear: () => mocks.storage.clear(),
      getItem: (key: string) => mocks.storage.get(key) ?? null,
      key: (index: number) => Array.from(mocks.storage.keys())[index] ?? null,
      get length() {
        return mocks.storage.size
      },
      removeItem: (key: string) => mocks.storage.delete(key),
      setItem: (key: string, value: string) => mocks.storage.set(key, String(value)),
    })
  })

  it('sends the initial message with initial files and adopts the returned chat', async () => {
    const initialFile: AttachedFile = {
      id: 'file-1',
      name: 'Agreement.pdf',
      size: 9,
      type: 'application/pdf',
      source: {
        kind: 'local-file',
        file: new File(['agreement'], 'Agreement.pdf', { type: 'application/pdf' }),
      },
    }

    const { result } = renderHook(() =>
      useConversationController({
        initialMessage: 'Review this agreement',
        initialFiles: [initialFile],
      }),
    )

    await waitFor(() => {
      expect(mocks.sendMessage).toHaveBeenCalledWith('Review this agreement', {
        chat_id: undefined,
        files: [initialFile],
      })
      expect(result.current.selectedHistoryId).toBe('chat-initial')
    })
    expect(localStorage.getItem('prism_dashboard_active_chat')).toBe('chat-initial')
  })

  it('uses the active dashboard session when sending the first composed message', async () => {
    localStorage.setItem('prism_dashboard_active_session', 'session-existing')
    const { result } = renderHook(() => useConversationController({}))

    act(() => {
      result.current.setInputText('Continue this conversation')
    })
    await act(async () => {
      await result.current.handleSend()
    })

    expect(mocks.sendMessage).toHaveBeenCalledWith('Continue this conversation', {
      chat_id: undefined,
      session_id: 'session-existing',
      files: undefined,
    })
    expect(localStorage.getItem('prism_dashboard_active_chat')).toBe('chat-initial')
  })

  it('clears the active conversation before creating a new session', async () => {
    localStorage.setItem('prism_dashboard_active_chat', 'chat-old')
    localStorage.setItem('prism_dashboard_active_session', 'session-old')
    const { result } = renderHook(() => useConversationController({}))

    await act(async () => {
      await result.current.handleNewChat()
    })

    expect(mocks.clearMessages).toHaveBeenCalled()
    expect(mocks.createSession).toHaveBeenCalledOnce()
    expect(localStorage.getItem('prism_dashboard_active_chat')).toBeNull()
    expect(localStorage.getItem('prism_dashboard_active_session')).toBe('session-new')
  })

  it('reports unavailable chats without treating other failures as not found', async () => {
    const onChatNotFound = vi.fn()
    mocks.chatLoadState = { kind: 'failed', error: new Error('Network unavailable') }
    const failed = renderHook(() =>
      useConversationController({ chatId: 'chat-failed', onChatNotFound }),
    )

    await waitFor(() => expect(onChatNotFound).not.toHaveBeenCalled())
    failed.unmount()

    mocks.chatLoadState = { kind: 'unavailable' }
    renderHook(() => useConversationController({ chatId: 'chat-missing', onChatNotFound }))

    await waitFor(() => expect(onChatNotFound).toHaveBeenCalledOnce())
  })

  it('keeps the template dialog open and reports creation failures', async () => {
    mocks.createTemplate.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { detail: 'Template creation was rejected.' } }),
    })
    const { result } = renderHook(() => useConversationController({}))

    act(() => result.current.setNewTemplateModalOpen(true))
    await act(async () => {
      await result.current.handleCreateTemplate({
        name: 'Services',
        category: 'Contracts',
        content_html: '<p></p>',
      })
    })

    expect(result.current.newTemplateModalOpen).toBe(true)
    expect(result.current.templateError).toBe('Template creation was rejected.')
  })
})
