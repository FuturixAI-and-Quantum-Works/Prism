import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import type { ChatStreamEvent } from '@prism/protocol'
import { useAppDispatch } from '../store/hooks'
import {
  useGetChatSessionsQuery,
  useGetChatQuery,
  useLazyGetChatQuery,
  useCreateChatMutation,
  useCreateSessionMutation,
  useDeleteChatMutation,
  useUpdateChatMutation,
  useGenerateChatTitleMutation,
  streamChat,
  type SendChatMessage,
  type ChatMessageFile,
  type ChatSession,
} from '../store/api/chatApi'
import { baseApi } from '../store/api/baseApi'
import { useUploadDocumentMutation } from '../features/documents/api/documentCoreApi'
import {
  addProcess,
  updateProcessStatus,
  removeProcess,
} from '../store/slices/pendingProcessesSlice'
import type { ChatToolCallArtifact } from '../features/assistant/stream/artifactTypes'
import {
  documentArtifactsFromEvent,
  mergeDocumentArtifacts,
} from '../features/assistant/stream/documentArtifactModel'
import type { AttachedFile } from '../features/assistant/composer/ChatInputConfig'
import { getRequestErrorMessage } from '../lib/requestErrors'
import {
  normalizeStoredMessage,
  toChatMessageFiles,
  withStoredDocument,
  type LocalChatMessage,
} from './chatMessageModel'

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export type ChatLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable' }
  | { kind: 'failed'; error: unknown }

function hasHttpStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === status
}

export function useChat(chatId?: string) {
  const [messages, setMessages] = useState<LocalChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [stoppedMessageIds, setStoppedMessageIds] = useState<Record<string, true>>({})
  const abortRef = useRef<(() => void) | null>(null)
  const processIdRef = useRef<string | null>(null)
  const dispatch = useAppDispatch()

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current()
        abortRef.current = null
      }
      if (processIdRef.current) {
        dispatch(removeProcess(processIdRef.current))
        processIdRef.current = null
      }
    }
  }, [dispatch])

  const {
    data: sessionsData,
    isLoading: isLoadingChats,
    refetch: refetchChats,
  } = useGetChatSessionsQuery()
  const {
    data: chatData,
    isLoading: isLoadingChat,
    isError: hasChatQueryError,
    error: chatQueryError,
  } = useGetChatQuery(chatId || '', {
    skip: !chatId,
  })
  const [triggerGetChat] = useLazyGetChatQuery()

  const [createChatMutation, { isLoading: isCreatingChat }] = useCreateChatMutation()
  const [createSessionMutation] = useCreateSessionMutation()
  const [deleteChatMutation] = useDeleteChatMutation()
  const [updateChatMutation] = useUpdateChatMutation()
  const [generateTitleMutation] = useGenerateChatTitleMutation()
  const [uploadDocumentMutation] = useUploadDocumentMutation()

  const sessions = useMemo<ChatSession[]>(() => sessionsData || [], [sessionsData])
  const currentChat = chatId && chatData?.chat.id === chatId ? chatData : undefined
  const chatLoadState = useMemo<ChatLoadState>(() => {
    if (!chatId) return { kind: 'idle' }
    if (isLoadingChat) return { kind: 'loading' }
    if (hasChatQueryError) {
      return hasHttpStatus(chatQueryError, 404)
        ? { kind: 'unavailable' }
        : { kind: 'failed', error: chatQueryError }
    }
    return currentChat ? { kind: 'ready' } : { kind: 'loading' }
  }, [chatId, chatQueryError, currentChat, hasChatQueryError, isLoadingChat])
  const currentChatMessages = useMemo(
    () => currentChat?.messages?.map(normalizeStoredMessage) ?? [],
    [currentChat],
  )

  const createSession = useCallback(
    async (params?: { project_id?: string | null; workspace_id?: string | null }) => {
      try {
        const result = await createSessionMutation(params || {}).unwrap()
        return { success: true, sessionId: result.id }
      } catch (error: unknown) {
        return { success: false, error: getRequestErrorMessage(error, 'Failed to create session') }
      }
    },
    [createSessionMutation],
  )

  const createChat = useCallback(
    async (params?: { session_id?: string | null; project_id?: string | null }) => {
      try {
        const result = await createChatMutation(params || {}).unwrap()
        return { success: true, chatId: result.id }
      } catch (error: unknown) {
        return { success: false, error: getRequestErrorMessage(error, 'Failed to create chat') }
      }
    },
    [createChatMutation],
  )

  const deleteChat = useCallback(
    async (id: string) => {
      try {
        await deleteChatMutation(id).unwrap()
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: getRequestErrorMessage(error, 'Failed to delete chat') }
      }
    },
    [deleteChatMutation],
  )

  const updateChatTitle = useCallback(
    async (id: string, title: string) => {
      try {
        await updateChatMutation({ chatId: id, title }).unwrap()
        return { success: true }
      } catch (error: unknown) {
        return {
          success: false,
          error: getRequestErrorMessage(error, 'Failed to update chat title'),
        }
      }
    },
    [updateChatMutation],
  )

  const generateTitle = useCallback(
    async (id: string, message: string) => {
      try {
        const result = await generateTitleMutation({ chatId: id, message }).unwrap()
        return { success: true, title: result.title }
      } catch (error: unknown) {
        return { success: false, error: getRequestErrorMessage(error, 'Failed to generate title') }
      }
    },
    [generateTitleMutation],
  )

  const refetchChat = useCallback(() => {
    if (chatId) {
      triggerGetChat(chatId)
    }
  }, [chatId, triggerGetChat])

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        chat_id?: string
        session_id?: string | null
        project_id?: string | null
        workspace_id?: string | null
        model?: string
        files?: AttachedFile[]
      },
    ) => {
      const userMessageId = `user-${Date.now()}`
      const userMessage: LocalChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        files: options?.files,
        createdAt: new Date().toISOString(),
      }

      const assistantMessage: LocalChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        isStreaming: true,
        createdAt: new Date().toISOString(),
      }

      const baseMessages = messages.length > 0 ? messages : currentChatMessages
      setMessages([...baseMessages, userMessage, assistantMessage])
      setStatus('submitted')

      const updateAssistant = (updater: (message: LocalChatMessage) => LocalChatMessage) => {
        setMessages((prev) =>
          prev.map((message) => (message.id === assistantMessage.id ? updater(message) : message)),
        )
      }

      let uploadedFiles: ChatMessageFile[] = []
      if (options?.files && options.files.length > 0) {
        try {
          const uploadPromises: Promise<{
            filename: string
            document_id: string
            originalIndex: number
          }>[] = []
          options.files.forEach((attachedFile, originalIndex) => {
            if (attachedFile.source.kind !== 'local-file') return
            const file = attachedFile.source.file
            uploadPromises.push(
              (async () => {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('attached', 'true')
                if (options.project_id) {
                  formData.append('project_id', options.project_id)
                }
                if (options.workspace_id) {
                  formData.append('workspace_id', options.workspace_id)
                }
                const doc = await uploadDocumentMutation(formData).unwrap()
                return {
                  filename: doc.filename,
                  document_id: doc.id,
                  originalIndex,
                }
              })(),
            )
          })
          const uploadResults = await Promise.all(uploadPromises)
          const uploadsByIndex = new Map<number, ChatMessageFile>(
            uploadResults.map(({ filename, document_id, originalIndex }) => [
              originalIndex,
              { filename, document_id },
            ]),
          )
          uploadedFiles = options.files.flatMap((file, index) => {
            if (file.source.kind === 'stored-document') {
              return [{ filename: file.name, document_id: file.source.documentId }]
            }
            const uploaded = uploadsByIndex.get(index)
            return uploaded ? [uploaded] : []
          })
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === userMessageId && m.files) {
                const updatedFiles = m.files.map((f, idx) => {
                  const uploaded = uploadsByIndex.get(idx)
                  return uploaded ? withStoredDocument(f, uploaded.document_id) : f
                })
                return { ...m, files: updatedFiles }
              }
              return m
            }),
          )
        } catch (error) {
          console.error('Failed to upload files:', error)
          updateAssistant((message) => ({
            ...message,
            content: 'Error: Failed to upload attached files. Please try again.',
            isStreaming: false,
          }))
          setStatus('error')
          return { success: false, error: 'Failed to upload files' }
        }
      }

      const allMessages: SendChatMessage[] = [
        ...baseMessages.map((m) => ({
          role: m.role,
          content: m.content,
          files: toChatMessageFiles(m.files),
        })),
        {
          role: 'user' as const,
          content,
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        },
      ]

      let newChatId = options?.chat_id

      const handleEvent = (event: ChatStreamEvent) => {
        switch (event.type) {
          case 'chat_id':
            newChatId = event.chatId
            break
          case 'text_delta':
          case 'content_delta':
            setStatus('streaming')
            updateAssistant((m) => ({ ...m, content: m.content + event.text }))
            break
          case 'reasoning_delta':
            updateAssistant((m) => ({ ...m, reasoning: `${m.reasoning ?? ''}${event.text}` }))
            break
          case 'tool_call_start':
          case 'tool_call': {
            const id = event.tool_call_id || event.tool || `tool-${Date.now()}`
            updateAssistant((m) => {
              const tools = [...(m.tools ?? [])]
              const index = tools.findIndex((tool) => tool.id === id)
              const nextTool: ChatToolCallArtifact = {
                ...(index >= 0 ? tools[index] : { id, tool: event.tool || event.name || 'tool' }),
                id,
                tool: event.tool || event.name || 'tool',
                input: event.input,
                status: event.status ?? 'running',
              }
              if (index >= 0) tools[index] = nextTool
              else tools.push(nextTool)
              return { ...m, tools }
            })
            break
          }
          case 'tool_result': {
            const id = event.tool_call_id || event.tool || `tool-${Date.now()}`
            updateAssistant((m) => {
              const tools = [...(m.tools ?? [])]
              const index = tools.findIndex((tool) => tool.id === id)
              const nextTool: ChatToolCallArtifact = {
                ...(index >= 0 ? tools[index] : { id, tool: event.tool }),
                id,
                tool: event.tool,
                output: event.output,
                status: event.status ?? 'complete',
              }
              if (index >= 0) tools[index] = nextTool
              else tools.push(nextTool)
              return { ...m, tools }
            })
            break
          }
          case 'source_results':
            updateAssistant((m) => ({
              ...m,
              sources: [...(m.sources ?? []), ...event.results],
            }))
            break
          case 'doc_created':
          case 'doc_edited':
          case 'doc_replicated': {
            const documents = documentArtifactsFromEvent(event)
            updateAssistant((message) => ({
              ...message,
              documents: mergeDocumentArtifacts(message.documents, documents),
            }))
            break
          }
          case 'done':
            updateAssistant((m) => ({ ...m, isStreaming: false }))
            setStatus('ready')
            break
          case 'error':
            updateAssistant((message) => ({
              ...message,
              content: `Error: ${event.message}`,
              isStreaming: false,
            }))
            setStatus('error')
            break
          case 'workspace_created':
            dispatch(baseApi.util.invalidateTags([{ type: 'DriveWorkspaces', id: 'LIST' }]))
            break
          case 'project_created':
            dispatch(baseApi.util.invalidateTags([{ type: 'Projects', id: 'LIST' }]))
            break
        }
      }

      const controller = new AbortController()
      abortRef.current = () => controller.abort()

      const processId = `chat-${Date.now()}`
      processIdRef.current = processId
      dispatch(
        addProcess({
          id: processId,
          type: 'chat',
          title: 'Assistant responding...',
          status: 'running',
          chatId: options?.chat_id,
          workspaceId: options?.workspace_id || undefined,
        }),
      )

      try {
        const outcome = await streamChat({
          messages: allMessages,
          chat_id: options?.chat_id,
          session_id: options?.session_id,
          project_id: options?.project_id,
          workspace_id: options?.workspace_id,
          model: options?.model,
          historyMode: 'record',
          onEvent: handleEvent,
          onError: (error) => {
            updateAssistant((message) => ({
              ...message,
              content: `Error: ${error.message}`,
              isStreaming: false,
            }))
            setStatus('error')
            dispatch(updateProcessStatus({ id: processId, status: 'error', error: error.message }))
            processIdRef.current = null
          },
          onComplete: () => {
            refetchChats()
            if (newChatId) {
              triggerGetChat(newChatId)
            }
            dispatch(removeProcess(processId))
            processIdRef.current = null
          },
          signal: controller.signal,
        })
        if (outcome.kind !== 'success') {
          if (outcome.kind === 'aborted' || outcome.kind === 'unauthorized') {
            dispatch(removeProcess(processId))
            processIdRef.current = null
          }
          return { success: false, error: outcome.error.message }
        }
        return { success: true, chatId: newChatId }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          dispatch(removeProcess(processId))
          processIdRef.current = null
          return { success: true, chatId: newChatId }
        }
        const message = getRequestErrorMessage(error, 'Failed to send message')
        dispatch(updateProcessStatus({ id: processId, status: 'error', error: message }))
        processIdRef.current = null
        return { success: false, error: message }
      }
    },
    [currentChatMessages, dispatch, messages, refetchChats, triggerGetChat, uploadDocumentMutation],
  )

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    if (processIdRef.current) {
      dispatch(removeProcess(processIdRef.current))
      processIdRef.current = null
    }
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1]
      if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
        setStoppedMessageIds((s) => ({ ...s, [lastMsg.id]: true }))
      }
      return prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    })
    setStatus('ready')
  }, [dispatch])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const loadChatMessages = useCallback(() => {
    if (currentChatMessages.length > 0) {
      setMessages(currentChatMessages)
    }
  }, [currentChatMessages])

  return {
    sessions,
    currentChat,
    messages: messages.length > 0 ? messages : currentChatMessages,

    status,
    stoppedMessageIds,

    isLoadingChats,
    isLoadingChat,
    isCreatingChat,
    chatLoadState,

    createSession,
    createChat,
    deleteChat,
    updateChatTitle,
    generateTitle,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadChatMessages,
    refetchChats,
    refetchChat,
  }
}
