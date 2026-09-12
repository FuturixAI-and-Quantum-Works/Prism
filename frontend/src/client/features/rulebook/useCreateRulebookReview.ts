import { useEffect, useState } from 'react'
import { useGetDocumentsQuery } from '../documents/api/documentCoreApi'
import { useCreateTabularReviewMutation } from '../../store/api/tabularReviewApi'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import type { RulebookWorkflow } from './rulebookModel'

export function useCreateRulebookReview({
  workflow,
  onClose,
  onCreated,
}: {
  workflow: RulebookWorkflow
  onClose: () => void
  onCreated: (reviewId: string) => void
}) {
  const { data: documents = [], isLoading: docsLoading } = useGetDocumentsQuery({})
  const [createReview, { isLoading: isCreating }] = useCreateTabularReviewMutation()
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setSelectedDocIds([])
    setTitle(`${workflow.title} review`)
    setError('')
  }, [workflow])

  const create = async () => {
    if (selectedDocIds.length === 0 || isCreating) return
    try {
      const review = await createReview({
        title: title.trim() || `${workflow.title} review`,
        workflow_id: workflow.id,
        document_ids: selectedDocIds,
        columns_config: (workflow.columnsConfig ?? []).map((column, index) => ({
          id: column.id,
          index,
          name: column.name,
          prompt: column.prompt || '',
          format: column.format,
          tags: column.tags,
          width: column.width,
        })),
      }).unwrap()
      onClose()
      onCreated(review.id)
    } catch (caught) {
      setError(getRequestErrorMessage(caught, 'Something went wrong.'))
    }
  }

  return {
    documents,
    docsLoading,
    isCreating,
    selectedDocIds,
    title,
    error,
    actions: { setSelectedDocIds, setTitle, create },
  }
}
