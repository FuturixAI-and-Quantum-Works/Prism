import { useState } from 'react'
import {
  type RejectionTarget,
  useTransitionDocumentLifecycleMutation,
} from '../documents/api/documentGovernanceApi'
import { getRequestErrorMessage } from '../../lib/requestErrors'

interface UseDocumentApprovalInput {
  canReview: boolean
  canSend: boolean
  documentId: string | undefined
  refresh: () => Promise<unknown>
}

export function useDocumentApproval({
  canReview,
  canSend,
  documentId,
  refresh,
}: UseDocumentApprovalInput) {
  const [transition, { isLoading }] = useTransitionDocumentLifecycleMutation()
  const [sendOpen, setSendOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [sendError, setSendError] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [rejectPage, setRejectPage] = useState('')
  const [rejectSection, setRejectSection] = useState('')
  const [rejectAnchor, setRejectAnchor] = useState('')

  const send = async () => {
    if (!documentId || !canSend || isLoading) return
    setSendError('')
    try {
      await transition({ documentId, action: 'send-approval' }).unwrap()
      setSendOpen(false)
      await refresh()
    } catch (error) {
      setSendError(getRequestErrorMessage(error, 'Could not send this document for approval.'))
    }
  }

  const approve = async () => {
    if (!documentId || !canReview || isLoading) return
    setReviewError('')
    try {
      await transition({ documentId, action: 'approve' }).unwrap()
      setApproveOpen(false)
      await refresh()
    } catch (error) {
      setReviewError(getRequestErrorMessage(error, 'Could not approve this document.'))
    }
  }

  const reject = async () => {
    if (!documentId || !canReview || isLoading) return
    const note = rejectNote.trim()
    if (!note) {
      setReviewError('Add a rejection reason before sending it back.')
      return
    }

    const pageNumber = Number(rejectPage)
    const rejectionTarget: RejectionTarget = {
      page_number: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null,
      section_ref: rejectSection.trim() || null,
      anchor_text: rejectAnchor.trim() || null,
    }
    setReviewError('')
    try {
      await transition({
        documentId,
        action: 'reject',
        note,
        rejection_target: rejectionTarget,
      }).unwrap()
      setRejectOpen(false)
      setRejectNote('')
      setRejectPage('')
      setRejectSection('')
      setRejectAnchor('')
      await refresh()
    } catch (error) {
      setReviewError(getRequestErrorMessage(error, 'Could not reject this document.'))
    }
  }

  return {
    approve,
    approveOpen,
    closeAll: () => {
      setSendOpen(false)
      setApproveOpen(false)
      setRejectOpen(false)
    },
    isLoading,
    openApprove: () => {
      setReviewError('')
      setApproveOpen(true)
    },
    openReject: () => {
      setReviewError('')
      setRejectNote('')
      setRejectPage('')
      setRejectSection('')
      setRejectAnchor('')
      setRejectOpen(true)
    },
    openSend: () => {
      setSendError('')
      setSendOpen(true)
    },
    reject,
    rejectAnchor,
    rejectNote,
    rejectOpen,
    rejectPage,
    rejectSection,
    reviewError,
    send,
    sendError,
    sendOpen,
    setApproveOpen,
    setRejectAnchor,
    setRejectNote,
    setRejectOpen,
    setRejectPage,
    setRejectSection,
    setReviewError,
    setSendError,
    setSendOpen,
  }
}
