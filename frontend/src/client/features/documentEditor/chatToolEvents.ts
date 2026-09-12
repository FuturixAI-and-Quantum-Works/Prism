import type { ChatStreamEvent } from '@prism/protocol'
import type { DocumentPlaceholderField } from '../documents/api/documentContentApi'

export interface ToolCall {
  id: string
  tool: string
  input?: unknown
  output?: unknown
  status?: string
}

export interface CompareDocumentsToolState {
  status: 'loading' | 'complete' | 'error'
  docA: { id: string; filename: string }
  docB: { id: string; filename: string }
  summary: { added: number; removed: number; modified: number }
  differences: Array<{
    type: 'added' | 'removed' | 'modified'
    lineNumber: number
    before?: string
    after?: string
    text?: string
  }>
  message?: string
}

export interface ExtractedClause {
  type: string
  title: string
  content: string
  location: string
  keyTerms: string[]
}

export interface ExtractClausesToolState {
  status: 'loading' | 'complete' | 'error'
  docId: string
  filename: string
  clauses: ExtractedClause[]
  message?: string
}

export interface EditSuggestion {
  id: string
  find: string
  replace: string
  reason: string
  category: string
  priority: string
}

export interface SuggestEditToolState {
  status: 'pending' | 'error'
  docId: string
  filename: string
  suggestions: EditSuggestion[]
  message?: string
}

export type ToolPresentationUpdate =
  | { kind: 'compare'; value: CompareDocumentsToolState }
  | { kind: 'clauses'; value: ExtractClausesToolState }
  | { kind: 'suggestions'; value: SuggestEditToolState }
  | { kind: 'placeholders'; fields: DocumentPlaceholderField[]; values: Record<string, string> }
  | { kind: 'none' }

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function number(value: unknown) {
  return typeof value === 'number' ? value : 0
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
}

function differences(value: unknown): CompareDocumentsToolState['differences'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = record(item)
    if (
      !row ||
      (row.type !== 'added' && row.type !== 'removed' && row.type !== 'modified') ||
      typeof row.lineNumber !== 'number'
    ) {
      return []
    }
    return [
      {
        type: row.type,
        lineNumber: row.lineNumber,
        ...(typeof row.before === 'string' ? { before: row.before } : {}),
        ...(typeof row.after === 'string' ? { after: row.after } : {}),
        ...(typeof row.text === 'string' ? { text: row.text } : {}),
      },
    ]
  })
}

function clauses(value: unknown): ExtractedClause[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = record(item)
    if (
      !row ||
      typeof row.type !== 'string' ||
      typeof row.title !== 'string' ||
      typeof row.content !== 'string' ||
      typeof row.location !== 'string'
    ) {
      return []
    }
    return [
      {
        type: row.type,
        title: row.title,
        content: row.content,
        location: row.location,
        keyTerms: stringArray(row.keyTerms),
      },
    ]
  })
}

function suggestions(value: unknown): EditSuggestion[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = record(item)
    if (
      !row ||
      typeof row.id !== 'string' ||
      typeof row.find !== 'string' ||
      typeof row.replace !== 'string' ||
      typeof row.reason !== 'string' ||
      typeof row.category !== 'string' ||
      typeof row.priority !== 'string'
    ) {
      return []
    }
    return [
      {
        id: row.id,
        find: row.find,
        replace: row.replace,
        reason: row.reason,
        category: row.category,
        priority: row.priority,
      },
    ]
  })
}

function placeholderFields(value: unknown): DocumentPlaceholderField[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = record(item)
    if (
      !row ||
      typeof row.key !== 'string' ||
      typeof row.label !== 'string' ||
      (row.type !== 'text' &&
        row.type !== 'textarea' &&
        row.type !== 'date' &&
        row.type !== 'number') ||
      typeof row.required !== 'boolean' ||
      typeof row.occurrences !== 'number' ||
      (typeof row.value !== 'string' && row.value !== null)
    ) {
      return []
    }
    return [
      {
        key: row.key,
        label: row.label,
        type: row.type,
        required: row.required,
        occurrences: row.occurrences,
        value: row.value,
      },
    ]
  })
}

export function updateToolCalls(
  previous: ReadonlyMap<string, ToolCall>,
  event: ChatStreamEvent,
): Map<string, ToolCall> {
  if (
    event.type !== 'tool_call_start' &&
    event.type !== 'tool_call' &&
    event.type !== 'tool_result'
  ) {
    return new Map(previous)
  }

  const updated = new Map(previous)
  const id =
    event.tool_call_id ||
    event.tool ||
    ('name' in event ? event.name : undefined) ||
    `tool-${Date.now()}`
  const existing = updated.get(id)

  if (event.type === 'tool_result') {
    updated.set(id, {
      id,
      tool: event.tool,
      input: existing?.input,
      output: event.output,
      status: event.status ?? 'complete',
    })
    return updated
  }

  updated.set(id, {
    id,
    tool: event.tool || event.name || 'tool',
    input: event.input,
    output: existing?.output,
    status: event.status ?? existing?.status ?? 'running',
  })
  return updated
}

export function parseToolResult(tool: string, output: unknown): ToolPresentationUpdate {
  const value = record(output)
  if (!value) return { kind: 'none' }

  if (tool === 'compare_documents') {
    const docA = record(value.doc_a)
    const docB = record(value.doc_b)
    const summary = record(value.summary)
    const parsedDifferences = differences(value.differences)
    if (value.ok && docA && docB) {
      return {
        kind: 'compare',
        value: {
          status: 'complete',
          docA: { id: text(docA.doc_id), filename: text(docA.filename) },
          docB: { id: text(docB.doc_id), filename: text(docB.filename) },
          summary: {
            added: number(summary?.added),
            removed: number(summary?.removed),
            modified: number(summary?.modified),
          },
          differences: parsedDifferences,
        },
      }
    }
    return {
      kind: 'compare',
      value: {
        status: 'error',
        docA: { id: '', filename: '' },
        docB: { id: '', filename: '' },
        summary: { added: 0, removed: 0, modified: 0 },
        differences: [],
        message: text(value.error) || 'Comparison failed',
      },
    }
  }

  if (tool === 'extract_clauses') {
    return {
      kind: 'clauses',
      value: value.ok
        ? {
            status: 'complete',
            docId: text(value.doc_id),
            filename: text(value.filename),
            clauses: clauses(value.clauses),
          }
        : {
            status: 'error',
            docId: '',
            filename: '',
            clauses: [],
            message: text(value.error) || 'Clause extraction failed',
          },
    }
  }

  if (tool === 'suggest_edit') {
    return {
      kind: 'suggestions',
      value: value.ok
        ? {
            status: 'pending',
            docId: text(value.doc_id),
            filename: text(value.filename),
            suggestions: suggestions(value.suggestions),
          }
        : {
            status: 'error',
            docId: '',
            filename: '',
            suggestions: [],
            message: text(value.error) || 'Suggestion failed',
          },
    }
  }

  if (tool === 'extract_placeholders' && value.ok && Array.isArray(value.fields)) {
    const fields = placeholderFields(value.fields)
    return {
      kind: 'placeholders',
      fields,
      values: Object.fromEntries(fields.map((field) => [field.key, field.value ?? ''])),
    }
  }

  return { kind: 'none' }
}
