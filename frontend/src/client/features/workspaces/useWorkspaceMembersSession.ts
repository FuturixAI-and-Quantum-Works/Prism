import { useEffect, useMemo, useRef, useState } from 'react'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import {
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
} from '../../store/api/drive/driveInvitationsApi'
import type { DriveWorkspace } from '../../store/api/drive/driveWorkspaceApi'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  isValidWorkspaceEmail,
  normalizeWorkspaceMembers,
  toWorkspaceApiRole,
} from './workspaceModels'
import type { WorkspaceMemberRemoval, WorkspaceMemberRole } from './workspaceModels'

interface UseWorkspaceMembersSessionOptions {
  workspaceId: string
  workspace?: DriveWorkspace
}

export function useWorkspaceMembersSession({
  workspaceId,
  workspace,
}: UseWorkspaceMembersSessionOptions) {
  const [removeWorkspaceMember] = useRemoveWorkspaceMemberMutation()
  const [inviteWorkspaceMember] = useInviteWorkspaceMemberMutation()
  const [memberDetailsId, setMemberDetailsId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberRemoval | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<WorkspaceMemberRole>('Editor')
  const [shareRoleOpen, setShareRoleOpen] = useState(false)
  const [shareError, setShareError] = useState('')
  const [removeError, setRemoveError] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const memberContainerRef = useRef<HTMLDivElement>(null)
  const memberDetailsRef = useRef<HTMLDivElement>(null)
  const memberTriggerRef = useRef<HTMLElement | null>(null)
  const moreContainerRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const shareRoleButtonRef = useRef<HTMLButtonElement>(null)
  const moreMenuRef = useMenuFocus({
    open: moreOpen,
    onClose: () => setMoreOpen(false),
    onOpen: () => setMoreOpen(true),
    triggerRef: moreButtonRef,
  })
  const shareRoleMenuRef = useMenuFocus({
    open: shareRoleOpen,
    onClose: () => setShareRoleOpen(false),
    onOpen: () => setShareRoleOpen(true),
    triggerRef: shareRoleButtonRef,
  })
  const members = useMemo(
    () => (workspace ? normalizeWorkspaceMembers(workspace) : []),
    [workspace],
  )

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (
        memberContainerRef.current &&
        !memberContainerRef.current.contains(event.target as Node)
      ) {
        setMemberDetailsId(null)
      }
    }
    if (memberDetailsId) {
      document.addEventListener('mousedown', closeOutside)
      memberDetailsRef.current?.focus()
    }
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [memberDetailsId])

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (moreContainerRef.current && !moreContainerRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [moreOpen])

  const toggleMemberDetails = (id: string, trigger: HTMLElement) => {
    memberTriggerRef.current = trigger
    setMemberDetailsId((current) => (current === id ? null : id))
  }
  const closeMemberDetails = (restoreFocus = false) => {
    setMemberDetailsId(null)
    if (restoreFocus) memberTriggerRef.current?.focus()
  }
  const requestRemove = (memberId: string, userId: string, name: string) => {
    setRemoveError('')
    setMemberToRemove({ memberId, userId, name })
    setMemberDetailsId(null)
  }
  const confirmRemove = async () => {
    if (!workspaceId || !memberToRemove) return
    setRemoveError('')
    try {
      await removeWorkspaceMember({ workspaceId, user_id: memberToRemove.userId }).unwrap()
      setMemberToRemove(null)
    } catch (error) {
      setRemoveError(getRequestErrorMessage(error, 'Could not remove this collaborator.'))
    }
  }
  const openShare = () => {
    setMoreOpen(false)
    setShareOpen(true)
    setShareEmail('')
    setShareError('')
  }
  const closeShare = () => {
    setShareOpen(false)
    setShareEmail('')
    setShareRole('Editor')
    setShareRoleOpen(false)
    setShareError('')
  }
  const submitShare = async () => {
    if (!workspaceId) return
    const email = shareEmail.trim().toLowerCase()
    if (!email) {
      setShareOpen(false)
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
        workspaceId,
        email,
        role: toWorkspaceApiRole(shareRole),
      }).unwrap()
      if (result.delivery.status === 'failed') {
        setShareError(`Invite was not sent: ${result.delivery.error || 'delivery failed'}`)
        return
      }
      setShareOpen(false)
      setShareEmail('')
    } catch (error) {
      setShareError(getRequestErrorMessage(error, 'Failed to send invite'))
    } finally {
      setIsSharing(false)
    }
  }

  return {
    members,
    memberDetailsId,
    memberToRemove,
    moreOpen,
    shareOpen,
    shareEmail,
    shareRole,
    shareRoleOpen,
    shareError,
    removeError,
    isSharing,
    refs: {
      memberContainerRef,
      memberDetailsRef,
      moreContainerRef,
      moreButtonRef,
      moreMenuRef,
      shareRoleButtonRef,
      shareRoleMenuRef,
    },
    actions: {
      toggleMemberDetails,
      closeMemberDetails,
      requestRemove,
      cancelRemove: () => {
        setMemberToRemove(null)
        setRemoveError('')
      },
      confirmRemove,
      toggleMore: () => setMoreOpen((open) => !open),
      closeMore: () => setMoreOpen(false),
      openShare,
      closeShare,
      setShareEmail,
      setShareRole: (role: WorkspaceMemberRole) => {
        setShareRole(role)
        setShareRoleOpen(false)
      },
      toggleShareRole: () => setShareRoleOpen((open) => !open),
      submitShare,
    },
  }
}

export type WorkspaceMembersSession = ReturnType<typeof useWorkspaceMembersSession>
