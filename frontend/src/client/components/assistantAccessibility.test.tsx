import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiAssistantPanel from '../features/assistant/panel/AiAssistantPanel'
import ChatInput from '../features/assistant/composer/ChatInput'
import {
  createFileAddOption,
  PROMPT_IMPROVEMENT_FAILURE_MESSAGE,
  type PromptImprovementHandler,
} from '../features/assistant/composer/ChatInputConfig'
import { ChatStreamArtifacts } from '../features/assistant/stream/ChatStreamArtifacts'
import AssistantHistoryPage from '../features/assistant/history/AssistantHistoryPage'
import AssistantPage from '../features/assistant/AssistantPage'
import ConversationScreen from '../features/assistant/conversation/ConversationScreen'
import { ChatComposer } from '../features/documentEditor/ChatComposer'
import type { ChatComposerProps } from '../features/documentEditor/chatComposerModel'
import { ChatWelcomeState } from '../features/documentEditor/ChatWelcomeState'

const mocks = vi.hoisted(() => ({
  chatStatus: 'ready',
  clearMessages: vi.fn(),
  createSession: vi.fn(() => Promise.resolve({ success: true, sessionId: 'session-new' })),
  deleteChat: vi.fn(() => Promise.resolve({ success: true })),
  dispatch: vi.fn(),
  fetchChat: vi.fn(() => ({
    unwrap: () => Promise.resolve({ messages: [] }),
  })),
  refetchChats: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn(() => Promise.resolve({ success: true, chatId: 'chat-1' })),
  storage: new Map<string, string>(),
}))

vi.mock('./Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks', () => ({
  useAuth: () => ({ user: { displayName: 'Alex Morgan' } }),
  useResponsive: () => ({ isMobile: false, isTablet: false }),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { displayName: 'Alex Morgan' } }),
}))

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    sessions: [
      {
        id: 'session-1',
        title: 'Contract review',
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-02T12:00:00.000Z',
        chats: [
          { id: 'chat-1', title: 'Initial review' },
          { id: 'chat-2', title: 'Follow-up review' },
        ],
      },
    ],
    messages: [],
    isLoadingChats: false,
    status: mocks.chatStatus,
    stoppedMessageIds: [],
    sendMessage: mocks.sendMessage,
    clearMessages: mocks.clearMessages,
    createSession: mocks.createSession,
    deleteChat: mocks.deleteChat,
    refetchChats: mocks.refetchChats,
    chatLoadState: { kind: 'idle' },
  }),
}))

vi.mock('../store/hooks', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (
    selector: (state: {
      backgroundChat: {
        isActive: boolean
        messages: never[]
        chatId: undefined
        projectId: undefined
        workspaceId: undefined
      }
    }) => unknown,
  ) =>
    selector({
      backgroundChat: {
        isActive: false,
        messages: [],
        chatId: undefined,
        projectId: undefined,
        workspaceId: undefined,
      },
    }),
}))

vi.mock('../features/projects/projectsApi', () => ({
  streamProjectChat: vi.fn(),
  useGetProjectChatsQuery: () => ({ data: [], isLoading: false }),
}))

vi.mock('../store/api/drive/driveWorkspaceApi', () => ({
  streamWorkspaceChat: vi.fn(),
  useGetWorkspaceChatsQuery: () => ({ data: [], isLoading: false }),
}))

vi.mock('../store/api/chatApi', () => ({
  streamChat: vi.fn(),
  useGetChatSessionsQuery: () => ({ data: [], isLoading: false }),
  useLazyGetChatQuery: () => [mocks.fetchChat],
}))

vi.mock('../features/documents/documentsApi', () => ({
  useCreateDocumentMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'document-1' }) })),
  ],
  useLazyGetDocumentUrlQuery: () => [vi.fn()],
  useUploadDocumentMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'document-1', filename: 'File.pdf' }) })),
  ],
}))

vi.mock('../features/documents/api/documentCoreApi', () => ({
  useUploadDocumentMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'document-1', filename: 'File.pdf' }) })),
  ],
}))

vi.mock('../features/templates/templatesApi', () => ({
  useCreateTemplateMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'template-1' }) })),
    { isLoading: false },
  ],
  useGetTemplatesQuery: () => ({ data: [], isLoading: false }),
}))

vi.mock('./CreateDocumentModal', () => ({ default: () => null }))
vi.mock('./chat/TemplateWizardCard', () => ({ default: () => null }))
vi.mock('../features/templates/TemplateCard', () => ({ TemplateCard: () => null }))

function ChatInputHarness({
  onAddFiles,
  onSend,
  onImprovePrompt,
  isImprovingPrompt = false,
}: {
  onAddFiles: () => void
  onSend: () => void
  onImprovePrompt?: PromptImprovementHandler
  isImprovingPrompt?: boolean
}) {
  const [value, setValue] = useState('Review this agreement')
  return (
    <ChatInput
      value={value}
      onChange={setValue}
      onSend={onSend}
      addOptions={[createFileAddOption(onAddFiles)]}
      showCreateButton={false}
      showImprovePrompt
      onImprovePrompt={onImprovePrompt}
      isImprovingPrompt={isImprovingPrompt}
    />
  )
}

function ChatComposerHarness({
  onSend,
  isStreaming = false,
}: {
  onSend: () => void
  isStreaming?: boolean
}) {
  const [inputText, setInputText] = useState('Review this clause')

  const props = {
    handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        onSend()
      }
    },
    handleSendMessage: async () => onSend(),
    inputText,
    isAnimating: false,
    isSending: false,
    isStreaming,
    placeholderIndex: 0,
    setInputText,
  } satisfies ChatComposerProps

  return <ChatComposer {...props} />
}

describe('assistant accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.storage.clear()
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
    mocks.chatStatus = 'ready'
  })

  it('operates ChatWelcomeState suggestions from the keyboard', async () => {
    const user = userEvent.setup()
    const onSelectSuggestion = vi.fn()
    const { container } = render(
      <ChatWelcomeState
        userName="Alex"
        suggestions={[{ icon: '/suggestion.svg', text: 'Summarize this document' }]}
        onSelectSuggestion={onSelectSuggestion}
      />,
    )

    const suggestion = screen.getByRole('button', { name: 'Summarize this document' })
    suggestion.focus()
    await user.keyboard('{Enter}')

    expect(onSelectSuggestion).toHaveBeenCalledWith('Summarize this document')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('operates supported ChatInput actions and exposes busy state', async () => {
    const user = userEvent.setup()
    const onAddFiles = vi.fn()
    const onSend = vi.fn()
    const { container, rerender } = render(
      <ChatInputHarness onAddFiles={onAddFiles} onSend={onSend} />,
    )

    const textarea = screen.getByRole('textbox', { name: 'Message Prism' })
    textarea.focus()
    await user.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledOnce()

    const send = screen.getByRole('button', { name: 'Send message' })
    send.focus()
    await user.keyboard(' ')
    expect(onSend).toHaveBeenCalledTimes(2)

    const addTrigger = screen.getByRole('button', { name: 'Add to message' })
    await user.click(addTrigger)
    expect(addTrigger).toHaveAttribute('aria-expanded', 'true')
    const addItems = screen.getAllByRole('menuitem')
    expect(addItems).toHaveLength(1)
    expect(addItems[0]).toHaveAccessibleName('Add Files')
    expect(screen.queryByRole('menuitem', { name: 'Add from Project' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Add Source' })).not.toBeInTheDocument()
    expect(addItems[0]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onAddFiles).toHaveBeenCalledOnce()
    expect(addTrigger).toHaveFocus()
    expect(screen.queryByRole('button', { name: /Search mode:/ })).not.toBeInTheDocument()

    rerender(<ChatInputHarness onAddFiles={onAddFiles} onSend={onSend} isImprovingPrompt />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(status).toHaveTextContent('Improving prompt')
    expect(textarea).toHaveAttribute('aria-busy', 'true')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('announces prompt improvement failure and preserves the original text', async () => {
    const user = userEvent.setup()
    const onImprovePrompt = vi.fn<PromptImprovementHandler>().mockResolvedValue({
      kind: 'failed',
      message: PROMPT_IMPROVEMENT_FAILURE_MESSAGE,
    })
    render(
      <ChatInputHarness onAddFiles={vi.fn()} onSend={vi.fn()} onImprovePrompt={onImprovePrompt} />,
    )

    await user.click(screen.getByRole('button', { name: 'Improve' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(PROMPT_IMPROVEMENT_FAILURE_MESSAGE)
    expect(screen.getByRole('textbox', { name: 'Message Prism' })).toHaveValue(
      'Review this agreement',
    )
  })

  it('operates ChatComposer from the keyboard without fake mode controls', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    const { container, rerender } = render(<ChatComposerHarness onSend={onSend} />)
    const textarea = screen.getByRole('textbox', { name: 'Message Prism' })
    textarea.focus()
    await user.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledOnce()

    const send = screen.getByRole('button', { name: 'Send message' })
    send.focus()
    await user.keyboard(' ')
    expect(onSend).toHaveBeenCalledTimes(2)

    expect(screen.queryByRole('button', { name: 'Add to message' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Search mode:/ })).not.toBeInTheDocument()
    rerender(<ChatComposerHarness onSend={onSend} isStreaming />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(status).toHaveTextContent('Assistant is responding')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('announces ChatStreamArtifacts progress and activates document links', async () => {
    const user = userEvent.setup()
    const { container, rerender } = render(
      <ChatStreamArtifacts
        reasoning="**Reviewing clauses**"
        isStreaming
        documents={[
          {
            status: 'ready',
            id: 'document-1',
            filename: 'Agreement.docx',
            action: 'created',
          },
        ]}
      />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('Reviewing clauses')
    const documentLink = screen.getByRole('link', {
      name: 'Open Agreement.docx in a new tab',
    })
    const activation = vi.fn()
    documentLink.addEventListener('click', (event) => {
      event.preventDefault()
      activation()
    })
    documentLink.focus()
    await user.keyboard('{Enter}')
    expect(activation).toHaveBeenCalledOnce()

    rerender(
      <ChatStreamArtifacts
        reasoning="**Reviewing clauses**"
        documents={[
          {
            status: 'ready',
            id: 'document-1',
            filename: 'Agreement.docx',
            action: 'created',
          },
        ]}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Ready')

    rerender(
      <ChatStreamArtifacts
        documents={[
          {
            status: 'failed',
            filename: 'Agreement.docx',
            action: 'replicated',
            error: 'The second copy failed.',
            completedCount: 1,
            expectedCount: 2,
          },
        ]}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('1 of 2 copies completed.')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('operates ConversationScreen history and announces streaming', async () => {
    const user = userEvent.setup()
    mocks.chatStatus = 'streaming'
    const { container } = render(<ConversationScreen showSidebar showBackButton={false} />)

    const historyItem = screen.getByRole('button', { name: 'Contract review' })
    historyItem.focus()
    await user.keyboard('{Enter}')

    expect(localStorage.getItem('prism_dashboard_active_chat')).toBe('chat-1')
    const respondingStatus = screen.getByText('Assistant is responding', {
      selector: '[role="status"]',
    })
    expect(respondingStatus).toHaveAttribute('aria-live', 'polite')
    expect(respondingStatus).toHaveAttribute('aria-atomic', 'true')
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Templates' }))
    await user.click(screen.getByRole('button', { name: 'New Template' }))
    expect(screen.getByRole('textbox', { name: /Template Name/ })).toBeRequired()
    expect(screen.getByRole('textbox', { name: /Category/ })).toBeRequired()
    expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument()

    expect(
      screen.queryByRole('button', { name: 'Upload template documents' }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('#new-template-files')).toBeNull()
    expect(screen.queryByText(/Supports PDF|Drag your documents/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close create template dialog' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('operates AiAssistantPanel cards and resize separator from the keyboard', async () => {
    const user = userEvent.setup()
    const onWidthChange = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route
            path="*"
            element={
              <AiAssistantPanel
                collapsed={false}
                onToggle={vi.fn()}
                onWidthChange={onWidthChange}
                width={480}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    const separator = screen.getByRole('separator', { name: 'Resize assistant panel' })
    expect(separator).toHaveAttribute('aria-valuemin', '320')
    expect(separator).toHaveAttribute('aria-valuemax', '800')
    expect(separator).toHaveAttribute('aria-valuenow', '480')
    separator.focus()
    await user.keyboard('{ArrowLeft}{ArrowRight}{Home}{End}')
    expect(onWidthChange).toHaveBeenNthCalledWith(1, 496)
    expect(onWidthChange).toHaveBeenNthCalledWith(2, 464)
    expect(onWidthChange).toHaveBeenNthCalledWith(3, 320)
    expect(onWidthChange).toHaveBeenNthCalledWith(4, 800)

    expect(screen.queryByRole('button', { name: /^Search mode:/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add to message' }))
    expect(screen.getByRole('menuitem', { name: 'Add Files' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Add from Project' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Add Source' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    const fileInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Upload documents to the assistant"]',
    )!
    const clickSpy = vi.spyOn(fileInput, 'click')
    const uploadDocument = screen.getByRole('button', { name: /Upload Document/ })
    uploadDocument.focus()
    await user.keyboard('{Enter}')
    expect(clickSpy).toHaveBeenCalledOnce()
    clickSpy.mockRestore()

    const compareDocuments = screen.getByRole('button', { name: /Compare Documents/ })
    compareDocuments.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('No documents to compare')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('operates AssistantPage modes and prompts from the keyboard', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>,
    )

    const createMode = screen.getByRole('button', { name: 'Create Document' })
    createMode.focus()
    await user.keyboard('{Enter}')
    expect(createMode).toHaveAttribute('aria-pressed', 'true')

    const suggestion = screen.getByRole('button', {
      name: 'Summarize Document: Get a quick summary of key points and terms',
    })
    suggestion.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('textbox', { name: 'Message Prism' })).toHaveValue(
      'Summarize the key points and important terms from my document',
    )

    const compareMode = screen.getByRole('button', { name: 'Compare Document' })
    compareMode.focus()
    await user.keyboard(' ')
    expect(compareMode).toHaveAttribute('aria-pressed', 'true')

    const comparisonInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="Upload a comparison document"]',
    )!
    const clickSpy = vi.spyOn(comparisonInput, 'click')
    const uploadFirst = screen.getByRole('button', { name: 'Upload comparison document 1' })
    uploadFirst.focus()
    await user.keyboard('{Enter}')
    expect(clickSpy).toHaveBeenCalledOnce()
    clickSpy.mockRestore()

    const addComparison = screen.getByRole('button', {
      name: 'Add another comparison document',
    })
    addComparison.focus()
    await user.keyboard(' ')
    expect(screen.getAllByRole('button', { name: /Upload comparison document/ })).toHaveLength(3)
    const removeThird = screen.getByRole('button', { name: 'Remove comparison slot 3' })
    fireEvent.focus(removeThird)
    expect(removeThird).toHaveStyle({ opacity: '1' })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sends the home conversation request without unsupported mode metadata', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: /Search mode:/ })).not.toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Message Prism' })
    await user.type(input, '  Review this agreement  ')
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenCalledWith('Review this agreement', {
        chat_id: undefined,
        files: undefined,
      }),
    )
  })

  it('operates AssistantHistoryPage rows and menus from the keyboard', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <AssistantHistoryPage />
      </MemoryRouter>,
    )

    const conversation = screen.getByRole('button', {
      name: 'Open conversation Contract review',
    })
    await user.tab()
    expect(screen.getByRole('button', { name: 'History' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Search conversation history' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'New Chat' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sort: Newest' })).toHaveFocus()
    await user.tab()
    expect(conversation).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(localStorage.getItem('prism_assistant_active_chat')).toBe('chat-1')
    expect(screen.queryByRole('button', { name: 'All Types' })).not.toBeInTheDocument()
    expect(screen.queryByText('Deep Search')).not.toBeInTheDocument()

    const actions = screen.getByRole('button', { name: 'More actions for Contract review' })
    await user.tab()
    expect(actions).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(actions).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(mocks.deleteChat).toHaveBeenCalledTimes(2))
    expect(mocks.deleteChat).toHaveBeenNthCalledWith(1, 'chat-1')
    expect(mocks.deleteChat).toHaveBeenNthCalledWith(2, 'chat-2')
    expect(mocks.refetchChats).toHaveBeenCalledOnce()
    expect(await axe(container)).toHaveNoViolations()
  })
})
