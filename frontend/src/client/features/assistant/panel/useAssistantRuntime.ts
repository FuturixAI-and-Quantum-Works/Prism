import { useEffect, useRef, useState } from 'react'
import type { ChatStreamEvent } from '@prism/protocol'
import { streamProjectChat, useGetProjectChatsQuery } from '../../projects/projectsApi'
import {
  streamWorkspaceChat,
  useGetWorkspaceChatsQuery,
} from '../../../store/api/drive/driveWorkspaceApi'
import {
  streamChat,
  useGetChatSessionsQuery,
  useLazyGetChatQuery,
  type ChatMessageFile,
} from '../../../store/api/chatApi'
import { useUploadDocumentMutation } from '../../documents/api/documentCoreApi'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  clearBackgroundChat,
  setBackgroundChatComplete,
  startBackgroundChat,
  updateBackgroundChatMessage,
} from '../../../store/slices/backgroundChatSlice'
import { addProcess, removeProcess } from '../../../store/slices/pendingProcessesSlice'
import type { StreamOutcome } from '../../../lib/sseTransport'
import type { AttachedFile } from '../composer/ChatInputConfig'
import { documentArtifactsFromEvent } from '../stream/documentArtifactModel'
import { normalizeStoredMessage } from './messageModel'
import { reducePanelMessages } from './runtimeModel'
import type {
  DisplayedDocument,
  DisplayedFile,
  HistoryChat,
  PanelChatMessage,
  WizardData,
} from './types'

interface AssistantRuntimeOptions {
  projectId?: string
  workspaceId?: string
  displayedDocument?: DisplayedDocument
  displayedFile?: DisplayedFile
  onRefetch?: () => void
}

export interface SendPanelMessage {
  text: string
  files: AttachedFile[]
  modelId: string
}

export function useAssistantRuntime({
  projectId,
  workspaceId,
  displayedDocument,
  displayedFile,
  onRefetch,
}: AssistantRuntimeOptions) {
  const dispatch = useAppDispatch()
  const [messages, setMessages] = useState<PanelChatMessage[]>([])
  const [chatId, setChatId] = useState<string>()
  const [isSending, setIsSending] = useState(false)
  const { data: workspaceChats = [], isLoading: isLoadingWorkspaceHistory } =
    useGetWorkspaceChatsQuery(workspaceId!, { skip: !workspaceId })
  const { data: projectChats = [], isLoading: isLoadingProjectHistory } = useGetProjectChatsQuery(
    projectId!,
    { skip: !projectId },
  )
  const { data: globalChatSessions = [], isLoading: isLoadingGlobalHistory } =
    useGetChatSessionsQuery(undefined, { skip: !!workspaceId || !!projectId })
  const [uploadDocument] = useUploadDocumentMutation()
  const [fetchChat] = useLazyGetChatQuery()
  const backgroundChat = useAppSelector((state) => state.backgroundChat)
  const isStreamingRef = useRef(false)
  const messagesRef = useRef<PanelChatMessage[]>([])
  const chatIdRef = useRef(chatId)
  const projectIdRef = useRef(projectId)
  const workspaceIdRef = useRef(workspaceId)
  const abortControllerRef = useRef<AbortController | null>(null)
  const processIdRef = useRef<string | null>(null)
  const restoredFromBackgroundRef = useRef(false)
  const pendingWizardDataRef = useRef<WizardData | null>(null)

  const historyChats: HistoryChat[] = (
    workspaceId
      ? workspaceChats.map((chat) => ({
          id: chat.id,
          title: chat.title,
          updatedAt: chat.updatedAt,
          createdAt: chat.createdAt,
        }))
      : projectId
        ? projectChats.map((chat) => ({
            id: chat.id,
            title: chat.title,
            updatedAt: chat.updatedAt,
            createdAt: chat.createdAt,
          }))
        : globalChatSessions.flatMap((session) =>
            (session.chats || []).map((chat) => ({
              id: chat.id,
              title: chat.title,
              updatedAt: chat.updatedAt,
              createdAt: chat.createdAt,
            })),
          )
  ).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })

  const isLoadingHistory = workspaceId
    ? isLoadingWorkspaceHistory
    : projectId
      ? isLoadingProjectHistory
      : isLoadingGlobalHistory

  useEffect(() => {
    return () => {
      if (processIdRef.current) {
        dispatch(removeProcess(processIdRef.current))
        processIdRef.current = null
      }
    }
  }, [dispatch])

  useEffect(() => {
    isStreamingRef.current = isSending
  }, [isSending])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (!backgroundChat.isActive) return
    const matchesProject = projectId && backgroundChat.projectId === projectId
    const matchesWorkspace = workspaceId && backgroundChat.workspaceId === workspaceId
    if (!matchesProject && !matchesWorkspace) return

    restoredFromBackgroundRef.current = true
    setMessages(backgroundChat.messages)
    setChatId(backgroundChat.chatId)
    dispatch(clearBackgroundChat())
  }, [
    backgroundChat.chatId,
    backgroundChat.isActive,
    backgroundChat.messages,
    backgroundChat.projectId,
    backgroundChat.workspaceId,
    dispatch,
    projectId,
    workspaceId,
  ])

  useEffect(() => {
    chatIdRef.current = chatId
  }, [chatId])

  useEffect(() => {
    projectIdRef.current = projectId
  }, [projectId])

  useEffect(() => {
    workspaceIdRef.current = workspaceId
  }, [workspaceId])

  useEffect(() => {
    return () => {
      if (!isStreamingRef.current || messagesRef.current.length === 0) return
      const userMessages = messagesRef.current.filter((message) => message.role === 'user')
      const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''
      dispatch(
        startBackgroundChat({
          messages: messagesRef.current.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          chatId: chatIdRef.current,
          projectId: projectIdRef.current,
          workspaceId: workspaceIdRef.current,
          lastUserMessage,
        }),
      )
    }
  }, [dispatch])

  useEffect(() => {
    if (restoredFromBackgroundRef.current) {
      restoredFromBackgroundRef.current = false
      return
    }
    setMessages([])
    setChatId(undefined)
  }, [projectId, workspaceId])

  const loadHistoryChat = async (selectedChatId: string) => {
    try {
      const result = await fetchChat(selectedChatId).unwrap()
      setMessages(result.messages.map(normalizeStoredMessage))
      setChatId(selectedChatId)
      return true
    } catch (error) {
      console.error('Failed to load chat:', error)
      return false
    }
  }

  const sendMessage = async ({ text, files, modelId }: SendPanelMessage) => {
    if (!text.trim() || isSending) return

    const messageText = text.trim()
    const userMessage: PanelChatMessage = {
      role: 'user',
      content: messageText,
      attachedFiles: files.length > 0 ? files : undefined,
    }
    setMessages((current) => [...current, userMessage])
    setIsSending(true)
    setMessages((current) => [...current, { role: 'assistant', content: '', isStreaming: true }])
    abortControllerRef.current = new AbortController()

    let uploadedFiles: ChatMessageFile[] = []
    if (files.length > 0) {
      try {
        const uploads: Array<Promise<{ attachmentIndex: number; file: ChatMessageFile }>> = []
        files.forEach((attachedFile, attachmentIndex) => {
          if (attachedFile.source.kind !== 'local-file') return
          const file = attachedFile.source.file
          uploads.push(
            (async () => {
              const formData = new FormData()
              formData.append('file', file)
              formData.append('attached', 'true')
              if (projectId) formData.append('project_id', projectId)
              if (workspaceId) formData.append('workspace_id', workspaceId)
              const document = await uploadDocument(formData).unwrap()
              return {
                attachmentIndex,
                file: {
                  filename: document.filename,
                  document_id: document.id,
                },
              }
            })(),
          )
        })
        const uploadResults = await Promise.all(uploads)
        const uploadsByIndex = new Map(
          uploadResults.map((upload) => [upload.attachmentIndex, upload.file]),
        )
        uploadedFiles = files.flatMap((file, index) => {
          if (file.source.kind === 'stored-document') {
            return [{ filename: file.name, document_id: file.source.documentId }]
          }
          const uploaded = uploadsByIndex.get(index)
          return uploaded ? [uploaded] : []
        })
        setMessages((current) =>
          reducePanelMessages(current, {
            type: 'record_uploads',
            messageText,
            uploads: uploadResults,
          }),
        )
      } catch (error) {
        console.error('Failed to upload files:', error)
        setMessages((current) =>
          reducePanelMessages(current, {
            type: 'set_error',
            content: 'Error: Failed to upload attached files. Please try again.',
          }),
        )
        setIsSending(false)
        return
      }
    }

    const processId = `chat-panel-${Date.now()}`
    processIdRef.current = processId
    dispatch(
      addProcess({
        id: processId,
        type: 'chat',
        title: 'Assistant responding...',
        status: 'running',
        workspaceId: workspaceId || undefined,
      }),
    )

    const handleEvent = (event: ChatStreamEvent) => {
      switch (event.type) {
        case 'chat_id':
          setChatId(event.chatId)
          break
        case 'text_delta':
        case 'content_delta':
          setMessages((current) =>
            reducePanelMessages(current, {
              type: 'append_text',
              text: event.text,
              pendingWizard: pendingWizardDataRef.current,
            }),
          )
          if (backgroundChat.isActive) dispatch(updateBackgroundChatMessage(event.text))
          break
        case 'reasoning_delta':
          setMessages((current) =>
            reducePanelMessages(current, { type: 'append_reasoning', text: event.text }),
          )
          break
        case 'tool_call':
        case 'tool_call_start': {
          setMessages((current) =>
            reducePanelMessages(current, {
              type: 'append_tool',
              tool: {
                id: event.tool_call_id || `tool-${Date.now()}`,
                tool: event.tool,
                input: event.input,
                status: 'running',
              },
            }),
          )
          break
        }
        case 'tool_result': {
          setMessages((current) =>
            reducePanelMessages(current, {
              type: 'complete_tool',
              toolId: event.tool_call_id,
              output: event.output,
            }),
          )
          break
        }
        case 'source_results': {
          setMessages((current) =>
            reducePanelMessages(current, {
              type: 'append_sources',
              sources: event.results,
            }),
          )
          break
        }
        case 'doc_created':
        case 'doc_edited':
        case 'doc_replicated': {
          setMessages((current) =>
            reducePanelMessages(current, {
              type: 'append_documents',
              documents: documentArtifactsFromEvent(event),
            }),
          )
          break
        }
        case 'error':
          setMessages((current) =>
            reducePanelMessages(current, {
              type: 'set_error',
              content: `Error: ${event.message}`,
            }),
          )
          break
        case 'template_wizard_start': {
          const wizardData: WizardData = {
            template_id: event.template_id,
            template_name: event.template_name,
            fields: event.fields,
          }
          pendingWizardDataRef.current = wizardData
          setMessages((current) =>
            reducePanelMessages(current, { type: 'start_wizard', wizard: wizardData }),
          )
          break
        }
        case 'done':
          pendingWizardDataRef.current = null
          setMessages((current) => reducePanelMessages(current, { type: 'finish_stream' }))
          onRefetch?.()
          break
      }
    }

    const handleError = (error: Error) => {
      console.error('Stream error:', error)
      const errorMessage = error.message?.trim()
      const content = errorMessage
        ? errorMessage.startsWith('Error:')
          ? errorMessage
          : `Error: ${errorMessage}`
        : 'Sorry, I encountered an error. Please try again.'
      setMessages((current) => reducePanelMessages(current, { type: 'set_error', content }))
    }

    let streamSucceeded = false
    try {
      let outcome: StreamOutcome
      if (projectId) {
        outcome = await streamProjectChat({
          projectId,
          messages: [...messages, userMessage],
          chat_id: chatId,
          model: modelId,
          displayed_doc: displayedDocument,
          attached_documents: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          onEvent: handleEvent,
          onError: handleError,
          signal: abortControllerRef.current.signal,
        })
      } else if (workspaceId) {
        outcome = await streamWorkspaceChat({
          workspaceId,
          messages: [...messages, userMessage],
          chat_id: chatId,
          model: modelId,
          displayed_file: displayedFile,
          attached_files:
            uploadedFiles.length > 0
              ? uploadedFiles.map((file) => ({
                  filename: file.filename,
                  file_id: file.document_id,
                }))
              : undefined,
          onEvent: handleEvent,
          onError: handleError,
          signal: abortControllerRef.current.signal,
        })
      } else {
        outcome = await streamChat({
          messages: [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
            files:
              uploadedFiles.length > 0 && message.content === messageText
                ? uploadedFiles
                : undefined,
          })),
          chat_id: chatId,
          model: modelId,
          historyMode: 'record',
          onEvent: handleEvent,
          onError: handleError,
          signal: abortControllerRef.current.signal,
        })
      }
      if (outcome.kind !== 'success') {
        if (outcome.kind === 'aborted' || outcome.kind === 'unauthorized') {
          handleError(outcome.error)
        }
      } else {
        streamSucceeded = true
      }
      if (processIdRef.current) {
        dispatch(removeProcess(processIdRef.current))
        processIdRef.current = null
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      if (processIdRef.current) {
        dispatch(removeProcess(processIdRef.current))
        processIdRef.current = null
      }
      setMessages((current) =>
        reducePanelMessages(current, {
          type: 'set_fallback_error',
          content: 'Sorry, I encountered an error. Please try again.',
        }),
      )
    }

    setIsSending(false)
    if (backgroundChat.isActive && streamSucceeded) dispatch(setBackgroundChatComplete())
  }

  const completeWizard = (index: number) => {
    setMessages((current) => reducePanelMessages(current, { type: 'complete_wizard', index }))
  }

  const cancelWizard = (index: number) => {
    setMessages((current) => reducePanelMessages(current, { type: 'cancel_wizard', index }))
  }

  return {
    messages,
    isSending,
    historyChats,
    isLoadingHistory,
    loadHistoryChat,
    sendMessage,
    completeWizard,
    cancelWizard,
  }
}
