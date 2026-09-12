import type { ComplianceReview } from '../../store/api/complianceApi'
import type { BrowseFile } from '../files/fileBrowserTypes'
import { appRoutes } from '../../appRoutes'

export interface ComplianceListDocument {
  id: string
  primaryDocumentId: string | null
  workspaceId: string | null
  name: string
  reviewType: string
  riskStatus: string | null
  riskCount: number
  complianceScore: number | null
  reviewer: string
  updatedTime: string
  updatedAt: Date
}

export type ComplianceSortOption =
  'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'score-high' | 'score-low'

export type ComplianceListAction =
  | {
      kind: 'menu'
      document: ComplianceListDocument
      position: { top: number; left: number }
      trigger: HTMLButtonElement
    }
  | {
      kind: 'context'
      document: ComplianceListDocument
      position: { top: number; left: number }
      trigger: HTMLButtonElement | null
    }

export const complianceSortLabels: Record<ComplianceSortOption, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  'name-asc': 'Name A-Z',
  'name-desc': 'Name Z-A',
  'score-high': 'Score High-Low',
  'score-low': 'Score Low-High',
}

export function toComplianceListDocument(review: ComplianceReview): ComplianceListDocument {
  const riskCount = review.results?.criticalIssues ?? 0
  const riskStatus =
    review.complianceScore === null
      ? null
      : riskCount >= 5
        ? 'High'
        : riskCount >= 2
          ? 'Medium'
          : 'Low'

  return {
    id: review.id,
    primaryDocumentId: review.primaryDocumentId,
    workspaceId: review.workspaceId,
    name: review.title || 'Untitled Review',
    reviewType: review.workspaceId ? 'Project Review' : 'Document Review',
    riskStatus,
    riskCount,
    complianceScore: review.complianceScore,
    reviewer: 'AI Assistant',
    updatedTime: new Date(review.updatedAt).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    updatedAt: new Date(review.updatedAt),
  }
}

export function filterAndSortComplianceDocuments(
  documents: ComplianceListDocument[],
  searchQuery: string,
  activeFilters: string[],
  sortOption: ComplianceSortOption,
) {
  let filtered = documents.filter((document) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      document.name.toLowerCase().includes(query) ||
      document.reviewType.toLowerCase().includes(query) ||
      document.reviewer.toLowerCase().includes(query)
    )
  })

  if (activeFilters.length > 0) {
    filtered = filtered.filter((document) =>
      document.riskStatus ? activeFilters.includes(document.riskStatus.toLowerCase()) : false,
    )
  }

  return [...filtered].sort((left, right) => {
    switch (sortOption) {
      case 'newest':
        return right.updatedAt.getTime() - left.updatedAt.getTime()
      case 'oldest':
        return left.updatedAt.getTime() - right.updatedAt.getTime()
      case 'name-asc':
        return left.name.localeCompare(right.name)
      case 'name-desc':
        return right.name.localeCompare(left.name)
      case 'score-high':
        return compareScores(left.complianceScore, right.complianceScore, 'high')
      case 'score-low':
        return compareScores(left.complianceScore, right.complianceScore, 'low')
    }
  })
}

function compareScores(left: number | null, right: number | null, direction: 'high' | 'low') {
  if (left === null) return right === null ? 0 : 1
  if (right === null) return -1
  return direction === 'high' ? right - left : left - right
}

export function complianceReviewRoute(document: ComplianceListDocument) {
  return appRoutes.complianceReview(document.id)
}

export function getRiskLabel(status: string | null, count: number) {
  if (status === null) return 'Not assessed'
  return `${count} ${status} Risk${count > 1 ? 's' : ''}`
}

export function toBrowseFiles(
  documents:
    | Array<{
        id: string
        filename?: string | null
        file_type?: string | null
        created_at: string
      }>
    | undefined,
): BrowseFile[] {
  if (!documents) return []

  return documents.map((document) => {
    let type: BrowseFile['type'] = 'other'
    if (document.file_type === 'pdf') type = 'pdf'
    else if (document.file_type === 'docx' || document.file_type === 'doc') type = 'word'
    else {
      const extension = document.filename?.split('.').pop()?.toLowerCase()
      if (extension === 'pdf') type = 'pdf'
      else if (extension === 'docx' || extension === 'doc') type = 'word'
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) type = 'image'
    }

    return {
      id: document.id,
      name: document.filename || 'Untitled',
      type,
      date: new Date(document.created_at).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      createdAt: new Date(document.created_at),
      extension: document.file_type,
    }
  })
}
