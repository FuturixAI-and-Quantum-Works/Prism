import { useCallback, useEffect, useState } from 'react'
import type { ComplianceReviewResponse, ComplianceRunEvent } from '../../store/api/complianceApi'
import { emptyComplianceResultState, projectComplianceResults } from './complianceResultsModel'

export function useComplianceResults(data: ComplianceReviewResponse | undefined) {
  const [state, setState] = useState(emptyComplianceResultState)

  useEffect(() => {
    setState((current) =>
      data
        ? projectComplianceResults(current, { type: 'hydrate', data })
        : emptyComplianceResultState(),
    )
  }, [data])

  const reset = useCallback(() => {
    setState((current) => projectComplianceResults(current, { type: 'reset' }))
  }, [])

  const applyRunEvent = useCallback((event: ComplianceRunEvent) => {
    setState((current) => projectComplianceResults(current, { type: 'sse', event }))
  }, [])

  return {
    state,
    reset,
    applyRunEvent,
  }
}

export type ComplianceResultsSession = ReturnType<typeof useComplianceResults>
