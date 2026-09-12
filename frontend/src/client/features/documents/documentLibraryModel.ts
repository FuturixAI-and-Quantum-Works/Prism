import type { Document } from '../../store/types'

export type DocumentSort = 'Newest' | 'Oldest' | 'Name A-Z' | 'Name Z-A'
export type DocumentStatusFilter = 'all' | 'active' | 'done'
export type DocumentAction = 'open' | 'ask' | 'rename' | 'duplicate' | 'export' | 'share' | 'delete'

export const documentFontFamily = "'Poppins', sans-serif"

export interface DocumentStatusModel {
  label: string
  statusColor: string
  statusBg: string
  group: Exclude<DocumentStatusFilter, 'all'>
}

export interface DocumentCardModel {
  id: string
  title: string
  fileTypeLabel: string
  details: string[]
  status: DocumentStatusModel | null
  updatedAtLabel: string | null
  sortTimestamp: number
  createdAt: string
  fileType: string
  lifecycleStatus: string | null
  apiStatus: string
  ownerId: string
  sharedBy?: string
}

export interface DocumentLibraryFilters {
  isShared: boolean
  viewerUserId?: string | null
  searchQuery: string
  sortBy: DocumentSort
  statusFilter: DocumentStatusFilter
}

const lifecycleStatuses: Record<string, DocumentStatusModel> = {
  DRAFT: {
    label: 'Draft',
    statusColor: '#B45309',
    statusBg: '#FEF3C7',
    group: 'active',
  },
  IN_REVIEW: {
    label: 'In Review',
    statusColor: '#1D4ED8',
    statusBg: '#DBEAFE',
    group: 'active',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    statusColor: '#1D4ED8',
    statusBg: '#DBEAFE',
    group: 'active',
  },
  APPROVED: {
    label: 'Approved',
    statusColor: '#047857',
    statusBg: '#D1FAE5',
    group: 'done',
  },
  EXECUTED: {
    label: 'Executed',
    statusColor: '#15803D',
    statusBg: '#DCFCE7',
    group: 'done',
  },
  FINALIZED: {
    label: 'Finalized',
    statusColor: '#15803D',
    statusBg: '#DCFCE7',
    group: 'done',
  },
  ARCHIVED: {
    label: 'Archived',
    statusColor: '#374151',
    statusBg: '#F3F4F6',
    group: 'done',
  },
}

const processingStatuses: Record<string, DocumentStatusModel> = {
  ready: {
    label: 'Ready',
    statusColor: '#15803D',
    statusBg: '#DCFCE7',
    group: 'done',
  },
  processing: {
    label: 'Processing',
    statusColor: '#1D4ED8',
    statusBg: '#DBEAFE',
    group: 'active',
  },
  error: {
    label: 'Error',
    statusColor: '#B91C1C',
    statusBg: '#FEE2E2',
    group: 'active',
  },
}

function humanizeStatus(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function documentFileTypeLabel(
  fileType: string | null | undefined,
  filename: string,
): string {
  const normalizedType = fileType?.split('/').pop()?.trim()
  const extension = filename.includes('.') ? filename.split('.').pop()?.trim() : null
  const label = normalizedType || extension
  return label ? label.toUpperCase() : 'Document'
}

export function formatDocumentFileSize(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || bytes < 0) return null
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex
  return unitIndex === 0 ? `${Math.round(value)} B` : `${value.toFixed(1)} ${units[unitIndex]}`
}

export function getDocumentStatus(
  lifecycleStatus: string | null | undefined,
  processingStatus: string | null | undefined,
): DocumentStatusModel | null {
  const lifecycle = lifecycleStatus?.trim()
  if (lifecycle) {
    return (
      lifecycleStatuses[lifecycle.toUpperCase()] ?? {
        label: humanizeStatus(lifecycle),
        statusColor: '#374151',
        statusBg: '#F3F4F6',
        group: 'active',
      }
    )
  }

  const processing = processingStatus?.trim().toLowerCase() || ''
  if (!processing) return null
  return (
    processingStatuses[processing] ?? {
      label: humanizeStatus(processing),
      statusColor: '#374151',
      statusBg: '#F3F4F6',
      group: 'active',
    }
  )
}

function formatDocumentDate(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatPageCount(pageCount: number | null | undefined): string | null {
  if (pageCount === null || pageCount === undefined || pageCount < 0) return null
  return `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`
}

export function toDocumentCard(doc: Document): DocumentCardModel {
  const fileTypeLabel = documentFileTypeLabel(doc.file_type, doc.filename)
  const createdAtLabel = formatDocumentDate(doc.created_at)
  const updatedAtLabel = formatDocumentDate(doc.updated_at)
  const fileDetails = [
    fileTypeLabel,
    formatDocumentFileSize(doc.size_bytes),
    formatPageCount(doc.page_count),
  ].filter((value): value is string => Boolean(value))

  return {
    id: doc.id,
    title: doc.filename,
    fileTypeLabel,
    details: [
      ...(createdAtLabel ? [`Created ${createdAtLabel}`] : []),
      ...(fileDetails.length > 0 ? [fileDetails.join(' · ')] : []),
    ],
    status: getDocumentStatus(doc.lifecycle_status, doc.status || ''),
    updatedAtLabel,
    sortTimestamp: Date.parse(doc.updated_at || doc.created_at) || 0,
    createdAt: doc.created_at,
    fileType: doc.file_type || '',
    lifecycleStatus: doc.lifecycle_status || null,
    apiStatus: doc.status || '',
    ownerId: doc.user_id || '',
  }
}

function sortDocumentCards(
  documents: DocumentCardModel[],
  sortBy: DocumentSort,
): DocumentCardModel[] {
  return [...documents].sort((left, right) => {
    if (sortBy === 'Name A-Z') return left.title.localeCompare(right.title)
    if (sortBy === 'Name Z-A') return right.title.localeCompare(left.title)
    if (sortBy === 'Oldest') return left.sortTimestamp - right.sortTimestamp
    return right.sortTimestamp - left.sortTimestamp
  })
}

export function isDocumentInLibraryScope(
  ownerId: string,
  isShared: boolean,
  viewerUserId?: string | null,
): boolean {
  if (!viewerUserId) return !isShared
  return isShared ? ownerId !== viewerUserId : ownerId === viewerUserId
}

export function selectDocumentCards(
  documents: Document[] | undefined,
  filters: DocumentLibraryFilters,
): DocumentCardModel[] {
  const searchQuery = filters.searchQuery.trim().toLowerCase()
  const cards = (documents ?? []).map(toDocumentCard).filter((document) => {
    const matchesScope = isDocumentInLibraryScope(
      document.ownerId,
      filters.isShared,
      filters.viewerUserId,
    )
    const matchesSearch =
      !searchQuery ||
      document.title.toLowerCase().includes(searchQuery) ||
      document.fileTypeLabel.toLowerCase().includes(searchQuery)
    const matchesStatus =
      filters.statusFilter === 'all' || document.status?.group === filters.statusFilter

    return matchesScope && matchesSearch && matchesStatus
  })

  return sortDocumentCards(cards, filters.sortBy)
}
