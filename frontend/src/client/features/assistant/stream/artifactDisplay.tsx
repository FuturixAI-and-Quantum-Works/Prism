import type { ReactNode } from 'react'
import doc from '../../../assets/file-types/docx.png'

export interface FileTypeConfig {
  icon: ReactNode
  color: string
  bgColor: string
  label: string
  shortLabel: string
}

const getFileExtension = (filename: string): string => {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

export const getFileTypeConfig = (filename: string): FileTypeConfig => {
  const ext = getFileExtension(filename)
  switch (ext) {
    case 'pdf':
      return {
        icon: 'PDF',
        color: '#DC2626',
        bgColor: '#FEE2E2',
        label: 'PDF Document',
        shortLabel: 'PDF',
      }
    case 'doc':
    case 'docx':
      return {
        icon: <img src={doc} alt="DOC" />,
        color: '#2563EB',
        bgColor: '#FFFFFF',
        label: 'Word Document',
        shortLabel: 'DOC',
      }
    case 'xls':
    case 'xlsx':
      return {
        icon: 'XLS',
        color: '#16A34A',
        bgColor: '#DCFCE7',
        label: 'Excel Spreadsheet',
        shortLabel: 'XLS',
      }
    case 'ppt':
    case 'pptx':
      return {
        icon: 'PPT',
        color: '#EA580C',
        bgColor: '#FFEDD5',
        label: 'PowerPoint',
        shortLabel: 'PPT',
      }
    case 'txt':
      return {
        icon: 'TXT',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        label: 'Text File',
        shortLabel: 'TXT',
      }
    case 'md':
      return {
        icon: 'MD',
        color: '#7C3AED',
        bgColor: '#EDE9FE',
        label: 'Markdown',
        shortLabel: 'MD',
      }
    case 'json':
      return {
        icon: 'JSON',
        color: '#CA8A04',
        bgColor: '#FEF9C3',
        label: 'JSON File',
        shortLabel: 'JSON',
      }
    default:
      return {
        icon: 'DOC',
        color: '#7C3AED',
        bgColor: '#EDE9FE',
        label: 'Document',
        shortLabel: 'DOC',
      }
  }
}

export const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return 'Just now'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes === 1) return '1 min ago'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fieldLabels: Record<string, string> = {
  doc_id: 'Document',
  document_id: 'Document',
  filename: 'File',
  query: 'Search query',
  search_query: 'Search query',
  text: 'Content',
  content: 'Content',
  result: 'Result',
  results: 'Results',
  count: 'Count',
  page: 'Page',
  page_number: 'Page',
  section: 'Section',
  clause: 'Clause',
  status: 'Status',
  success: 'Success',
  error: 'Error',
  message: 'Message',
  title: 'Title',
  name: 'Name',
  type: 'Type',
  url: 'Link',
  path: 'Path',
  edit_type: 'Edit type',
  old_text: 'Original text',
  new_text: 'New text',
  instructions: 'Instructions',
}

export const formatFieldLabel = (key: string): string => {
  if (fieldLabels[key]) return fieldLabels[key]
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (str) => str.toUpperCase())
}

export const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'string') {
    if (value.length > 200) return value.slice(0, 200) + '…'
    return value
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None'
    if (value.length <= 3 && value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ')
    }
    return `${value.length} items`
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '—'
    return `${keys.length} fields`
  }
  return String(value)
}
