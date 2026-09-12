import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  addProcess,
  removeProcess,
  selectRunningProcesses,
  updateProcessStatus,
} from '../../store/slices/pendingProcessesSlice'
import {
  cancelTabularGenerate,
  cancelTabularRegenerate,
  hasTabularGenerateRun,
  hasTabularRegenerateRun,
  streamTabularGenerate,
  streamTabularRegenerate,
  type TabularGenerateEvent,
} from '../../store/api/tabularReviewApi'

export type ReviewGenerationOperation = 'generate' | 'regenerate-cell'

interface ReviewGenerationCallbacks {
  beforeStream?: () => void | Promise<void>
  onEvent: (event: TabularGenerateEvent) => void
  onComplete: () => void
  onError: (error: Error) => void
}

interface UseReviewGenerationOptions {
  reviewId: string
  cells: readonly { status: string }[] | undefined
  onReconnectEvent: (event: TabularGenerateEvent) => void
  onReconnectError?: (error: Error) => void
  refetch: () => unknown | Promise<unknown>
}

interface RegenerateCellTarget {
  documentId: string
  columnIndex: number
}

export function chooseReviewReconnectOperation({
  hasGenerateRun,
  hasRegenerateRun,
  hasGeneratingCells,
}: {
  hasGenerateRun: boolean
  hasRegenerateRun: boolean
  hasGeneratingCells: boolean
}): ReviewGenerationOperation | null {
  if (hasRegenerateRun) return 'regenerate-cell'
  if (hasGenerateRun || hasGeneratingCells) return 'generate'
  return null
}

export function useReviewGeneration({
  reviewId,
  cells,
  onReconnectEvent,
  onReconnectError,
  refetch,
}: UseReviewGenerationOptions) {
  const dispatch = useAppDispatch()
  const runningProcesses = useAppSelector(selectRunningProcesses)
  const controllerRef = useRef<AbortController | null>(null)
  const operationRef = useRef<ReviewGenerationOperation>('generate')
  const reconnectCallbacksRef = useRef({ onReconnectEvent, onReconnectError, refetch })
  const [generating, setGenerating] = useState(false)
  reconnectCallbacksRef.current = { onReconnectEvent, onReconnectError, refetch }

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!cells || cells.length === 0) return
    const runningProcess = runningProcesses.find(
      (process) => process.type === 'tabular_review' && process.reviewId === reviewId,
    )
    if (!runningProcess || cells.some((cell) => cell.status === 'generating')) return

    dispatch(
      updateProcessStatus({
        id: runningProcess.id,
        status: cells.some((cell) => cell.status === 'error') ? 'error' : 'completed',
      }),
    )
  }, [cells, dispatch, reviewId, runningProcesses])

  const hasGeneratingCells = Boolean(cells?.some((cell) => cell.status === 'generating'))

  useEffect(() => {
    const operation = chooseReviewReconnectOperation({
      hasGenerateRun: hasTabularGenerateRun(reviewId),
      hasRegenerateRun: hasTabularRegenerateRun(reviewId),
      hasGeneratingCells,
    })
    if (!operation || controllerRef.current) return

    const processId = `tabular-${reviewId}`
    const controller = new AbortController()
    controllerRef.current = controller
    operationRef.current = operation
    setGenerating(true)
    dispatch(
      addProcess({
        id: processId,
        type: 'tabular_review',
        title: 'Tabular Review Generation',
        status: 'running',
        reviewId,
      }),
    )

    const reconnect =
      operation === 'regenerate-cell' ? streamTabularRegenerate : streamTabularGenerate
    void reconnect({
      reviewId,
      mode: 'reconnect',
      signal: controller.signal,
      onEvent: (event) => reconnectCallbacksRef.current.onReconnectEvent(event),
      onComplete: () => {
        controllerRef.current = null
        setGenerating(false)
        dispatch(updateProcessStatus({ id: processId, status: 'completed' }))
        void reconnectCallbacksRef.current.refetch()
      },
      onError: (error) => {
        controllerRef.current = null
        setGenerating(false)
        reconnectCallbacksRef.current.onReconnectError?.(error)
        dispatch(updateProcessStatus({ id: processId, status: 'error', error: error.message }))
        void reconnectCallbacksRef.current.refetch()
      },
    })

    return () => {
      controller.abort()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [dispatch, hasGeneratingCells, reviewId])

  async function startGeneration(callbacks: ReviewGenerationCallbacks) {
    const processId = `tabular-${reviewId}`
    const controller = new AbortController()
    controllerRef.current = controller
    operationRef.current = 'generate'
    setGenerating(true)
    dispatch(
      addProcess({
        id: processId,
        type: 'tabular_review',
        title: 'Tabular Review Generation',
        status: 'running',
        reviewId,
      }),
    )

    await callbacks.beforeStream?.()
    await streamTabularGenerate({
      reviewId,
      mode: 'start',
      signal: controller.signal,
      onEvent: callbacks.onEvent,
      onComplete: () => {
        controllerRef.current = null
        setGenerating(false)
        dispatch(updateProcessStatus({ id: processId, status: 'completed' }))
        callbacks.onComplete()
      },
      onError: (error) => {
        if (error.name === 'AbortError') return
        controllerRef.current = null
        setGenerating(false)
        dispatch(updateProcessStatus({ id: processId, status: 'error', error: error.message }))
        callbacks.onError(error)
      },
    })
  }

  async function startRegeneration(
    target: RegenerateCellTarget,
    callbacks: ReviewGenerationCallbacks,
  ) {
    const controller = new AbortController()
    controllerRef.current = controller
    operationRef.current = 'regenerate-cell'
    setGenerating(true)

    await streamTabularRegenerate({
      reviewId,
      mode: 'start',
      documentId: target.documentId,
      columnIndex: target.columnIndex,
      signal: controller.signal,
      onEvent: callbacks.onEvent,
      onComplete: () => {
        controllerRef.current = null
        setGenerating(false)
        callbacks.onComplete()
      },
      onError: (error) => {
        controllerRef.current = null
        setGenerating(false)
        callbacks.onError(error)
      },
    })
  }

  async function cancel() {
    controllerRef.current?.abort()
    controllerRef.current = null
    if (operationRef.current === 'regenerate-cell') {
      await cancelTabularRegenerate(reviewId)
    } else {
      await cancelTabularGenerate(reviewId)
    }
    setGenerating(false)
    dispatch(removeProcess(`tabular-${reviewId}`))
    await refetch()
  }

  return {
    generating,
    startGeneration,
    startRegeneration,
    cancel,
  }
}
