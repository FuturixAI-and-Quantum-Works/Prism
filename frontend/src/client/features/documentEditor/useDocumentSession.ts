import { useMemo } from 'react'
import { useGetDocumentSessionContextQuery } from '../documents/api/documentGovernanceApi'
import { deriveDocumentPermissions } from './documentPermissions'

export function useDocumentSession(
  documentId: string | undefined,
  documentStatus: string | null | undefined,
) {
  const { data: session, isLoading } = useGetDocumentSessionContextQuery(documentId || '', {
    skip: !documentId,
  })
  const permissions = useMemo(
    () =>
      deriveDocumentPermissions({
        documentId,
        documentStatus,
        session,
        sessionLoading: isLoading,
      }),
    [documentId, documentStatus, isLoading, session],
  )

  return { session, isLoading, permissions }
}
