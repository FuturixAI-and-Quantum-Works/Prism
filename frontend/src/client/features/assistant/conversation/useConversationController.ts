import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { AttachedFile } from '../composer/ChatInputConfig'
import { usePromptImprovement } from '../composer/usePromptImprovement'
import { useResponsive } from '../../../hooks'
import { useChat } from '../../../hooks/useChat'
import { getRequestErrorMessage } from '../../../lib/requestErrors'
import { useCreateTemplateMutation, useGetTemplatesQuery } from '../../templates/templatesApi'
import type { CreateTemplateRequest } from '../../templates/templatesApi'
import type { ChatInputRef } from '../composer/ChatInput'
import { buildConversationHistory, type ConversationHistoryItem } from '../history/historyModel'
import {
  isImageAttachment,
  toConversationMessages,
  type ConversationTab,
} from './conversationModel'

export interface ConversationControllerOptions {
  onBack?: () => void
  initialMessage?: string
  initialFile?: AttachedFile | null
  initialFiles?: AttachedFile[]
  chatId?: string | null
  onChatNotFound?: () => void
}

export function useConversationController({
  onBack,
  initialMessage,
  initialFile,
  initialFiles,
  chatId,
  onChatNotFound,
}: ConversationControllerOptions) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null)
  const [inputText, setInputText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(initialFiles || [])
  const [pendingFiles, setPendingFiles] = useState<AttachedFile[]>([])
  const [chatError, setChatError] = useState<string | null>(null)
  const { improvePrompt: handleImprovePrompt, isImprovingPrompt } = usePromptImprovement()
  const { isMobile } = useResponsive()
  const {
    sessions,
    messages: chatMessages,
    isLoadingChats,
    status,
    stoppedMessageIds,
    sendMessage,
    clearMessages,
    createSession,
    chatLoadState,
  } = useChat(currentChatId || undefined)

  useEffect(() => {
    if (chatLoadState.kind === 'unavailable' && currentChatId) {
      setCurrentChatId(null)
      onChatNotFound?.()
    }
  }, [chatLoadState.kind, currentChatId, onChatNotFound])

  const isLoading = status === 'streaming' || status === 'submitted'
  const historyItems = useMemo(() => buildConversationHistory(sessions), [sessions])
  const messages = toConversationMessages(chatMessages, stoppedMessageIds)
  const [activeTab, setActiveTab] = useState<ConversationTab>('history')
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [newTemplateModalOpen, setNewTemplateModalOpen] = useState(false)
  const [templateError, setTemplateError] = useState('')
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetTemplatesQuery({
    type: 'user',
  })
  const [createTemplate, { isLoading: isCreatingTemplate }] = useCreateTemplateMutation()

  const filteredTemplates = useMemo(() => {
    if (!templatesData) return []
    if (!sidebarSearch.trim()) return templatesData
    const query = sidebarSearch.toLowerCase()
    return templatesData.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query),
    )
  }, [templatesData, sidebarSearch])

  const filteredHistoryItems = useMemo(() => {
    if (!sidebarSearch.trim()) return historyItems
    const query = sidebarSearch.toLowerCase()
    return historyItems.filter((item) => item.title.toLowerCase().includes(query))
  }, [historyItems, sidebarSearch])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputRef>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)
  const sendMessageRef = useRef(sendMessage)

  useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  useEffect(() => {
    const nextChatId = chatId || null
    setCurrentChatId(nextChatId)
    setSelectedHistoryId(nextChatId)
    if (nextChatId) setActiveTab('history')
    clearMessages()
  }, [chatId, clearMessages])

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setAttachedFiles(initialFiles)
    }
  }, [initialFiles])

  useEffect(() => {
    if (initialFile) {
      setAttachedFiles((previous) => {
        if (previous.some((file) => file.id === initialFile.id)) return previous
        return [initialFile]
      })
    }
  }, [initialFile])

  useEffect(() => {
    if (initialMessage) {
      setChatError(null)
      const filesToSend =
        initialFiles && initialFiles.length > 0 ? initialFiles : initialFile ? [initialFile] : []
      sendMessageRef
        .current(initialMessage, {
          chat_id: undefined,
          files: filesToSend.length > 0 ? filesToSend : undefined,
        })
        .then((result) => {
          if (result.success && result.chatId) {
            setCurrentChatId(result.chatId)
            setSelectedHistoryId(result.chatId)
            setActiveTab('history')
            localStorage.setItem('prism_dashboard_active_chat', result.chatId)
          } else if (!result.success) {
            setChatError(result.error || 'Failed to send message. Please try again.')
          }
        })
    }
  }, [initialMessage, initialFile, initialFiles])

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const newFiles: AttachedFile[] = Array.from(files).map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name: file.name,
        size: file.size,
        type:
          file.type ||
          (isImageAttachment(file)
            ? `image/${file.name.split('.').pop()?.toLowerCase() || ''}`
            : 'application/octet-stream'),
        source: { kind: 'local-file', file },
        previewUrl: isImageAttachment(file) ? URL.createObjectURL(file) : null,
      }))
      setPendingFiles((previous) => [...previous, ...newFiles])
    }
    event.target.value = ''
  }

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return

    const text = inputText
    const filesToSend = pendingFiles.length > 0 ? [...pendingFiles] : undefined
    setInputText('')
    setPendingFiles([])
    setChatError(null)

    const sessionId = !currentChatId
      ? localStorage.getItem('prism_dashboard_active_session')
      : undefined
    const result = await sendMessage(text, {
      chat_id: currentChatId || undefined,
      session_id: sessionId || undefined,
      files: filesToSend,
    })
    if (result.success && result.chatId) {
      setCurrentChatId(result.chatId)
      setSelectedHistoryId(result.chatId)
      setActiveTab('history')
      localStorage.setItem('prism_dashboard_active_chat', result.chatId)
    } else if (!result.success) {
      setChatError(result.error || 'Failed to send message. Please try again.')
    }
  }

  const handleHistoryClick = (item: ConversationHistoryItem) => {
    setActiveTab('history')
    setSelectedHistoryId(item.id)
    setCurrentChatId(item.id)
    clearMessages()
    setChatError(null)
    localStorage.setItem('prism_dashboard_active_chat', item.id)
  }

  const handleNewChat = async () => {
    setActiveTab('new')
    setSelectedHistoryId(null)
    setCurrentChatId(null)
    clearMessages()
    setInputText('')
    setPendingFiles([])
    setChatError(null)
    localStorage.removeItem('prism_dashboard_active_chat')
    localStorage.removeItem('prism_dashboard_active_session')

    const result = await createSession()
    if (result.success && result.sessionId) {
      localStorage.setItem('prism_dashboard_active_session', result.sessionId)
    }
  }

  const handleBackToDashboard = () => {
    localStorage.removeItem('prism_dashboard_active_chat')
    onBack?.()
  }

  const handleRemovePendingFile = (fileId: string) => {
    setPendingFiles((previous) => {
      const fileToRemove = previous.find((file) => file.id === fileId)
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }
      return previous.filter((file) => file.id !== fileId)
    })
  }

  const handleFileDrop = (file: AttachedFile) => {
    if (file.source.kind === 'local-file' && !file.previewUrl) {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      const isImage =
        file.source.file.type.startsWith('image/') ||
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)
      if (isImage) {
        file.previewUrl = URL.createObjectURL(file.source.file)
      }
    }
    setPendingFiles((previous) => [...previous, file])
  }

  const handleCreateTemplate = async (data: CreateTemplateRequest) => {
    setTemplateError('')
    try {
      await createTemplate(data).unwrap()
      setNewTemplateModalOpen(false)
    } catch (error) {
      setTemplateError(getRequestErrorMessage(error, 'Could not create this template.'))
    }
  }

  const setTemplateModalOpen = (open: boolean) => {
    setNewTemplateModalOpen(open)
    if (!open) setTemplateError('')
  }

  return {
    activeTab,
    attachedFiles,
    chatError,
    chatInputRef,
    fileInputRef,
    filteredHistoryItems,
    filteredTemplates,
    handleBackToDashboard,
    handleCreateTemplate,
    handleFileChange,
    handleFileDrop,
    handleHistoryClick,
    handleImprovePrompt,
    handleNewChat,
    handleRemovePendingFile,
    handleSend,
    inputText,
    isCreatingTemplate,
    isImprovingPrompt,
    isLoading,
    isLoadingChats,
    isLoadingTemplates,
    isMobile,
    messages,
    messagesContainerRef,
    messagesEndRef,
    newTemplateModalOpen,
    templateError,
    pendingFiles,
    selectedHistoryId,
    setActiveTab,
    setChatError,
    setInputText,
    setNewTemplateModalOpen: setTemplateModalOpen,
    setSidebarSearch,
    sidebarSearch,
  }
}
