import type {
  TabularGenerateEvent,
  TabularReview,
  TabularReviewCell,
} from '../../store/api/tabularReviewApi'
import type { Document, Project } from '../../store/types'

export const reviewFontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export type ColumnFormat =
  'text' | 'bulleted_list' | 'number' | 'currency' | 'yes_no' | 'date' | 'tag' | 'percentage'
export type CellStatus = 'pending' | 'generating' | 'done' | 'error'
export type FlagColor = 'green' | 'grey' | 'yellow' | 'red'

export interface ColumnConfig {
  id: string
  index: number
  name: string
  prompt: string
  format: ColumnFormat
  tags?: string[]
  width: number
}

export interface TabularCell {
  id: string
  documentId: string
  columnIndex: number
  content: {
    summary: string
    flag?: FlagColor
    reasoning?: string
  } | null
  status: CellStatus
}

export interface ReviewDocument {
  id: string
  name: string
  type: 'folder' | 'pdf' | 'word' | 'image' | 'other'
  date: string
  path?: string[]
  extension?: string | null
  createdAt?: string | null
}

export const FORMAT_OPTIONS: { value: ColumnFormat; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'bulleted_list', label: 'Bulleted List' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'tag', label: 'Tag' },
  { value: 'percentage', label: 'Percentage' },
]

export const TAG_COLORS: { backgroundColor: string; color: string }[] = [
  { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  { backgroundColor: '#D1FAE5', color: '#065F46' },
  { backgroundColor: '#FEF3C7', color: '#92400E' },
  { backgroundColor: '#FCE7F3', color: '#9D174D' },
  { backgroundColor: '#E0E7FF', color: '#3730A3' },
  { backgroundColor: '#FFEDD5', color: '#9A3412' },
]

export const FLAG_STYLES: Record<FlagColor, string> = {
  green: '#22C55E',
  grey: '#9CA3AF',
  yellow: '#F59E0B',
  red: '#EF4444',
}

export const COLUMN_PRESETS: Array<{ name: string; prompt: string; format: ColumnFormat }> = [
  {
    name: 'Parties',
    prompt:
      'Identify all parties to this agreement, including their full legal names and roles (e.g., Buyer, Seller, Licensor, Licensee).',
    format: 'text',
  },
  {
    name: 'Effective Date',
    prompt: 'Extract the effective date or commencement date of this agreement.',
    format: 'date',
  },
  {
    name: 'Term',
    prompt: 'What is the term or duration of this agreement? Include any renewal provisions.',
    format: 'text',
  },
  {
    name: 'Termination',
    prompt:
      'Summarize the termination provisions. Under what circumstances can each party terminate?',
    format: 'bulleted_list',
  },
  {
    name: 'Confidentiality',
    prompt:
      'Does this agreement contain confidentiality obligations? If yes, summarize the key provisions.',
    format: 'yes_no',
  },
  {
    name: 'Governing Law',
    prompt: 'What is the governing law and jurisdiction for this agreement?',
    format: 'text',
  },
  {
    name: 'Indemnification',
    prompt: 'Summarize any indemnification provisions in this agreement.',
    format: 'text',
  },
  {
    name: 'Limitation of Liability',
    prompt: 'Are there any limitations of liability? If so, describe them.',
    format: 'text',
  },
]

export function getFileTypeFromName(name: string): 'folder' | 'pdf' | 'word' | 'image' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext || name.indexOf('.') === -1) return 'folder'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  return 'other'
}

export function formatDate(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export function reviewTitle(review?: Pick<TabularReview, 'title' | 'createdAt'> | null) {
  return (
    review?.title?.trim() ||
    `Tabular review ${review?.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}`.trim()
  )
}

export function projectLabel(projects: Project[], projectId?: string | null) {
  if (!projectId) return 'No project'
  return projects.find((project) => project.id === projectId)?.name || 'Project'
}

export function normalizeColumns(raw: unknown): ColumnConfig[] {
  const items = Array.isArray(raw) ? raw : []
  return items.map((item, idx) => {
    const record = item !== null && typeof item === 'object' ? item : {}
    const rawIndex = Reflect.get(record, 'index')
    const rawId = Reflect.get(record, 'id')
    const rawName = Reflect.get(record, 'name')
    const rawPrompt = Reflect.get(record, 'prompt')
    const rawFormat = Reflect.get(record, 'format')
    const rawTags = Reflect.get(record, 'tags')
    const rawWidth = Reflect.get(record, 'width')
    const index = typeof rawIndex === 'number' ? rawIndex : idx
    const format = FORMAT_OPTIONS.find(({ value }) => value === rawFormat)?.value ?? 'text'
    return {
      id: typeof rawId === 'string' && rawId ? rawId : `col-${index}`,
      index,
      name: typeof rawName === 'string' && rawName ? rawName : `Column ${index + 1}`,
      prompt: typeof rawPrompt === 'string' ? rawPrompt : '',
      format,
      tags:
        Array.isArray(rawTags) && rawTags.every((tag) => typeof tag === 'string')
          ? rawTags
          : undefined,
      width: typeof rawWidth === 'number' && rawWidth ? rawWidth : 250,
    }
  })
}

export function normalizeCellContent(
  content: TabularReviewCell['content'],
): TabularCell['content'] {
  if (!content) return null

  return {
    summary: content.summary || '',
    flag: content.flag,
    reasoning: content.reasoning,
  }
}

export function toApiColumns(columns: ColumnConfig[]) {
  return [...columns]
    .sort((a, b) => a.index - b.index)
    .map((column, index) => ({
      id: column.id,
      index,
      name: column.name,
      prompt: column.prompt,
      format: column.format,
      tags: column.tags,
      width: column.width,
    }))
}

export function mapDocument(
  doc:
    | Document
    | {
        id: string
        filename: string
        fileType?: string | null
        file_type?: string | null
        createdAt?: string
        created_at?: string
      },
): ReviewDocument {
  const dateValue =
    'created_at' in doc ? doc.created_at : 'createdAt' in doc ? doc.createdAt : undefined
  const fileType = 'file_type' in doc ? doc.file_type : 'fileType' in doc ? doc.fileType : undefined
  return {
    id: doc.id,
    name: doc.filename,
    type: fileType ? getFileTypeFromName(`file.${fileType}`) : getFileTypeFromName(doc.filename),
    date: dateValue ? formatDate(new Date(dateValue)) : '',
    extension: fileType,
    createdAt: dateValue ?? null,
  }
}

export function mapCell(cell: TabularReviewCell): TabularCell {
  return {
    id: cell.id,
    documentId: cell.documentId,
    columnIndex: cell.columnIndex,
    content: normalizeCellContent(cell.content),
    status: cell.status,
  }
}

export function applyTabularGenerateEvent(cells: TabularCell[], event: TabularGenerateEvent) {
  if (event.type !== 'cell_update') return cells
  return cells.map((cell) =>
    cell.documentId === event.document_id && cell.columnIndex === event.column_index
      ? { ...cell, status: event.status, content: normalizeCellContent(event.content) }
      : cell,
  )
}

export function makePendingCells(
  reviewId: string,
  docs: ReviewDocument[],
  cols: ColumnConfig[],
): TabularCell[] {
  return docs.flatMap((doc) =>
    cols.map((col) => ({
      id: `pending-${reviewId}-${doc.id}-${col.index}`,
      documentId: doc.id,
      columnIndex: col.index,
      content: null,
      status: 'pending' as const,
    })),
  )
}
