import { baseApi } from './baseApi'
import { streamSSE, type StreamOutcome } from '../../lib/sseTransport'
import { apiUrl } from '../../lib/apiTransport'
import { isChatStreamEvent, type ChatStreamEvent } from '@prism/protocol'

export interface Chat {
  id: string
  title: string | null
  userId: string
  projectId: string | null
  workspaceId?: string | null
  sessionId?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatSession {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  chats: Chat[]
}

export interface ChatMessageFile {
  filename: string
  document_id: string
}

export interface ChatMessageWorkflow {
  workflow_id: string
  name?: string
}

export interface StoredChatMessage {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string | null | unknown[]
  files?: ChatMessageFile[] | null
  workflow?: ChatMessageWorkflow | null
  annotations?: unknown[] | null
  createdAt: string
}

export interface ChatWithMessages {
  chat: Chat
  messages: StoredChatMessage[]
}

export interface SendChatMessage {
  role: 'user' | 'assistant'
  content: string | null
  files?: ChatMessageFile[]
  workflow?: ChatMessageWorkflow
}

interface ChatStreamRequest {
  messages: SendChatMessage[]
  chat_id?: string
  session_id?: string | null
  project_id?: string | null
  workspace_id?: string | null
  model?: string
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatSessions: builder.query<ChatSession[], void>({
      query: () => '/chat',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatSession' as const, id })),
              { type: 'ChatSession', id: 'LIST' },
            ]
          : [{ type: 'ChatSession', id: 'LIST' }],
    }),

    createSession: builder.mutation<
      { id: string; type: 'session' },
      { project_id?: string | null; workspace_id?: string | null }
    >({
      query: (body) => ({
        url: '/chat/session',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'ChatSession', id: 'LIST' },
        { type: 'Chat', id: 'LIST' },
      ],
    }),

    createChat: builder.mutation<
      { id: string },
      { session_id?: string | null; project_id?: string | null }
    >({
      query: (body) => ({
        url: '/chat/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'ChatSession', id: 'LIST' },
        { type: 'Chat', id: 'LIST' },
      ],
    }),

    getChat: builder.query<ChatWithMessages, string>({
      query: (chatId) => `/chat/${chatId}`,
      providesTags: (_result, _error, chatId) => [{ type: 'Chat', id: chatId }],
    }),

    updateChat: builder.mutation<{ id: string; title: string }, { chatId: string; title: string }>({
      query: ({ chatId, title }) => ({
        url: `/chat/${chatId}`,
        method: 'PATCH',
        body: { title },
      }),
      invalidatesTags: (_result, _error, { chatId }) => [
        { type: 'Chat', id: chatId },
        { type: 'Chat', id: 'LIST' },
      ],
    }),

    deleteChat: builder.mutation<void, string>({
      query: (chatId) => ({
        url: `/chat/${chatId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Chat', id: 'LIST' }],
    }),

    generateChatTitle: builder.mutation<{ title: string }, { chatId: string; message: string }>({
      query: ({ chatId, message }) => ({
        url: `/chat/${chatId}/generate-title`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (_result, _error, { chatId }) => [
        { type: 'Chat', id: chatId },
        { type: 'Chat', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetChatSessionsQuery,
  useCreateSessionMutation,
  useCreateChatMutation,
  useGetChatQuery,
  useLazyGetChatQuery,
  useUpdateChatMutation,
  useDeleteChatMutation,
  useGenerateChatTitleMutation,
} = chatApi

interface ChatStreamCallbacks {
  onEvent: (event: ChatStreamEvent) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  signal?: AbortSignal
}

export type ChatStreamOptions = ChatStreamRequest &
  ChatStreamCallbacks &
  ({ historyMode: 'record' } | { historyMode: 'discard' })

export async function streamChat(options: ChatStreamOptions): Promise<StreamOutcome> {
  const {
    messages,
    chat_id,
    session_id,
    project_id,
    workspace_id,
    model,
    historyMode,
    onEvent,
    onError,
    onComplete,
    signal,
  } = options

  return streamSSE(
    apiUrl('/chat'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        chat_id,
        session_id,
        project_id,
        workspace_id,
        model,
        ephemeral: historyMode === 'discard' ? true : undefined,
      }),
      signal,
    },
    {
      accepts: isChatStreamEvent,
      onEvent,
      onError,
      onComplete,
    },
  )
}
