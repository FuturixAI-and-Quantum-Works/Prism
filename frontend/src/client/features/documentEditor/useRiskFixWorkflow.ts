import { useReducer, useRef } from 'react'
import type { DocumentRisk } from '../documents/api/documentContentApi'
import { streamChat } from '../../store/api/chatApi'
import {
  collectRiskFixResult,
  createRiskFixPrompt,
  resolveRiskEdits,
  type EditAnnotationPayload,
  type RiskFixResult,
} from './riskFixModel'

interface RiskFixState {
  error: string
  open: boolean
  phase: 'prompt' | 'processing' | 'result'
  prompt: string
  result: RiskFixResult | null
  risk: DocumentRisk | null
}

type RiskFixAction =
  | { type: 'open'; risk: DocumentRisk }
  | { type: 'close' }
  | { type: 'prompt'; value: string }
  | { type: 'processing' }
  | { type: 'result'; result: RiskFixResult }
  | { type: 'error'; message: string }

const initialState: RiskFixState = {
  error: '',
  open: false,
  phase: 'prompt',
  prompt: '',
  result: null,
  risk: null,
}

export function riskFixReducer(state: RiskFixState, action: RiskFixAction): RiskFixState {
  switch (action.type) {
    case 'open':
      return {
        error: '',
        open: true,
        phase: 'prompt',
        prompt: createRiskFixPrompt(action.risk),
        result: null,
        risk: action.risk,
      }
    case 'close':
      return initialState
    case 'prompt':
      return { ...state, prompt: action.value }
    case 'processing':
      return { ...state, error: '', phase: 'processing', result: null }
    case 'result':
      return { ...state, phase: 'result', result: action.result }
    case 'error':
      return { ...state, error: action.message, phase: 'prompt' }
  }
}

interface UseRiskFixWorkflowInput {
  acceptEdit: (input: { documentId: string; editId: string }) => Promise<unknown>
  document: {
    filename?: string
    projectId?: string | null
    workspaceId?: string | null
  }
  documentId: string | undefined
  onAccepted: (risk: DocumentRisk) => void
  refresh: () => Promise<unknown>
  rejectEdit: (input: { documentId: string; editId: string }) => Promise<unknown>
}

export function useRiskFixWorkflow({
  acceptEdit,
  document,
  documentId,
  onAccepted,
  refresh,
  rejectEdit,
}: UseRiskFixWorkflowInput) {
  const [state, dispatch] = useReducer(riskFixReducer, initialState)
  const abortController = useRef<AbortController | null>(null)

  const run = async () => {
    if (!documentId || !state.prompt.trim()) return
    dispatch({ type: 'processing' })
    const controller = new AbortController()
    abortController.current = controller
    let receivedEdits = false
    try {
      await streamChat({
        messages: [
          {
            role: 'user',
            content: state.prompt,
            files: [{ filename: document.filename || 'Document', document_id: documentId }],
          },
        ],
        project_id: document.projectId || null,
        workspace_id: document.workspaceId || null,
        historyMode: 'record',
        onEvent: (event) => {
          if (event.type === 'doc_edited') {
            const annotations =
              'annotations' in event && Array.isArray(event.annotations)
                ? event.annotations.filter(
                    (annotation): annotation is EditAnnotationPayload =>
                      !!annotation && typeof annotation === 'object',
                  )
                : []
            receivedEdits = true
            dispatch({ type: 'result', result: collectRiskFixResult(annotations) })
          } else if (event.type === 'done' && !receivedEdits) {
            dispatch({
              type: 'error',
              message:
                'The AI could not make changes to the document. Please try rephrasing your request.',
            })
          } else if (event.type === 'error') {
            dispatch({ type: 'error', message: event.message || 'An error occurred' })
          }
        },
        onError: (error) =>
          dispatch({ type: 'error', message: error.message || 'An error occurred' }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        dispatch({ type: 'error', message: error.message || 'An error occurred' })
      }
    }
  }

  const decide = async (decision: 'accept' | 'reject') => {
    if (!documentId || !state.result?.editIds.length) return
    try {
      await resolveRiskEdits({
        decision,
        documentId,
        editIds: state.result.editIds,
        acceptEdit,
        rejectEdit,
      })
      if (decision === 'accept') {
        await refresh()
        if (state.risk) onAccepted(state.risk)
      }
      dispatch({ type: 'close' })
    } catch {
      dispatch({ type: 'error', message: `Failed to ${decision} changes` })
    }
  }

  return {
    accept: () => decide('accept'),
    changePrompt: (value: string) => dispatch({ type: 'prompt', value }),
    close: () => {
      abortController.current?.abort()
      dispatch({ type: 'close' })
    },
    open: (risk: DocumentRisk) => dispatch({ type: 'open', risk }),
    reject: () => decide('reject'),
    run,
    state,
  }
}

export type RiskFixWorkflowModel = ReturnType<typeof useRiskFixWorkflow>
