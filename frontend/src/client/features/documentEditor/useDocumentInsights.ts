import { useEffect, useRef, useState } from 'react'
import { useLazyGetDocumentInsightsQuery } from '../documents/api/documentContentApi'
import { removeResolvedRisk } from './riskFixModel'

export function useDocumentInsights({
  active,
  documentId,
}: {
  active: boolean
  documentId: string | undefined
}) {
  const requestedDocumentId = useRef<string | null>(null)
  const [load, { data: queryData, isLoading: isLoadingInitial, isFetching, error }] =
    useLazyGetDocumentInsightsQuery()
  const [cached, setCached] = useState<typeof queryData | null>(null)

  useEffect(() => {
    if (queryData) setCached(queryData)
  }, [queryData])

  useEffect(() => {
    if (!active || !documentId || requestedDocumentId.current === documentId) return
    requestedDocumentId.current = documentId
    void load(documentId, true)
  }, [active, documentId, load])

  return {
    data: cached || queryData,
    error,
    isLoading: isLoadingInitial || isFetching,
    refresh: () => (documentId ? load(documentId, false) : undefined),
    removeRisk: (title: string) => setCached((current) => removeResolvedRisk(current, title)),
  }
}

export type DocumentInsightsModel = ReturnType<typeof useDocumentInsights>
