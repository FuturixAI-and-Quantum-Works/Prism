import type { ChatMessageFile } from '../../../store/api/chatApi'
import type {
  ChatDocumentArtifact,
  ChatSourceResultArtifact,
  ChatToolCallArtifact,
} from '../stream/artifactTypes'
import { mergeDocumentArtifacts } from '../stream/documentArtifactModel'
import type { PanelChatMessage, WizardData } from './types'

export type PanelMessageAction =
  | { type: 'append_text'; text: string; pendingWizard: WizardData | null }
  | { type: 'append_reasoning'; text: string }
  | { type: 'append_tool'; tool: ChatToolCallArtifact }
  | { type: 'complete_tool'; toolId?: string; output?: unknown }
  | { type: 'append_sources'; sources: ChatSourceResultArtifact[] }
  | { type: 'append_documents'; documents: ChatDocumentArtifact[] }
  | { type: 'set_error'; content: string }
  | { type: 'set_fallback_error'; content: string }
  | { type: 'start_wizard'; wizard: WizardData }
  | { type: 'finish_stream' }
  | { type: 'complete_wizard'; index: number }
  | { type: 'cancel_wizard'; index: number }
  | {
      type: 'record_uploads'
      messageText: string
      uploads: Array<{ attachmentIndex: number; file: ChatMessageFile }>
    }

function updateLastAssistant(
  messages: PanelChatMessage[],
  update: (message: PanelChatMessage) => PanelChatMessage,
): PanelChatMessage[] {
  const lastIndex = messages.length - 1
  const lastMessage = messages[lastIndex]
  if (!lastMessage || lastMessage.role !== 'assistant') return messages

  const next = [...messages]
  next[lastIndex] = update(lastMessage)
  return next
}

export function reducePanelMessages(
  messages: PanelChatMessage[],
  action: PanelMessageAction,
): PanelChatMessage[] {
  switch (action.type) {
    case 'append_text':
      return updateLastAssistant(messages, (message) => ({
        ...message,
        content: (message.content || '') + action.text,
        wizardData: message.wizardData || action.pendingWizard || undefined,
      }))
    case 'append_reasoning':
      return updateLastAssistant(messages, (message) => ({
        ...message,
        reasoning: (message.reasoning || '') + action.text,
      }))
    case 'append_tool':
      return updateLastAssistant(messages, (message) => ({
        ...message,
        tools: [...(message.tools || []), action.tool],
      }))
    case 'complete_tool':
      return updateLastAssistant(messages, (message) => {
        if (!message.tools) return message
        return {
          ...message,
          tools: message.tools.map((tool) =>
            tool.id === action.toolId
              ? { ...tool, output: action.output, status: 'complete' }
              : tool,
          ),
        }
      })
    case 'append_sources':
      return updateLastAssistant(messages, (message) => ({
        ...message,
        sources: [...(message.sources || []), ...action.sources],
      }))
    case 'append_documents':
      return updateLastAssistant(messages, (message) => ({
        ...message,
        documents: mergeDocumentArtifacts(message.documents, action.documents),
      }))
    case 'set_error':
      return updateLastAssistant(messages, (message) => ({
        ...message,
        content: action.content,
        isStreaming: false,
      }))
    case 'set_fallback_error':
      return updateLastAssistant(messages, (message) =>
        message.content ? message : { ...message, content: action.content },
      )
    case 'start_wizard': {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'assistant') {
        return updateLastAssistant(messages, (message) => ({
          ...message,
          wizardData: action.wizard,
        }))
      }
      return [
        ...messages,
        { role: 'assistant', content: '', wizardData: action.wizard, isStreaming: true },
      ]
    }
    case 'finish_stream':
      return updateLastAssistant(messages, (message) => ({
        ...message,
        isStreaming: false,
      }))
    case 'complete_wizard':
      return messages.map((message, index) =>
        index === action.index && message.wizardData
          ? {
              ...message,
              wizardData: { ...message.wizardData, completed: true },
            }
          : message,
      )
    case 'cancel_wizard':
      return messages.filter((_, index) => index !== action.index)
    case 'record_uploads':
      return messages.map((message) => {
        if (
          message.role !== 'user' ||
          message.content !== action.messageText ||
          !message.attachedFiles
        ) {
          return message
        }
        return {
          ...message,
          attachedFiles: message.attachedFiles.map((file, index) => {
            const uploaded = action.uploads.find((upload) => upload.attachmentIndex === index)?.file
            return uploaded
              ? {
                  ...file,
                  id: uploaded.document_id,
                  source: { kind: 'stored-document', documentId: uploaded.document_id },
                }
              : file
          }),
        }
      })
  }
}
