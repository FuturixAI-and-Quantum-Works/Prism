import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import { useGetDocumentsQuery } from '../documents/api/documentCoreApi'
import { type RulebookFaq, useGenerateRulebookMutation } from '../../store/api/rulebookApi'
import { useCreateTabularReviewMutation } from '../../store/api/tabularReviewApi'
import { useCreateWorkflowMutation, usePatchWorkflowMutation } from '../../store/api/workflowsApi'
import {
  blankRulebookFaq,
  faqsFromWorkflow,
  toReviewColumns,
  toWorkflowColumns,
  type RulebookModalState,
  workflowColumnCount,
} from './rulebookModel'

export function useRulebookEditor({
  state,
  onClose,
  onCreatedReview,
}: {
  state: RulebookModalState | null
  onClose: () => void
  onCreatedReview: (reviewId: string) => void
}) {
  const open = Boolean(state)
  const editingWorkflow = state?.workflow ?? null
  const isReadOnly = Boolean(editingWorkflow && !editingWorkflow.allow_edit)
  const { data: documents = [], isLoading: docsLoading } = useGetDocumentsQuery({}, { skip: !open })
  const [generateRulebook, { isLoading: isGenerating }] = useGenerateRulebookMutation()
  const [createWorkflow, { isLoading: isCreatingWorkflow }] = useCreateWorkflowMutation()
  const [patchWorkflow, { isLoading: isPatchingWorkflow }] = usePatchWorkflowMutation()
  const [createReview, { isLoading: isCreatingReview }] = useCreateTabularReviewMutation()
  const [documentType, setDocumentType] = useState('')
  const [sampleDocumentId, setSampleDocumentId] = useState('')
  const [targetDocIds, setTargetDocIds] = useState<string[]>([])
  const [extraRequirements, setExtraRequirements] = useState('')
  const [queryCount, setQueryCount] = useState(12)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftFaqs, setDraftFaqs] = useState<RulebookFaq[]>([])
  const [activeView, setActiveView] = useState<'checklist' | 'columns'>('checklist')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setTargetDocIds([])
    setActiveView('checklist')
    if (editingWorkflow) {
      setDocumentType(editingWorkflow.practice || '')
      setSampleDocumentId('')
      setExtraRequirements(editingWorkflow.promptMd || '')
      setDraftTitle(editingWorkflow.title)
      setDraftFaqs(faqsFromWorkflow(editingWorkflow))
      setQueryCount(Math.max(4, Math.min(30, workflowColumnCount(editingWorkflow) || 12)))
    } else {
      setDocumentType('')
      setSampleDocumentId('')
      setExtraRequirements('')
      setDraftTitle('')
      setDraftFaqs([])
      setQueryCount(12)
    }
  }, [editingWorkflow, open])

  const saving = isCreatingWorkflow || isPatchingWorkflow || isCreatingReview
  const canSave =
    !isReadOnly &&
    draftFaqs.length > 0 &&
    Boolean(documentType.trim()) &&
    Boolean(draftTitle.trim())

  const updateFaq = (id: string, patch: Partial<RulebookFaq>) => {
    setDraftFaqs((current) => current.map((faq) => (faq.id === id ? { ...faq, ...patch } : faq)))
  }

  const moveFaq = (id: string, direction: -1 | 1) => {
    setDraftFaqs((current) => {
      const index = current.findIndex((faq) => faq.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  const generate = async (event: FormEvent) => {
    event.preventDefault()
    if (!documentType.trim() || isGenerating) {
      setError('Document type is required.')
      return
    }
    setError('')
    try {
      const result = await generateRulebook({
        document_type: documentType.trim(),
        sample_document_id: sampleDocumentId || null,
        extra_requirements: extraRequirements.trim() || null,
        count: queryCount,
      }).unwrap()
      setDraftTitle(result.title)
      setDraftFaqs(result.faqs)
      setActiveView('checklist')
    } catch (caught) {
      setError(getRequestErrorMessage(caught, 'Something went wrong.'))
    }
  }

  const saveRulebook = async () => {
    const columns = toWorkflowColumns(draftFaqs)
    const title = draftTitle.trim() || `${documentType.trim()} Rulebook`
    if (editingWorkflow) {
      return patchWorkflow({
        workflowId: editingWorkflow.id,
        title,
        prompt_md: extraRequirements.trim(),
        practice: documentType.trim(),
        columns_config: columns,
      }).unwrap()
    }
    return createWorkflow({
      title,
      type: 'tabular',
      prompt_md: extraRequirements.trim(),
      practice: documentType.trim(),
      columns_config: columns,
    }).unwrap()
  }

  const save = async () => {
    if (!canSave || saving) return
    setError('')
    try {
      await saveRulebook()
      onClose()
    } catch (caught) {
      setError(getRequestErrorMessage(caught, 'Something went wrong.'))
    }
  }

  const saveAndCreateReview = async () => {
    if (!canSave || saving) return
    if (targetDocIds.length === 0) {
      setError('Select at least one target document.')
      return
    }
    setError('')
    try {
      const workflow = await saveRulebook()
      const review = await createReview({
        title: `${workflow.title} review`,
        workflow_id: workflow.id,
        document_ids: targetDocIds,
        columns_config: toReviewColumns(draftFaqs),
      }).unwrap()
      onClose()
      onCreatedReview(review.id)
    } catch (caught) {
      setError(getRequestErrorMessage(caught, 'Something went wrong.'))
    }
  }

  return {
    open,
    editingWorkflow,
    isReadOnly,
    documents,
    docsLoading,
    isGenerating,
    documentType,
    sampleDocumentId,
    targetDocIds,
    extraRequirements,
    queryCount,
    draftTitle,
    draftFaqs,
    activeView,
    error,
    saving,
    canSave,
    actions: {
      onClose,
      setDocumentType,
      setSampleDocumentId,
      setTargetDocIds,
      setExtraRequirements,
      setQueryCount,
      setDraftTitle,
      setActiveView,
      updateFaq,
      moveFaq,
      removeFaq: (id: string) => setDraftFaqs((current) => current.filter((faq) => faq.id !== id)),
      addFaq: () => setDraftFaqs((current) => [...current, blankRulebookFaq(current.length)]),
      generate,
      save,
      saveAndCreateReview,
    },
  }
}

export type RulebookEditorSession = ReturnType<typeof useRulebookEditor>
