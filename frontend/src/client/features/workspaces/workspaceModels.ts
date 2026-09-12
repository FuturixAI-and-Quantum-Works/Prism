import type { AnalysisData } from '../analysis/analysisModel'
import type { DriveFile } from '../../store/api/drive/driveFileApi'
import type { Document } from '../../store/types'
import type { DriveWorkspace, WorkspaceCollaborator } from '../../store/api/drive/driveWorkspaceApi'

export const workspaceFont =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export const workspaceMemberColors = [
  '#7d8a38',
  '#9072be',
  '#284679',
  '#4a7c59',
  '#c45b28',
  '#6b5b95',
  '#d64161',
  '#feb236',
]

export const invitedMemberColors = [
  '#E97B7B',
  '#7B98E9',
  '#E9D97B',
  '#7BE9A3',
  '#9B7BE9',
  '#7BE9E9',
]

export type WorkspaceListFilter = 'owned' | 'shared' | 'all'
export type WorkspaceListSort = 'Newest' | 'Oldest' | 'Name A-Z' | 'Name Z-A'
export type WorkspaceItemSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc'
export type WorkspaceDocumentSort = WorkspaceItemSort
export type WorkspaceDocumentFilter = 'pdf' | 'word' | 'other'
export type WorkspaceDocumentTab = 'primary' | 'supporting'
export type WorkspaceSidebarTab =
  'documents' | 'rulebook' | 'analysis' | 'activity' | 'compliance' | 'tabular'
export type WorkspaceDisplayRole = 'Editor' | 'Viewer' | 'Admin'
export type WorkspaceMemberRole = WorkspaceDisplayRole
export type WorkspaceApiRole = 'admin' | 'editor' | 'viewer'
export type WorkspaceRole = 'owner' | WorkspaceApiRole
export type CreateWorkspaceStep = 'basic' | 'access' | 'success'

export interface WorkspaceMemberDisplay {
  initials: string
  color: string
  email: string
  fullName: string | null
}

export interface WorkspaceCardModel extends DriveWorkspace {
  members: WorkspaceMemberDisplay[]
  membersCount: number
  filesCount: number
  createdBy?: string
  sharedBy?: string
}

export interface WorkspaceItem {
  id: string
  name: string
  type: 'file' | 'document'
  extension?: string | null
  mimeType?: string | null
  sizeBytes?: string | number | null
  createdAt?: string | null
  updatedAt?: string | null
  status?: string | null
  isPrimary?: boolean
}

export interface WorkspaceHeaderMember {
  id: string
  userId: string | null
  initials: string
  color: string
  email: string
  fullName: string | null
  role: WorkspaceRole
  isOwner: boolean
}

export type WorkspaceMemberView = WorkspaceHeaderMember

export interface WorkspaceInvitationRequest {
  workspaceId: string
  email: string
  role: WorkspaceApiRole
}

export interface WorkspaceInvitationDraft {
  email: string
  role: WorkspaceDisplayRole
}

export interface WorkspaceInviteDraft extends WorkspaceInvitationDraft {
  color: string
}

export interface WorkspaceItemContextMenu {
  x: number
  y: number
  item: WorkspaceItem
}

export interface WorkspaceMemberRemoval {
  memberId: string
  userId: string
  name: string
}

export function getInitials(value: string, fallback: string) {
  return (
    value
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || fallback
  )
}

export function normalizeWorkspaceCard(workspace: DriveWorkspace): WorkspaceCardModel {
  const collaborators = workspace.collaborators || []
  const ownerName = workspace.owner_name || 'Owner'
  const ownerMember: WorkspaceMemberDisplay = {
    initials: getInitials(ownerName, 'O'),
    color: '#659d0b',
    email: '',
    fullName: workspace.owner_name,
  }
  const collaboratorMembers = collaborators.map((collaborator, index) => ({
    initials: getInitials(collaborator.full_name || collaborator.email || '', 'U'),
    color: workspaceMemberColors[index % workspaceMemberColors.length],
    email: collaborator.email,
    fullName: collaborator.full_name,
  }))

  return {
    ...workspace,
    members: [ownerMember, ...collaboratorMembers],
    membersCount: collaborators.length + 1,
    filesCount: workspace.file_count ?? 0,
    createdBy: workspace.role === 'owner' ? 'You' : undefined,
    sharedBy: workspace.role !== 'owner' ? workspace.owner_name || 'Team Member' : undefined,
  }
}

export function selectWorkspaceCards(
  workspaces: DriveWorkspace[],
  query: string,
  filter: WorkspaceListFilter,
  sortBy: WorkspaceListSort,
) {
  const normalizedQuery = query.toLowerCase()
  return workspaces
    .map(normalizeWorkspaceCard)
    .filter((workspace) => {
      const matchesSearch =
        !query ||
        workspace.name.toLowerCase().includes(normalizedQuery) ||
        workspace.description?.toLowerCase().includes(normalizedQuery)
      const matchesCategory =
        filter === 'all' ||
        (filter === 'owned' && workspace.role === 'owner') ||
        (filter === 'shared' && workspace.role !== 'owner')
      return matchesSearch && matchesCategory
    })
    .sort((left, right) => {
      switch (sortBy) {
        case 'Newest':
          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        case 'Oldest':
          return new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
        case 'Name A-Z':
          return left.name.localeCompare(right.name)
        case 'Name Z-A':
          return right.name.localeCompare(left.name)
      }
    })
}

export function normalizeWorkspaceItems(files: DriveFile[], documents: Document[]) {
  const driveItems: WorkspaceItem[] = files.map((file) => ({
    id: file.id,
    name: file.name,
    type: 'file',
    extension: file.extension,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
    isPrimary: file.is_primary,
  }))
  const documentItems: WorkspaceItem[] = documents.map((document) => ({
    id: document.id,
    name: document.filename || 'Untitled Document',
    type: 'document',
    extension: document.file_type,
    mimeType:
      document.file_type === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf',
    sizeBytes: document.size_bytes,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    status: document.status,
    isPrimary: document.is_primary ?? true,
  }))
  return [...documentItems, ...driveItems]
}

export function selectWorkspaceItems(
  items: WorkspaceItem[],
  documentTab: WorkspaceDocumentTab,
  searchQuery: string,
  activeFilters: string[],
  sortOption: WorkspaceItemSort,
) {
  let result = items.filter((item) =>
    documentTab === 'primary' ? item.isPrimary !== false : item.isPrimary === false,
  )
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim()
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.extension?.toLowerCase().includes(query) ||
        item.mimeType?.toLowerCase().includes(query),
    )
  }
  if (activeFilters.length > 0) {
    result = result.filter((item) => {
      const extension =
        item.extension?.toLowerCase() || item.name.split('.').pop()?.toLowerCase() || ''
      const isPdf = extension === 'pdf' || item.mimeType?.includes('pdf')
      const isWord = ['doc', 'docx'].includes(extension) || item.mimeType?.includes('word')
      if (activeFilters.includes('pdf') && isPdf) return true
      if (activeFilters.includes('word') && isWord) return true
      if (activeFilters.includes('other') && !isPdf && !isWord) return true
      return false
    })
  }
  return [...result].sort((left, right) => {
    switch (sortOption) {
      case 'newest':
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
      case 'oldest':
        return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
      case 'name-asc':
        return left.name.localeCompare(right.name)
      case 'name-desc':
        return right.name.localeCompare(left.name)
    }
  })
}

export function normalizeWorkspaceMembers(workspace: DriveWorkspace | undefined) {
  if (!workspace) return []
  const ownerName = workspace.owner_name || 'Owner'
  const owner: WorkspaceHeaderMember = {
    id: 'owner',
    userId: workspace.owner_id,
    initials: getInitials(ownerName, 'O'),
    color: '#3F6F00',
    email: '',
    fullName: workspace.owner_name,
    role: 'owner',
    isOwner: true,
  }
  const collaborators = (workspace.collaborators || []).map(
    (collaborator: WorkspaceCollaborator, index): WorkspaceHeaderMember => ({
      id: collaborator.id,
      userId: collaborator.user_id,
      initials: getInitials(collaborator.full_name || collaborator.email || '', 'U'),
      color: workspaceMemberColors[index % workspaceMemberColors.length],
      email: collaborator.email,
      fullName: collaborator.full_name,
      role: collaborator.role,
      isOwner: false,
    }),
  )
  return [owner, ...collaborators]
}

export function toWorkspaceApiRole(role?: string): WorkspaceApiRole {
  if (role === 'Admin') return 'admin'
  if (role === 'Viewer') return 'viewer'
  return 'editor'
}

export function buildCreateWorkspaceRequest(name: string, description: string) {
  return {
    name: name || 'Untitled Workspace',
    description: description || null,
  }
}

export function buildWorkspaceInvitationRequests(
  workspaceId: string,
  invitations: WorkspaceInvitationDraft[],
): WorkspaceInvitationRequest[] {
  return invitations.map(({ email, role }) => ({
    workspaceId,
    email,
    role: toWorkspaceApiRole(role),
  }))
}

export function isValidWorkspaceEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function formatDocumentDate(value: string) {
  const date = new Date(value)
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = String(date.getFullYear()).slice(2)
  const weekday = date.toLocaleString('en-US', { weekday: 'short' })
  const time = date
    .toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
  return { main: `${day} ${month} ${year}`, sub: `(${weekday},${time})` }
}

export function formatTimeAgo(value: string | null | undefined) {
  if (!value) return 'Never'
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const elapsedMinutes = Math.floor(diffMs / 60_000)
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min${elapsedMinutes > 1 ? 's' : ''} ago`
  if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours > 1 ? 's' : ''} ago`
  return `${elapsedDays} day${elapsedDays > 1 ? 's' : ''} ago`
}

export function formatActivityAction(action: string) {
  return action
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isAnalysisSummary(value: unknown): value is AnalysisData['summaries'][number] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.documentName === 'string' &&
    typeof value.purpose === 'string' &&
    isStringArray(value.mainPoints)
  )
}

function isAnalysisRisk(value: unknown): value is AnalysisData['risks'][number] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.category === 'string' &&
    typeof value.description === 'string' &&
    (value.severity === 'high' || value.severity === 'medium' || value.severity === 'low')
  )
}

function isAnalysisClause(value: unknown): value is AnalysisData['clauses'][number] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.documentName === 'string' &&
    typeof value.type === 'string' &&
    typeof value.content === 'string'
  )
}

export function parseWorkspaceAnalysis(response: string): AnalysisData {
  let value = response.trim()
  if (value.startsWith('```json')) value = value.slice(7)
  else if (value.startsWith('```')) value = value.slice(3)
  if (value.endsWith('```')) value = value.slice(0, -3)
  const parsed: unknown = JSON.parse(value.trim())
  if (
    !isRecord(parsed) ||
    (parsed.summaries !== undefined &&
      (!Array.isArray(parsed.summaries) || !parsed.summaries.every(isAnalysisSummary))) ||
    (parsed.risks !== undefined &&
      (!Array.isArray(parsed.risks) || !parsed.risks.every(isAnalysisRisk))) ||
    (parsed.clauses !== undefined &&
      (!Array.isArray(parsed.clauses) || !parsed.clauses.every(isAnalysisClause)))
  ) {
    throw new TypeError('Invalid workspace analysis')
  }
  return {
    summaries: parsed.summaries ?? [],
    risks: parsed.risks ?? [],
    clauses: parsed.clauses ?? [],
  }
}
