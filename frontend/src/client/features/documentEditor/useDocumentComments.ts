import { useMemo, useState } from 'react'
import {
  useCreateDocumentCommentMutation,
  useGetDocumentCommentsQuery,
  useUpdateDocumentCommentMutation,
} from '../documents/api/documentGovernanceApi'
import { mapDocumentComments, type EditorComment } from './commentsModel'

interface UseDocumentCommentsInput {
  documentId: string | undefined
  currentVersionId: string | null
  canComment: boolean
}

export function useDocumentComments({
  documentId,
  currentVersionId,
  canComment,
}: UseDocumentCommentsInput) {
  const {
    data: persistedComments = [],
    isLoading,
    isError,
    refetch,
  } = useGetDocumentCommentsQuery(documentId || '', { skip: !documentId })
  const [createComment, { isLoading: isCreating }] = useCreateDocumentCommentMutation()
  const [updateComment] = useUpdateDocumentCommentMutation()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const comments = useMemo(() => mapDocumentComments(persistedComments), [persistedComments])

  const add = async () => {
    if (!documentId || !text.trim() || isCreating) return
    if (!canComment) {
      setError('Your current document role cannot add comments.')
      return
    }

    setError('')
    try {
      await createComment({
        documentId,
        body: text.trim(),
        version_id: currentVersionId,
        anchor_text: window.getSelection()?.toString().trim() || null,
      }).unwrap()
      setText('')
    } catch {
      setError('Could not save the comment. Please try again.')
    }
  }

  const addText = async (body: string) => {
    if (!documentId || !canComment || !body.trim()) return false
    try {
      await createComment({
        documentId,
        body: body.trim(),
        version_id: currentVersionId,
      }).unwrap()
      return true
    } catch {
      return false
    }
  }

  const toggleResolved = async (comment: EditorComment) => {
    if (!documentId) return
    try {
      await updateComment({
        documentId,
        commentId: comment.id,
        resolved: !comment.resolved,
      }).unwrap()
    } catch {
      setError('Could not update the comment. Please try again.')
    }
  }

  return {
    add,
    addText,
    comments,
    error,
    isCreating,
    isError,
    isLoading,
    refetch,
    setText,
    text,
    toggleResolved,
  }
}

export type DocumentCommentsModel = ReturnType<typeof useDocumentComments>
