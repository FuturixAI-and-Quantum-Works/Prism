import type { BrowseFile } from '../files/fileBrowserTypes'
import type { AttentionItem } from '../../store/api/attentionApi'
import type { ComplianceReview } from '../../store/api/complianceApi'
import type { DriveWorkspace } from '../../store/api/drive/driveWorkspaceApi'
import type { Document } from '../../store/types'
import { appRoutes } from '../../appRoutes'

export const dashboardFontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export interface AttentionItemModel {
  id: string
  title: string
  description: string
  sourceType?: string
  sourceId?: string | null
  metadata?: Record<string, unknown> | null
  status?: 'pending' | 'viewed' | 'resolved' | 'dismissed'
}

export interface ContinueWorkingItem {
  id: string
  type: 'document' | 'compliance'
  title: string
  metadata: string[]
  updatedAt: Date
  documentId?: string
  complianceReviewId?: string
}

const actionableSourceTypes = new Set([
  'workspace_invitation',
  'project_invitation',
  'document_invitation',
  'access_request',
  'document_change_request',
])

export function formatDashboardRelativeTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function selectContinueWorkingItems(
  documents: Document[],
  complianceReviews: ComplianceReview[],
): ContinueWorkingItem[] {
  const recentDocuments: ContinueWorkingItem[] = [...documents]
    .sort(
      (left, right) =>
        new Date(right.updated_at || right.created_at).getTime() -
        new Date(left.updated_at || left.created_at).getTime(),
    )
    .slice(0, 6)
    .map((document) => {
      const updatedAt = new Date(document.updated_at || document.created_at)
      return {
        id: `doc-${document.id}`,
        type: 'document',
        title: document.filename || 'Untitled Document',
        metadata: [`Last edited ${formatDashboardRelativeTime(updatedAt)}`],
        updatedAt,
        documentId: document.id,
      }
    })

  const recentCompliance: ContinueWorkingItem[] = [...complianceReviews]
    .filter((review) => review.status === 'completed')
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6)
    .map((review) => {
      const updatedAt = new Date(review.updatedAt)
      const risksDetected = review.results?.critical_issues ?? 0
      return {
        id: `compliance-${review.id}`,
        type: 'compliance',
        title: review.title || 'Compliance Run',
        metadata: [
          `Completed ${formatDashboardRelativeTime(updatedAt)}`,
          `${risksDetected.toString().padStart(2, '0')} risks detected`,
        ],
        updatedAt,
        complianceReviewId: review.id,
      }
    })

  return [...recentDocuments, ...recentCompliance]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 6)
}

export function selectBrowseFiles(documents: Document[]): BrowseFile[] {
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

function toAttentionItem(item: AttentionItem): AttentionItemModel {
  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    sourceType: item.source_type,
    sourceId: item.source_id,
    metadata: item.metadata,
    status: item.status,
  }
}

export function selectInformationalAttentionItems(items: AttentionItem[]): AttentionItemModel[] {
  return items
    .filter((item) => !actionableSourceTypes.has(item.source_type || ''))
    .map(toAttentionItem)
}

export function selectActionableAttentionItems(items: AttentionItem[]): AttentionItemModel[] {
  return items
    .filter(
      (item) =>
        actionableSourceTypes.has(item.source_type || '') &&
        (item.status === 'pending' || item.status === 'viewed'),
    )
    .map(toAttentionItem)
}

export function selectRecentWorkspaces(workspaces: DriveWorkspace[]): DriveWorkspace[] {
  return [...workspaces]
    .sort(
      (left, right) =>
        new Date(right.updated_at || right.created_at).getTime() -
        new Date(left.updated_at || left.created_at).getTime(),
    )
    .slice(0, 4)
}

export function getAttentionItemRoute(item: AttentionItemModel): string | null {
  if (item.sourceType === 'document_risk' && item.sourceId) {
    return appRoutes.document(item.sourceId)
  }
  if (
    (item.sourceType === 'compliance_issue' || item.sourceType === 'compliance_question') &&
    item.sourceId
  ) {
    return appRoutes.complianceReview(item.sourceId)
  }
  if (item.sourceType === 'document_invitation' && item.sourceId) {
    return appRoutes.document(item.sourceId)
  }
  if (item.sourceType === 'workspace_invitation' || item.sourceType === 'access_request') {
    const workspaceId = item.metadata?.workspaceId
    return typeof workspaceId === 'string' ? appRoutes.workspace(workspaceId) : null
  }
  if (item.sourceType === 'document_change_request') {
    const documentId = item.metadata?.documentId
    return typeof documentId === 'string' ? appRoutes.document(documentId) : null
  }
  return null
}

export function reviewModalTitle(sourceType: string | undefined): string {
  switch (sourceType) {
    case 'workspace_invitation':
      return 'Workspace Invitation'
    case 'project_invitation':
      return 'Project Invitation'
    case 'document_invitation':
      return 'Document Invitation'
    case 'access_request':
      return 'Access Request'
    case 'document_change_request':
      return 'Change Request'
    default:
      return 'Review Request'
  }
}

export function reviewAcceptLabel(sourceType: string | undefined): string {
  return sourceType === 'access_request' || sourceType === 'document_change_request'
    ? 'Approve'
    : 'Accept'
}

export function reviewDeclineLabel(sourceType: string | undefined): string {
  return sourceType === 'access_request' || sourceType === 'document_change_request'
    ? 'Reject'
    : 'Decline'
}
