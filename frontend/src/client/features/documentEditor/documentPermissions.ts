import type { DocumentSessionContext } from '../documents/api/documentGovernanceApi'

export interface DocumentPermissions {
  canManageSharing: boolean
  canEdit: boolean
  canComment: boolean
  canResolveComments: boolean
  canFillPlaceholders: boolean
  canSendForApproval: boolean
  canOwnerReviewApproval: boolean
  isLockedForEditing: boolean
  isOwnerOrAdmin: boolean
  roleBadge: string
  showSendForApproval: boolean
  visibleTabs: string[]
}

interface DocumentPermissionInput {
  documentId: string | undefined
  documentStatus: string | null | undefined
  session: DocumentSessionContext | undefined
  sessionLoading: boolean
}

export function deriveDocumentPermissions({
  documentId,
  documentStatus,
  session,
  sessionLoading,
}: DocumentPermissionInput): DocumentPermissions {
  const allowedActions = new Set(session?.allowed_actions ?? [])
  const isOwnerOrAdmin = session?.is_owner || session?.is_owner_admin || !documentId
  const lifecycleState = session?.document_state ?? documentStatus ?? null
  const isLockedForEditing = lifecycleState === 'PENDING_APPROVAL' || lifecycleState === 'FINALIZED'
  const showSendForApproval = !!documentId && allowedActions.has('send_approval')
  const defaultTabs = sessionLoading ? ['prism'] : ['prism', 'insights', 'audit', 'comments']

  return {
    canManageSharing: !!documentId && !!session?.is_owner_admin,
    canEdit: (isOwnerOrAdmin || allowedActions.has('edit_document')) && !isLockedForEditing,
    canComment: isOwnerOrAdmin || allowedActions.has('add_comment'),
    canResolveComments: isOwnerOrAdmin || allowedActions.has('resolve_comment'),
    canFillPlaceholders:
      (isOwnerOrAdmin || allowedActions.has('fill_placeholders')) && !isLockedForEditing,
    canSendForApproval:
      showSendForApproval && (lifecycleState === 'DRAFT' || lifecycleState === 'IN_REVIEW'),
    canOwnerReviewApproval:
      !!documentId && !!session?.is_owner_admin && lifecycleState === 'PENDING_APPROVAL',
    isLockedForEditing,
    isOwnerOrAdmin,
    roleBadge: session?.role_badge ?? session?.document_role ?? 'UNVERIFIED',
    showSendForApproval,
    visibleTabs: documentId
      ? (session?.visible_tabs ?? defaultTabs)
      : ['prism', 'insights', 'audit', 'comments'],
  }
}
