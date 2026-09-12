import { appRoutes } from '../../appRoutes'
import { formatRelativeTime } from './commentsModel'
import { truncateName } from './editorUtilities'

interface SearchableTemplate {
  category: string
  description?: string | null
  name: string
}

export interface WorkspaceLocationState {
  from?: string
  workspaceId?: string
  workspaceName?: string
  isPrimary?: boolean
}

export interface WorkspaceBreadcrumb {
  icon: 'home' | 'library' | 'projects' | 'project' | null
  label: string
  path?: string
}

export interface DocumentStatusConfig {
  bg: string
  color: string
  label: string
}

const lifecycleStatus: Record<string, DocumentStatusConfig> = {
  IN_REVIEW: { label: 'In Review', color: '#6B7280', bg: '#F5F5F5' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#8B5CF6', bg: '#F3E8FF' },
  APPROVED: { label: 'Approved', color: '#30D294', bg: '#ECFDF5' },
  FINALIZED: { label: 'Done', color: '#30D294', bg: '#ECFDF5' },
}

const processingStatus: Record<string, DocumentStatusConfig> = {
  ready: { label: 'Ready', color: '#30D294', bg: '#ECFDF5' },
  processing: { label: 'Processing', color: '#6B7280', bg: '#F5F5F5' },
  error: { label: 'Error', color: '#E53935', bg: '#FEE2E2' },
}

export function getDocumentStatusConfig(
  lifecycleState: string | null,
  documentStatus: string | undefined,
  hasRevisionRequired: boolean,
): DocumentStatusConfig {
  if (lifecycleState === 'DRAFT') {
    return hasRevisionRequired
      ? { label: 'Revision required', color: '#C83A2D', bg: '#FFF7F6' }
      : { label: 'Draft', color: '#8A5A00', bg: '#FFF8E5' }
  }

  return (
    (lifecycleState ? lifecycleStatus[lifecycleState] : undefined) ??
    (documentStatus ? processingStatus[documentStatus] : undefined) ?? {
      label: 'In Process',
      color: '#8A5A00',
      bg: '#FFF8E5',
    }
  )
}

export function getUpdatedTimeDisplay(updatedAt: string | undefined) {
  return updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : 'Just now'
}

export function filterTemplates<T extends SearchableTemplate>(templates: T[], searchQuery: string) {
  const query = searchQuery.toLowerCase().trim()
  if (!query) return templates
  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(query) ||
      template.category.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query) ?? false),
  )
}

export function getWorkspaceBreadcrumbs(
  locationState: WorkspaceLocationState | null,
  documentName: string,
): WorkspaceBreadcrumb[] {
  const crumbs: WorkspaceBreadcrumb[] = [{ label: 'Home', icon: 'home', path: '/' }]

  if (locationState?.from === 'workspaces' && locationState.workspaceId) {
    crumbs.push({ label: 'Workspaces', icon: 'projects', path: appRoutes.workspaces })
    if (locationState.workspaceName) {
      crumbs.push({
        label: truncateName(locationState.workspaceName),
        icon: null,
        path: appRoutes.workspace(locationState.workspaceId),
      })
    }
  } else if (locationState?.from === 'documents' || !locationState?.from) {
    crumbs.push({ label: 'Documents', icon: 'library', path: '/documents' })
  }

  crumbs.push({ label: documentName, icon: null })
  return crumbs
}

export function getWorkspaceActivePage(locationState: WorkspaceLocationState | null) {
  if (locationState?.from === 'workspaces') return 'workspaces'
  return 'documents'
}
