import { useMemo, useState } from 'react'
import type { DocumentActivity } from '../documents/api/documentGovernanceApi'
import {
  type ProductShareRole,
  useCreateDocumentInvitationMutation,
  useGetDocumentSharesQuery,
  useRemoveDocumentShareMutation,
  useUpdateDocumentShareMutation,
} from '../documents/api/documentSharingApi'
import { getAvatarColor, getInitials } from './commentsModel'
import { getRequestErrorMessage } from '../../lib/requestErrors'

interface UseDocumentSharingInput {
  activity: DocumentActivity[]
  canManage: boolean
  documentId: string | undefined
}

export function useDocumentSharing({ activity, canManage, documentId }: UseDocumentSharingInput) {
  const { data, isFetching } = useGetDocumentSharesQuery(documentId || '', {
    skip: !canManage,
  })
  const [createInvitation, { isLoading: isInviting }] = useCreateDocumentInvitationMutation()
  const [updateShare, { isLoading: isUpdating }] = useUpdateDocumentShareMutation()
  const [removeShare, { isLoading: isRemoving }] = useRemoveDocumentShareMutation()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProductShareRole>('viewer')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const activityCollaborators = useMemo(() => {
    const seen = new Set<string>()
    const result: { initials: string; color: string; name: string; active?: boolean }[] = []
    for (const entry of activity) {
      const id = entry.user_id || entry.user_email || ''
      if (!id || seen.has(id)) continue
      seen.add(id)
      result.push({
        initials: getInitials(entry.user_name, entry.user_email),
        color: getAvatarColor(id),
        name: entry.user_name || entry.user_email || 'User',
        active: result.length === 0,
      })
      if (result.length >= 5) break
    }
    return result
  }, [activity])

  const sharedCollaborators = useMemo(
    () =>
      (data?.shares ?? []).map((share, index) => ({
        initials: getInitials(null, share.email),
        color: getAvatarColor(share.user_id || share.email),
        name: share.email,
        active: index === 0,
      })),
    [data?.shares],
  )

  const invite = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!documentId || !normalizedEmail) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setNotice('')
    try {
      const result = await createInvitation({
        documentId,
        email: normalizedEmail,
        role,
      }).unwrap()
      setEmail('')
      setNotice(
        result.delivery.status === 'failed' || result.delivery.status === 'suppressed'
          ? result.delivery.error ||
              'Invite recorded, but email delivery needs a verified Resend sender domain.'
          : 'Invite sent. Access will be granted after the recipient accepts.',
      )
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Failed to send invite'))
    }
  }

  const changeRole = async (shareId: string, nextRole: ProductShareRole) => {
    if (!documentId || isUpdating) return
    setError('')
    try {
      await updateShare({ documentId, shareId, role: nextRole }).unwrap()
      setNotice('Collaborator role updated.')
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not update collaborator role.'))
    }
  }

  const remove = async (shareId: string) => {
    if (!documentId || isRemoving) return
    setError('')
    try {
      await removeShare({ documentId, shareId }).unwrap()
      setNotice('Collaborator removed.')
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not remove collaborator.'))
    }
  }

  return {
    changeRole,
    collaborators: sharedCollaborators.length > 0 ? sharedCollaborators : activityCollaborators,
    data,
    email,
    error,
    invite,
    isFetching,
    isInviting,
    isRemoving,
    isUpdating,
    notice,
    open,
    remove,
    role,
    setEmail,
    setError,
    setNotice,
    setOpen,
    setRole,
  }
}

export type DocumentSharingModel = ReturnType<typeof useDocumentSharing>
