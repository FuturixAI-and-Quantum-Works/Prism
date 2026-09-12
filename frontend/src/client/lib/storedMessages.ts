import type { AttachedFile } from '../features/assistant/composer/ChatInputConfig'
import type { ChatDocumentArtifact } from '../features/assistant/stream/artifactTypes'
import {
  documentArtifactsFromEvent,
  mergeDocumentArtifacts,
} from '../features/assistant/stream/documentArtifactModel'

type StoredFile = {
  filename: string
  document_id: string
}

export function storedMessageText(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function fileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    txt: 'text/plain',
  }
  return mimeTypes[extension] || 'application/octet-stream'
}

export function storedAttachments(
  files: readonly StoredFile[] | null | undefined,
): AttachedFile[] | undefined {
  if (!files?.length) return undefined
  return files.map((file) => ({
    id: file.document_id,
    name: file.filename,
    size: 0,
    type: fileType(file.filename),
    source: { kind: 'stored-document', documentId: file.document_id },
  }))
}

function parseEvents(content: unknown): unknown[] | null {
  if (Array.isArray(content)) return content
  if (typeof content !== 'string') return null
  const trimmed = content.trim()
  if (!trimmed.startsWith('[')) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function eventString(event: object, key: string): string | undefined {
  const value = Reflect.get(event, key)
  return typeof value === 'string' ? value : undefined
}

function eventSummary(event: object): string | null {
  const type = eventString(event, 'type')
  const filename = storedMessageText(Reflect.get(event, 'filename'))
  switch (type) {
    case 'doc_read':
      return filename ? `Read ${filename}.` : 'Read a document.'
    case 'doc_find': {
      const query = eventString(event, 'query')
      return filename
        ? `Searched ${filename}${query ? ` for "${query}"` : ''}.`
        : 'Searched document history.'
    }
    case 'doc_created':
      return filename ? `Created ${filename}.` : 'Created a document.'
    case 'doc_replicated':
      return filename ? `Replicated ${filename}.` : 'Replicated a document.'
    case 'doc_edited':
      return filename ? `Edited ${filename}.` : 'Edited a document.'
    case 'workflow_applied': {
      const title = eventString(event, 'title')
      return title ? `Applied workflow: ${title}.` : 'Applied a workflow.'
    }
    default:
      return null
  }
}

function documentEventSummary(
  event: object,
  artifacts: readonly ChatDocumentArtifact[],
): string | null {
  const type = eventString(event, 'type')
  const filename = eventString(event, 'filename') || 'the document'
  const failure = artifacts.find((artifact) => artifact.status === 'failed')
  if (failure) {
    const progress =
      failure.expectedCount !== undefined
        ? ` (${failure.completedCount ?? 0} of ${failure.expectedCount} copies completed)`
        : ''
    const operation =
      type === 'doc_created' ? 'create' : type === 'doc_edited' ? 'edit' : 'replicate'
    return `Failed to ${operation} ${filename}${progress}: ${failure.error}`
  }

  if (type === 'doc_replicated' && artifacts.length > 1) {
    return `Replicated ${artifacts.length} copies of ${filename}.`
  }
  return eventSummary(event)
}

export function normalizeStoredAssistantContent(
  content: unknown,
  createdAt?: string,
): {
  content: string
  reasoning?: string
  documents?: ChatDocumentArtifact[]
} {
  const events = parseEvents(content)
  if (!events) return { content: storedMessageText(content) }

  const textParts: string[] = []
  const reasoningParts: string[] = []
  const summaries: string[] = []
  let documents: ChatDocumentArtifact[] = []

  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) continue
    const type = eventString(event, 'type')
    const text = eventString(event, 'text')
    if (type === 'content' && text !== undefined) {
      textParts.push(text)
      continue
    }
    if (type === 'reasoning' && text !== undefined) {
      reasoningParts.push(text)
      continue
    }
    if (type === 'doc_created' || type === 'doc_edited' || type === 'doc_replicated') {
      const artifacts = documentArtifactsFromEvent(event, createdAt)
      documents = mergeDocumentArtifacts(documents, artifacts)
      const summary = documentEventSummary(event, artifacts)
      if (summary) summaries.push(summary)
      continue
    }
    const summary = eventSummary(event)
    if (summary) summaries.push(summary)
  }

  return {
    content: textParts.join('').trim() || summaries.join('\n') || storedMessageText(content),
    reasoning: reasoningParts.join('').trim() || undefined,
    documents: documents.length ? documents : undefined,
  }
}
