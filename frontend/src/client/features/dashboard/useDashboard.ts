import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appRoutes } from '../../appRoutes'
import { useGetDocumentsQuery } from '../documents/api/documentCoreApi'
import { useResponsive } from '../../hooks'
import { useAuth } from '../../hooks/useAuth'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  useGetAttentionItemsQuery,
  useUpdateAttentionItemMutation,
} from '../../store/api/attentionApi'
import { useGetComplianceReviewsQuery } from '../../store/api/complianceApi'
import { useGetDriveWorkspacesQuery } from '../../store/api/drive/driveWorkspaceApi'
import {
  useAcceptInvitationMutation,
  useApproveAccessRequestMutation,
  useApproveChangeRequestMutation,
  useDeclineInvitationMutation,
  useRejectAccessRequestMutation,
  useRejectChangeRequestMutation,
} from '../../store/api/invitationsApi'
import {
  type AttentionItemModel,
  type ContinueWorkingItem,
  getAttentionItemRoute,
  selectActionableAttentionItems,
  selectBrowseFiles,
  selectContinueWorkingItems,
  selectInformationalAttentionItems,
  selectRecentWorkspaces,
} from './dashboardModel'

export function useDashboard() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const { user } = useAuth()
  const [browseFilesModalOpen, setBrowseFilesModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false)
  const [aiPanelWidth, setAiPanelWidth] = useState(isTablet ? 360 : 400)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedReviewItem, setSelectedReviewItem] = useState<AttentionItemModel | null>(null)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [actionError, setActionError] = useState('')

  const { data: documents = [] } = useGetDocumentsQuery({ limit: 10 })
  const { data: complianceReviews = [] } = useGetComplianceReviewsQuery()
  const { data: workspaces = [] } = useGetDriveWorkspacesQuery()
  const { data: apiAttentionItems = [] } = useGetAttentionItemsQuery({ limit: 20 })
  const [updateAttentionItem] = useUpdateAttentionItemMutation()
  const [acceptInvitation] = useAcceptInvitationMutation()
  const [declineInvitation] = useDeclineInvitationMutation()
  const [approveAccessRequest] = useApproveAccessRequestMutation()
  const [rejectAccessRequest] = useRejectAccessRequestMutation()
  const [approveChangeRequest] = useApproveChangeRequestMutation()
  const [rejectChangeRequest] = useRejectChangeRequestMutation()

  const continueWorkingItems = useMemo(
    () => selectContinueWorkingItems(documents, complianceReviews),
    [complianceReviews, documents],
  )
  const browseFiles = useMemo(() => selectBrowseFiles(documents), [documents])
  const attentionItems = useMemo(
    () => selectInformationalAttentionItems(apiAttentionItems),
    [apiAttentionItems],
  )
  const actionableItems = useMemo(
    () => selectActionableAttentionItems(apiAttentionItems),
    [apiAttentionItems],
  )
  const recentWorkspaces = useMemo(() => selectRecentWorkspaces(workspaces), [workspaces])

  const closeReviewModal = () => {
    if (isProcessingAction) return
    setReviewModalOpen(false)
    setSelectedReviewItem(null)
    setActionError('')
  }

  const viewAttentionItem = async (item: AttentionItemModel) => {
    setActionError('')
    try {
      await updateAttentionItem({ id: item.id, status: 'viewed' }).unwrap()
      const route = getAttentionItemRoute(item)
      if (route) navigate(route)
    } catch (error) {
      setActionError(getRequestErrorMessage(error, 'Could not open this attention item.'))
    }
  }

  const openReviewItem = (item: AttentionItemModel) => {
    setActionError('')
    setSelectedReviewItem(item)
    setReviewModalOpen(true)
  }

  const acceptReviewItem = async () => {
    if (!selectedReviewItem) return
    setIsProcessingAction(true)
    setActionError('')
    try {
      const metadata = selectedReviewItem.metadata
      let completed = false
      if (
        selectedReviewItem.sourceType === 'workspace_invitation' ||
        selectedReviewItem.sourceType === 'project_invitation' ||
        selectedReviewItem.sourceType === 'document_invitation'
      ) {
        if (selectedReviewItem.sourceId) {
          await acceptInvitation({
            kind: 'id',
            invitationId: selectedReviewItem.sourceId,
          }).unwrap()
          completed = true
        }
      } else if (selectedReviewItem.sourceType === 'access_request') {
        const workspaceId = metadata?.workspaceId
        const requestId = selectedReviewItem.sourceId
        if (typeof workspaceId === 'string' && requestId) {
          await approveAccessRequest({ workspaceId, requestId }).unwrap()
          completed = true
        }
      } else if (selectedReviewItem.sourceType === 'document_change_request') {
        const documentId = metadata?.documentId
        const requestId = selectedReviewItem.sourceId
        if (typeof documentId === 'string' && requestId) {
          await approveChangeRequest({ documentId, requestId }).unwrap()
          completed = true
        }
      }
      if (!completed) {
        setActionError('This request is missing the information needed to approve it.')
        return
      }
      setReviewModalOpen(false)
      setSelectedReviewItem(null)
    } catch (error) {
      setActionError(getRequestErrorMessage(error, 'Could not approve this request.'))
    } finally {
      setIsProcessingAction(false)
    }
  }

  const declineReviewItem = async () => {
    if (!selectedReviewItem) return
    setIsProcessingAction(true)
    setActionError('')
    try {
      const metadata = selectedReviewItem.metadata
      let completed = false
      if (
        selectedReviewItem.sourceType === 'workspace_invitation' ||
        selectedReviewItem.sourceType === 'project_invitation' ||
        selectedReviewItem.sourceType === 'document_invitation'
      ) {
        if (selectedReviewItem.sourceId) {
          await declineInvitation(selectedReviewItem.sourceId).unwrap()
          completed = true
        }
      } else if (selectedReviewItem.sourceType === 'access_request') {
        const workspaceId = metadata?.workspaceId
        const requestId = selectedReviewItem.sourceId
        if (typeof workspaceId === 'string' && requestId) {
          await rejectAccessRequest({ workspaceId, requestId }).unwrap()
          completed = true
        }
      } else if (selectedReviewItem.sourceType === 'document_change_request') {
        const documentId = metadata?.documentId
        const requestId = selectedReviewItem.sourceId
        if (typeof documentId === 'string' && requestId) {
          await rejectChangeRequest({ documentId, requestId }).unwrap()
          completed = true
        }
      }
      if (!completed) {
        setActionError('This request is missing the information needed to decline it.')
        return
      }
      setReviewModalOpen(false)
      setSelectedReviewItem(null)
    } catch (error) {
      setActionError(getRequestErrorMessage(error, 'Could not decline this request.'))
    } finally {
      setIsProcessingAction(false)
    }
  }

  const openContinueWorkingItem = (item: ContinueWorkingItem) => {
    if (item.type === 'document' && item.documentId) {
      navigate(appRoutes.document(item.documentId))
    } else if (item.type === 'compliance' && item.complianceReviewId) {
      navigate(appRoutes.complianceReview(item.complianceReviewId))
    }
  }

  return {
    userName: user?.displayName || 'User',
    isMobile,
    isTablet,
    isWorkspacesEmpty: workspaces.length === 0,
    browseFilesModalOpen,
    searchQuery,
    aiPanelCollapsed,
    aiPanelWidth,
    reviewModalOpen,
    selectedReviewItem,
    isProcessingAction,
    actionError,
    continueWorkingItems,
    browseFiles,
    attentionItems,
    actionableItems,
    recentWorkspaces,
    actions: {
      setBrowseFilesModalOpen,
      setSearchQuery,
      setAiPanelCollapsed,
      setAiPanelWidth,
      closeReviewModal,
      viewAttentionItem,
      openReviewItem,
      acceptReviewItem,
      declineReviewItem,
      openContinueWorkingItem,
      openFeature: (path: string) => navigate(path),
      openWorkspace: (id: string) => navigate(appRoutes.workspace(id)),
      selectFile: (file: { id: string }) => {
        setBrowseFilesModalOpen(false)
        navigate(appRoutes.document(file.id))
      },
    },
  }
}

export type DashboardSession = ReturnType<typeof useDashboard>
