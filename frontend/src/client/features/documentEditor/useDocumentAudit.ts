import { useState } from 'react'
import {
  type DocumentActivity,
  useGetDocumentActivityQuery,
} from '../documents/api/documentGovernanceApi'

export function useDocumentAudit(documentId: string | undefined) {
  const {
    data: activity = [],
    isLoading,
    isError,
    refetch,
  } = useGetDocumentActivityQuery(documentId || '', { skip: !documentId })
  const [selected, setSelected] = useState<DocumentActivity | null>(null)

  return {
    activity,
    isError,
    isLoading,
    refetch,
    selected,
    select: setSelected,
  }
}

export type DocumentAuditModel = ReturnType<typeof useDocumentAudit>
