import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useAddComplianceQuestionMutation,
  useAddComplianceRuleMutation,
  useRemoveComplianceQuestionMutation,
  useRemoveComplianceRuleMutation,
  useUpdateComplianceQuestionMutation,
  useUpdateComplianceRuleMutation,
  type ComplianceReviewResponse,
} from '../../store/api/complianceApi'
import { useGetWorkflowsQuery, type Workflow } from '../../store/api/workflowsApi'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import type { ReviewQuestion, ReviewRule } from './complianceModels'

export function useComplianceParameters(
  reviewId: string | null,
  complianceData: ComplianceReviewResponse | undefined,
  selectedRulebookId: string | null | undefined,
) {
  const [reviewRules, setReviewRules] = useState<ReviewRule[]>([])
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rulebookPickerOpen, setRulebookPickerOpen] = useState(false)
  const [questionRulebookPickerOpen, setQuestionRulebookPickerOpen] = useState(false)
  const [reviewSetupChoiceOpen, setReviewSetupChoiceOpen] = useState(false)
  const [reviewSetupChoiceType, setReviewSetupChoiceType] = useState<'rule' | 'question'>('rule')
  const [rulebookImported, setRulebookImported] = useState(false)
  const activeReviewIdRef = useRef(reviewId)
  const hydratedReviewKeyRef = useRef<string | null | undefined>(undefined)
  activeReviewIdRef.current = reviewId

  const [addRule] = useAddComplianceRuleMutation()
  const [addQuestion] = useAddComplianceQuestionMutation()
  const [removeRule] = useRemoveComplianceRuleMutation()
  const [removeQuestion] = useRemoveComplianceQuestionMutation()
  const [updateRule] = useUpdateComplianceRuleMutation()
  const [updateQuestion] = useUpdateComplianceQuestionMutation()
  const { data: workflows = [] } = useGetWorkflowsQuery(
    { type: 'tabular' },
    { skip: !selectedRulebookId },
  )
  const selectedRulebook = useMemo(
    () =>
      selectedRulebookId && workflows.length
        ? workflows.find((workflow) => workflow.id === selectedRulebookId) || null
        : null,
    [selectedRulebookId, workflows],
  )

  useEffect(() => {
    const dataMatchesReview = complianceData?.review.id === reviewId
    const nextReviewKey = dataMatchesReview
      ? `${complianceData.review.id}:${complianceData.review.status}`
      : reviewId
        ? `${reviewId}:unresolved`
        : null
    if (hydratedReviewKeyRef.current === nextReviewKey) return
    hydratedReviewKeyRef.current = nextReviewKey
    setReviewRules(
      dataMatchesReview
        ? complianceData.rules.map((rule) => ({
            id: rule.id,
            content: rule.content,
          }))
        : [],
    )
    setQuestions(
      dataMatchesReview
        ? complianceData.questions.map((question) => ({
            id: question.id,
            content: question.content,
          }))
        : [],
    )
    setError(null)
    setRulebookImported(false)
  }, [complianceData, reviewId])

  const addEmptyRule = useCallback(async () => {
    if (!reviewId) return
    setError(null)
    try {
      const result = await addRule({ reviewId, content: '' }).unwrap()
      if (activeReviewIdRef.current !== reviewId) return
      setReviewRules((current) => [{ id: result.id, content: '' }, ...current])
    } catch (error) {
      if (activeReviewIdRef.current === reviewId) {
        setError(getRequestErrorMessage(error, 'Could not add the review rule.'))
      }
    }
  }, [addRule, reviewId])

  const addEmptyQuestion = useCallback(async () => {
    if (!reviewId) return
    setError(null)
    try {
      const result = await addQuestion({ reviewId, content: '' }).unwrap()
      if (activeReviewIdRef.current !== reviewId) return
      setQuestions((current) => [{ id: result.id, content: '' }, ...current])
    } catch (error) {
      if (activeReviewIdRef.current === reviewId) {
        setError(getRequestErrorMessage(error, 'Could not add the question.'))
      }
    }
  }, [addQuestion, reviewId])

  const openRuleSetup = () => {
    setReviewSetupChoiceType('rule')
    setReviewSetupChoiceOpen(true)
  }
  const openQuestionSetup = () => {
    setReviewSetupChoiceType('question')
    setReviewSetupChoiceOpen(true)
  }
  const chooseSetup = (choice: 'preset' | 'blank') => {
    setReviewSetupChoiceOpen(false)
    if (choice === 'preset') {
      if (reviewSetupChoiceType === 'rule') setRulebookPickerOpen(true)
      else setQuestionRulebookPickerOpen(true)
    } else if (reviewSetupChoiceType === 'rule') {
      void addEmptyRule()
    } else {
      void addEmptyQuestion()
    }
  }

  const selectRulebook = (workflow: Workflow) => {
    if (workflow.columnsConfig?.length) {
      const newRules: ReviewRule[] = workflow.columnsConfig.map((column, index) => ({
        id: `rule-${Date.now()}-${index}`,
        content: column.prompt || '',
        rulebookTitle: (column.name || '').replace(/_/g, ' '),
      }))
      setReviewRules((current) => [...current.filter((rule) => !rule.preset), ...newRules])
    }
    setRulebookPickerOpen(false)
  }

  const selectRulebookForQuestions = (workflow: Workflow) => {
    if (workflow.columnsConfig?.length) {
      const newQuestions: ReviewQuestion[] = workflow.columnsConfig.map((column, index) => ({
        id: `question-${Date.now()}-${index}`,
        content: column.question || '',
        rulebookTitle: (column.name || '').replace(/_/g, ' '),
      }))
      setQuestions((current) => [...current, ...newQuestions])
    }
    setQuestionRulebookPickerOpen(false)
  }

  const importSelectedRulebook = () => {
    if (!selectedRulebook?.columnsConfig || rulebookImported) return
    setReviewRules(
      selectedRulebook.columnsConfig.map((column, index) => ({
        id: `rule-${Date.now()}-${index}`,
        content: column.prompt || '',
        rulebookTitle: (column.name || '').replace(/_/g, ' '),
      })),
    )
    setRulebookImported(true)
  }

  const removeReviewRule = async (ruleId: string) => {
    setError(null)
    try {
      if (reviewId && !ruleId.startsWith('rule-')) {
        await removeRule({ reviewId, ruleId }).unwrap()
      }
      if (activeReviewIdRef.current === reviewId) {
        setReviewRules((current) => current.filter((rule) => rule.id !== ruleId))
      }
    } catch (error) {
      if (activeReviewIdRef.current === reviewId) {
        setError(getRequestErrorMessage(error, 'Could not remove the review rule.'))
      }
    }
  }

  const removeReviewQuestion = async (questionId: string) => {
    setError(null)
    try {
      if (reviewId && !questionId.startsWith('question-')) {
        await removeQuestion({ reviewId, questionId }).unwrap()
      }
      if (activeReviewIdRef.current === reviewId) {
        setQuestions((current) => current.filter((question) => question.id !== questionId))
      }
    } catch (error) {
      if (activeReviewIdRef.current === reviewId) {
        setError(getRequestErrorMessage(error, 'Could not remove the question.'))
      }
    }
  }

  const syncForRun = useCallback(
    async (activeReviewId: string) => {
      setError(null)
      try {
        for (const rule of reviewRules) {
          if (activeReviewIdRef.current !== activeReviewId) {
            throw new Error('The active compliance review changed')
          }
          if (rule.id.startsWith('rule-')) {
            const persisted = await addRule({
              reviewId: activeReviewId,
              content: rule.content,
            }).unwrap()
            if (activeReviewIdRef.current === activeReviewId) {
              setReviewRules((current) =>
                current.map((candidate) =>
                  candidate.id === rule.id ? { ...candidate, id: persisted.id } : candidate,
                ),
              )
            }
          } else {
            await updateRule({
              reviewId: activeReviewId,
              ruleId: rule.id,
              content: rule.content,
            }).unwrap()
          }
        }
        for (const question of questions) {
          if (activeReviewIdRef.current !== activeReviewId) {
            throw new Error('The active compliance review changed')
          }
          if (question.id.startsWith('question-')) {
            const persisted = await addQuestion({
              reviewId: activeReviewId,
              content: question.content,
            }).unwrap()
            if (activeReviewIdRef.current === activeReviewId) {
              setQuestions((current) =>
                current.map((candidate) =>
                  candidate.id === question.id ? { ...candidate, id: persisted.id } : candidate,
                ),
              )
            }
          } else {
            await updateQuestion({
              reviewId: activeReviewId,
              questionId: question.id,
              content: question.content,
            }).unwrap()
          }
        }
      } catch (error) {
        if (activeReviewIdRef.current === activeReviewId) {
          setError(getRequestErrorMessage(error, 'Could not save the compliance parameters.'))
        }
        throw error
      }
    },
    [addQuestion, addRule, questions, reviewRules, updateQuestion, updateRule],
  )

  return {
    reviewRules,
    questions,
    error,
    hasParameters: reviewRules.length > 0 || questions.length > 0,
    selectedRulebook,
    rulebookImported,
    importSelectedRulebook,
    openRuleSetup,
    openQuestionSetup,
    updateRule: (ruleId: string, content: string) => {
      setReviewRules((current) =>
        current.map((rule) => (rule.id === ruleId ? { ...rule, content } : rule)),
      )
    },
    updateQuestion: (questionId: string, content: string) => {
      setQuestions((current) =>
        current.map((question) =>
          question.id === questionId ? { ...question, content } : question,
        ),
      )
    },
    removeRule: removeReviewRule,
    removeQuestion: removeReviewQuestion,
    syncForRun,
    dialogs: {
      rulebookPickerOpen,
      setRulebookPickerOpen,
      questionRulebookPickerOpen,
      setQuestionRulebookPickerOpen,
      reviewSetupChoiceOpen,
      setReviewSetupChoiceOpen,
      chooseSetup,
      selectRulebook,
      selectRulebookForQuestions,
      addEmptyRule,
      addEmptyQuestion,
    },
  }
}

export type ComplianceParameters = ReturnType<typeof useComplianceParameters>
