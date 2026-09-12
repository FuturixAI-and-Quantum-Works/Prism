export type ComplianceTarget =
  | { kind: 'review'; reviewId: string }
  | { kind: 'document'; documentId: string }
  | { kind: 'workspace'; workspaceId: string }

export type ComplianceScopeTarget =
  { kind: 'document'; documentId: string | undefined } | { kind: 'workspace'; workspaceId: string }

export interface SelectedComplianceDocument {
  id: string
  name: string
  extension?: string | null
  type: 'file' | 'document'
}

export interface WorkspaceComplianceFile {
  id: string
  name: string
  extension: string | null
  source: 'drive' | 'document'
}

export interface SupportingDocument {
  id: string
  filename: string
  created_at: string
}

export interface ReviewRule {
  id: string
  content: string
  preset?: boolean
  rulebookTitle?: string
}

export interface ReviewQuestion {
  id: string
  content: string
  preset?: boolean
  rulebookTitle?: string
}

export interface ComplianceResults {
  complianceScore: number | null
  criticalIssues: number
  pendingItems: number
  resolvedIssues: number
}

export interface RuleResult {
  id: string
  summary: string
  status: 'pending' | 'compliant' | 'non_compliant' | 'partial' | 'error'
}

export interface ClauseValidation {
  id: string
  clause: string
  status: 'valid' | 'invalid' | 'warning'
  details: string
}

export interface ComplianceRecommendation {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface ComplianceActivity {
  id: string
  action: string
  timestamp: string
  user: string
}

export type ComplianceResultsTab = 'overview' | 'risk' | 'clause' | 'recommendations' | 'activity'

export function resolveComplianceTarget(params: {
  reviewId?: string
  documentId?: string
  workspaceId?: string
}): ComplianceTarget {
  const identifiers = [params.reviewId, params.documentId, params.workspaceId].filter(Boolean)
  if (identifiers.length !== 1) {
    throw new Error('Compliance routes require exactly one route identifier')
  }
  if (params.reviewId) return { kind: 'review', reviewId: params.reviewId }
  if (params.documentId) return { kind: 'document', documentId: params.documentId }
  return { kind: 'workspace', workspaceId: params.workspaceId as string }
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Uploaded just now'
  if (diffMins < 60) return `Uploaded ${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `Uploaded ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return `Uploaded ${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

export function buildWorkspaceFiles(
  selectedDocuments: SelectedComplianceDocument[] | undefined,
  driveFiles: Array<{ id: string; name: string; extension: string | null }>,
  workspaceDocuments:
    Array<{ id: string; filename?: string | null; file_type?: string | null }> | undefined,
): WorkspaceComplianceFile[] {
  if (selectedDocuments && selectedDocuments.length > 0) {
    return selectedDocuments.map((document) => ({
      id: document.id,
      name: document.name,
      extension: document.extension || null,
      source: document.type === 'document' ? 'document' : 'drive',
    }))
  }

  const files: WorkspaceComplianceFile[] = driveFiles.map((file) => ({
    id: file.id,
    name: file.name,
    extension: file.extension,
    source: 'drive',
  }))
  const driveFileIds = new Set(driveFiles.map((file) => file.id))

  for (const document of workspaceDocuments || []) {
    if (!driveFileIds.has(document.id)) {
      files.push({
        id: document.id,
        name: document.filename || 'Untitled',
        extension: document.file_type || null,
        source: 'document',
      })
    }
  }

  return files
}
