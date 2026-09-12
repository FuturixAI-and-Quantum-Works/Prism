import { useEffect, useRef, useState } from 'react'
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'

export type ChatComposerKeyEvent = {
  key: string
  shiftKey: boolean
  preventDefault: () => void
}

export interface ChatComposerProps {
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  handleSendMessage: (input?: string) => Promise<void>
  inputText: string
  isAnimating: boolean
  isSending: boolean
  isStreaming: boolean
  placeholderIndex: number
  setInputText: Dispatch<SetStateAction<string>>
}

interface UseChatComposerOptions {
  isSending: boolean
  messages: readonly unknown[]
  send: (message: string) => Promise<void>
}

export function resolveComposerMessage(inputText: string, fallback = '') {
  return inputText.trim() || fallback.trim()
}

export function getComposerStatusText(isSending: boolean, isStreaming: boolean) {
  if (isStreaming) return 'Assistant is responding'
  if (isSending) return 'Sending message'
  return ''
}

export function useChatComposer({ isSending, messages, send }: UseChatComposerOptions) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (input = '') => {
    const messageText = resolveComposerMessage(inputText, input)
    if (!messageText || isSending) return
    setInputText('')
    await send(messageText)
  }

  const handleKeyDown = (event: ChatComposerKeyEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return {
    handleKeyDown,
    handleSendMessage,
    inputText,
    messagesEndRef,
    setInputText,
  }
}
