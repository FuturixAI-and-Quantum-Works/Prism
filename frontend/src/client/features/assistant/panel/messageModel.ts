import {
  normalizeStoredAssistantContent,
  storedAttachments,
  storedMessageText,
} from '../../../lib/storedMessages'
import type { PanelChatMessage, StoredPanelMessage } from './types'

export function normalizeStoredMessage(message: StoredPanelMessage): PanelChatMessage {
  const base: PanelChatMessage = {
    role: message.role,
    content: '',
  }

  if (message.role === 'user') {
    return {
      ...base,
      content: storedMessageText(message.content),
      attachedFiles: storedAttachments(message.files),
    }
  }

  return { ...base, ...normalizeStoredAssistantContent(message.content, message.createdAt) }
}

export function parseMessageContent(content: unknown): string {
  if (!content) return ''
  if (typeof content !== 'string') {
    try {
      return JSON.stringify(content)
    } catch {
      return ''
    }
  }

  let cleaned = content.replace(/<CITATIONS>[\s\S]*?<\/CITATIONS>/g, '')
  cleaned = cleaned.replace(/<CITATIONS>[\s\S]*$/, '')
  cleaned = cleaned.replace(/^\s*\{[\s\S]*?"type"\s*:\s*"[^"]*"[\s\S]*?\}\s*$/gm, '')
  cleaned = cleaned.replace(
    /^\s*\{[^{}]*"(doc_id|document_id|tool|action|status|filename|query|result|input|output)"[^{}]*\}\s*$/gm,
    '',
  )
  cleaned = cleaned.replace(/\{[^{}]*"(doc_id|document_id|status|action)"[^{}]*\}/g, '')
  cleaned = cleaned.replace(
    /\b(reading_doc|doc_read|doc_find|doc_created|doc_edited|doc_replicated|tool_call|tool_result)\b/gi,
    '',
  )
  cleaned = cleaned.replace(
    /^(?:📄|📝|🔍|✏️|🔧|⚙️|💾|📊|📈|🔬|📋|🧠|🌐|⚖️|🔖|✍️|📚)\s*\w+.*?(started|running|complete|finished|pending).*?[−–-]?\s*\{[^}]*\}?\s*$/gmu,
    '',
  )
  cleaned = cleaned.replace(/^\s*\[Tool:\s*\w+\].*$/gm, '')
  cleaned = cleaned.replace(/^\s*Tool call:.*$/gm, '')
  cleaned = cleaned.replace(/^\s*Tool result:.*$/gm, '')
  cleaned = cleaned.replace(
    /^(Reading|Searching|Analyzing|Processing|Creating|Editing|Extracting|Loading)\s+(document|file|content|context).*\{.*\}\s*$/gm,
    '',
  )
  cleaned = cleaned.replace(
    /^(Reading|Searching|Analyzing|Processing|Creating|Editing)\.\.\.\s*$/gm,
    '',
  )
  cleaned = cleaned.replace(/^\s*[\u005b\u007b].*[\u005d\u007d]\s*$/gm, '')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  return cleaned.trim()
}

export function isImageFile(type: string, name?: string): boolean {
  if (type?.startsWith('image/')) return true
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
}

export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
