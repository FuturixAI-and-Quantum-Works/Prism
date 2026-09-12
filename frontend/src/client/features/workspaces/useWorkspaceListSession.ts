import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appRoutes } from '../../appRoutes'
import { useResponsive } from '../../hooks'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import { useInviteWorkspaceMemberMutation } from '../../store/api/drive/driveInvitationsApi'
import {
  useDeleteDriveWorkspaceMutation,
  useGetDriveWorkspacesQuery,
  useUpdateDriveWorkspaceMutation,
} from '../../store/api/drive/driveWorkspaceApi'
import {
  isValidWorkspaceEmail,
  selectWorkspaceCards,
  type WorkspaceCardModel,
  type WorkspaceListFilter,
  type WorkspaceListSort,
} from './workspaceModels'

export type WorkspaceListAction = 'open' | 'rename' | 'share' | 'delete'

export function useWorkspaceListSession(filter: WorkspaceListFilter) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { data: workspaces = [], isLoading } = useGetDriveWorkspacesQuery()
  const [updateWorkspace] = useUpdateDriveWorkspaceMutation()
  const [deleteWorkspace] = useDeleteDriveWorkspaceMutation()
  const [inviteWorkspaceMember] = useInviteWorkspaceMemberMutation()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<WorkspaceListSort>('Newest')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceCardModel | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [shareError, setShareError] = useState('')
  const [renameError, setRenameError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    workspace: WorkspaceCardModel
  } | null>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const contextMenuTriggerRef = useRef<HTMLElement | null>(null)
  const sortMenuRef = useMenuFocus({
    open: sortDropdownOpen,
    onClose: () => setSortDropdownOpen(false),
    onOpen: () => setSortDropdownOpen(true),
    triggerRef: sortButtonRef,
  })
  const contextMenuRef = useMenuFocus({
    open: contextMenu !== null,
    onClose: () => setContextMenu(null),
    triggerRef: contextMenuTriggerRef,
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false)
      }
      const target = event.target as HTMLElement
      if (!target.closest('[data-context-menu]')) setContextMenu(null)
    }
    if (sortDropdownOpen || contextMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sortDropdownOpen, contextMenu])

  const displayedWorkspaces = useMemo(
    () => selectWorkspaceCards(workspaces, searchQuery, filter, sortBy),
    [filter, searchQuery, sortBy, workspaces],
  )

  const openContextMenu = (
    trigger: HTMLElement,
    x: number,
    y: number,
    workspace: WorkspaceCardModel,
  ) => {
    contextMenuTriggerRef.current = trigger
    setContextMenu({ x, y, workspace })
  }

  const handleContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    workspace: WorkspaceCardModel,
  ) => {
    event.preventDefault()
    openContextMenu(event.currentTarget, event.clientX, event.clientY, workspace)
  }

  const handleContextMenuKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    workspace: WorkspaceCardModel,
  ) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    openContextMenu(event.currentTarget, rect.left, rect.bottom, workspace)
  }

  const openWorkspace = (workspace: WorkspaceCardModel) =>
    navigate(appRoutes.workspace(workspace.id))

  const openRename = (workspace: WorkspaceCardModel) => {
    setSelectedWorkspace(workspace)
    setRenameValue(workspace.name)
    setRenameError('')
    setRenameModalOpen(true)
  }

  const submitRename = async () => {
    if (!selectedWorkspace || !renameValue.trim()) return
    setRenameError('')
    try {
      await updateWorkspace({
        workspaceId: selectedWorkspace.id,
        name: renameValue.trim(),
      }).unwrap()
      setRenameModalOpen(false)
      setSelectedWorkspace(null)
      setRenameValue('')
    } catch (error) {
      setRenameError(getRequestErrorMessage(error, 'Could not rename this workspace.'))
    }
  }

  const openShare = (workspace: WorkspaceCardModel) => {
    setSelectedWorkspace(workspace)
    setShareEmail('')
    setShareError('')
    setShareModalOpen(true)
  }

  const openDelete = (workspace: WorkspaceCardModel) => {
    setSelectedWorkspace(workspace)
    setDeleteError('')
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedWorkspace) return
    setDeleteError('')
    try {
      await deleteWorkspace(selectedWorkspace.id).unwrap()
      setDeleteModalOpen(false)
      setSelectedWorkspace(null)
    } catch (error) {
      setDeleteError(getRequestErrorMessage(error, 'Could not delete this workspace.'))
    }
  }

  const submitShare = async () => {
    if (!selectedWorkspace) return
    const email = shareEmail.trim().toLowerCase()
    if (!email) {
      setShareModalOpen(false)
      return
    }
    if (!isValidWorkspaceEmail(email)) {
      setShareError('Enter a valid email address.')
      return
    }
    setIsSharing(true)
    setShareError('')
    try {
      const result = await inviteWorkspaceMember({
        workspaceId: selectedWorkspace.id,
        email,
        role: 'editor',
      }).unwrap()
      if (result.delivery.status === 'failed') {
        setShareError(`Invite was not sent: ${result.delivery.error || 'delivery failed'}`)
        return
      }
      setShareModalOpen(false)
      setSelectedWorkspace(null)
      setShareEmail('')
    } catch (error) {
      setShareError(getRequestErrorMessage(error, 'Failed to send invite'))
    } finally {
      setIsSharing(false)
    }
  }

  const handleWorkspaceAction = (action: WorkspaceListAction, workspace: WorkspaceCardModel) => {
    if (action === 'open') openWorkspace(workspace)
    if (action === 'rename') openRename(workspace)
    if (action === 'share') openShare(workspace)
    if (action === 'delete') openDelete(workspace)
  }

  return {
    confirmDelete,
    contextMenu,
    contextMenuRef,
    createWorkspaceModalOpen,
    deleteModalOpen,
    deleteError,
    displayedWorkspaces,
    filter,
    handleContextMenu,
    handleContextMenuKeyDown,
    handleWorkspaceAction,
    isLoading,
    isMobile,
    isSharing,
    openDelete,
    openRename,
    openShare,
    openWorkspace,
    renameModalOpen,
    renameError,
    renameValue,
    searchQuery,
    selectedWorkspace,
    setContextMenu,
    setCreateWorkspaceModalOpen,
    setDeleteModalOpen,
    setRenameModalOpen,
    setRenameValue,
    setSearchQuery,
    setShareEmail,
    setShareModalOpen,
    setSortBy,
    setSortDropdownOpen,
    shareEmail,
    shareError,
    shareModalOpen,
    sortButtonRef,
    sortBy,
    sortDropdownOpen,
    sortDropdownRef,
    sortMenuRef,
    submitRename,
    submitShare,
  }
}

export type WorkspaceListSession = ReturnType<typeof useWorkspaceListSession>
