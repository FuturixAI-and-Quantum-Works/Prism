import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelComplianceRun,
  hasComplianceRun,
  streamComplianceRun,
  type ComplianceReviewStatus,
} from '../../store/api/complianceApi'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  addProcess,
  removeProcess,
  selectRunningProcesses,
  updateProcessStatus,
} from '../../store/slices/pendingProcessesSlice'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import type { ComplianceScopeTarget } from './complianceModels'
import type { ComplianceResultsSession } from './useComplianceResults'

interface ComplianceRunParameters {
  syncForRun: (reviewId: string) => Promise<void>
}

interface ComplianceRunReview {
  id: string | null
  status: ComplianceReviewStatus | undefined
  documentName: string | undefined
  workspaceName: string | undefined
  refetch: () => unknown
}

export function useComplianceRun(
  target: ComplianceScopeTarget,
  review: ComplianceRunReview,
  parameters: ComplianceRunParameters,
  results: Pick<ComplianceResultsSession, 'applyRunEvent' | 'reset'>,
) {
  const dispatch = useAppDispatch()
  const runningProcesses = useAppSelector(selectRunningProcesses)
  const [isRunningLocal, setIsRunningLocal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { id: reviewId, status: reviewStatus, documentName, workspaceName, refetch } = review
  const { syncForRun } = parameters
  const { applyRunEvent, reset } = results
  const documentId = target.kind === 'document' ? target.documentId : undefined
  const workspaceId = target.kind === 'workspace' ? target.workspaceId : undefined
  const activeReviewIdRef = useRef(reviewId)
  activeReviewIdRef.current = reviewId

  const isRunningFromRedux = useMemo(
    () =>
      reviewId
        ? runningProcesses.some(
            (process) => process.type === 'compliance' && process.reviewId === reviewId,
          )
        : false,
    [reviewId, runningProcesses],
  )
  const isRunning = isRunningLocal || isRunningFromRedux

  useEffect(() => {
    setIsRunningLocal(false)
    setError(null)
    return () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [reviewId])

  useEffect(() => {
    if (
      !reviewId ||
      abortControllerRef.current ||
      (reviewStatus !== 'running' && !hasComplianceRun(reviewId))
    ) {
      return
    }

    const processId = `compliance-${reviewId}`
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsRunningLocal(true)
    setError(null)
    dispatch(
      addProcess({
        id: processId,
        type: 'compliance',
        title: 'Compliance Check',
        workspaceId,
        documentId,
        reviewId,
      }),
    )

    void streamComplianceRun({
      reviewId,
      mode: 'reconnect',
      signal: controller.signal,
      onEvent: (event) => {
        if (activeReviewIdRef.current === reviewId && abortControllerRef.current === controller) {
          applyRunEvent(event)
        }
      },
      onComplete: () => {
        if (activeReviewIdRef.current !== reviewId || abortControllerRef.current !== controller) {
          return
        }
        abortControllerRef.current = null
        setIsRunningLocal(false)
        dispatch(updateProcessStatus({ id: processId, status: 'completed' }))
        void refetch()
      },
      onError: (error) => {
        if (activeReviewIdRef.current !== reviewId || abortControllerRef.current !== controller) {
          return
        }
        abortControllerRef.current = null
        setIsRunningLocal(false)
        setError(getRequestErrorMessage(error, 'The compliance run could not be resumed.'))
        dispatch(updateProcessStatus({ id: processId, status: 'error', error: error.message }))
        void refetch()
      },
    })

    return () => {
      controller.abort()
      if (abortControllerRef.current === controller) abortControllerRef.current = null
    }
  }, [dispatch, documentId, applyRunEvent, refetch, reviewId, reviewStatus, workspaceId])

  useEffect(() => {
    if (!reviewId || !reviewStatus) return
    const runningProcess = runningProcesses.find(
      (process) => process.type === 'compliance' && process.reviewId === reviewId,
    )
    if (!runningProcess || runningProcess.status !== 'running') return

    if (reviewStatus === 'completed') {
      dispatch(updateProcessStatus({ id: runningProcess.id, status: 'completed' }))
    } else if (reviewStatus === 'failed') {
      dispatch(updateProcessStatus({ id: runningProcess.id, status: 'error' }))
    }
  }, [dispatch, reviewId, reviewStatus, runningProcesses])

  const run = useCallback(async () => {
    if (!reviewId) return

    const processId = `compliance-${reviewId}`
    const processTitle =
      target.kind === 'workspace'
        ? `Compliance Check - ${workspaceName || 'Workspace'}`
        : `Compliance Check - ${documentName || 'Document'}`

    setIsRunningLocal(true)
    setError(null)
    reset()
    dispatch(
      addProcess({
        id: processId,
        type: 'compliance',
        title: processTitle,
        workspaceId,
        documentId,
        reviewId,
      }),
    )

    try {
      await syncForRun(reviewId)
      if (activeReviewIdRef.current !== reviewId) return
      await refetch()
      if (activeReviewIdRef.current !== reviewId) return
      const controller = new AbortController()
      abortControllerRef.current = controller
      await streamComplianceRun({
        reviewId,
        mode: 'start',
        signal: controller.signal,
        onEvent: (event) => {
          if (activeReviewIdRef.current === reviewId && abortControllerRef.current === controller) {
            applyRunEvent(event)
          }
        },
        onComplete: () => {
          if (activeReviewIdRef.current !== reviewId || abortControllerRef.current !== controller) {
            return
          }
          abortControllerRef.current = null
          setIsRunningLocal(false)
          void refetch()
          dispatch(updateProcessStatus({ id: processId, status: 'completed' }))
        },
        onError: (error) => {
          if (error.name === 'AbortError') return
          if (activeReviewIdRef.current !== reviewId || abortControllerRef.current !== controller) {
            return
          }
          abortControllerRef.current = null
          setIsRunningLocal(false)
          setError(getRequestErrorMessage(error, 'The compliance run failed.'))
          dispatch(updateProcessStatus({ id: processId, status: 'error', error: String(error) }))
        },
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      if (activeReviewIdRef.current !== reviewId) return
      abortControllerRef.current = null
      setIsRunningLocal(false)
      setError(getRequestErrorMessage(error, 'The compliance run failed.'))
      dispatch(updateProcessStatus({ id: processId, status: 'error', error: String(error) }))
    }
  }, [
    dispatch,
    documentId,
    documentName,
    applyRunEvent,
    refetch,
    reset,
    reviewId,
    syncForRun,
    target.kind,
    workspaceId,
    workspaceName,
  ])

  const cancel = useCallback(async () => {
    if (!reviewId) return
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setError(null)
    try {
      await cancelComplianceRun(reviewId)
      if (activeReviewIdRef.current !== reviewId) return
      setIsRunningLocal(false)
      dispatch(removeProcess(`compliance-${reviewId}`))
      await refetch()
    } catch (error) {
      if (activeReviewIdRef.current === reviewId) {
        setError(getRequestErrorMessage(error, 'The compliance run could not be cancelled.'))
      }
    }
  }, [dispatch, refetch, reviewId])

  return { isRunning, error, run, cancel }
}
