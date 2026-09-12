import type { ChatMessageFile, StoredChatMessage } from '../store/api/chatApi'
import type { AttachedFile } from '../features/assistant/composer/ChatInputConfig'
import type {
  ChatDocumentArtifact,
  ChatSourceResultArtifact,
  ChatToolCallArtifact,
} from '../features/assistant/stream/artifactTypes'
import {
  normalizeStoredAssistantContent,
  storedAttachments,
  storedMessageText,
} from '../lib/storedMessages'

export interface LocalChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  tools?: ChatToolCallArtifact[]
  sources?: ChatSourceResultArtifact[]
  documents?: ChatDocumentArtifact[]
  files?: AttachedFile[]
  isStreaming?: boolean
  createdAt: string
}

export function withStoredDocument(file: AttachedFile, documentId: string): AttachedFile {
  return {
    ...file,
    source: { kind: 'stored-document', documentId },
  }
}

export function toChatMessageFiles(
  files: AttachedFile[] | undefined,
): ChatMessageFile[] | undefined {
  const storedFiles = files?.flatMap((file) =>
    file.source.kind === 'stored-document'
      ? [{ filename: file.name, document_id: file.source.documentId }]
      : [],
  )
  return storedFiles?.length ? storedFiles : undefined
}

export function normalizeStoredMessage(message: StoredChatMessage): LocalChatMessage {
  const base: LocalChatMessage = {
    id: message.id,
    role: message.role,
    content: '',
    createdAt: message.createdAt,
  }

  if (message.role === 'user') {
    return {
      ...base,
      content: storedMessageText(message.content),
      files: storedAttachments(message.files),
    }
  }

  return { ...base, ...normalizeStoredAssistantContent(message.content, message.createdAt) }
}
