import { useMemo } from 'react'
import { useGetDocumentQuery, useGetDocumentsQuery } from '../documents/api/documentCoreApi'
import {
  useGetComplianceReviewQuery,
  useGetComplianceReviewForDocumentQuery,
  useGetComplianceReviewForWorkspaceQuery,
} from '../../store/api/complianceApi'
import { useGetDriveFilesQuery } from '../../store/api/drive/driveFileApi'
import { useGetDriveWorkspaceQuery } from '../../store/api/drive/driveWorkspaceApi'
import {
  buildWorkspaceFiles,
  type ComplianceScopeTarget,
  type ComplianceTarget,
  type SelectedComplianceDocument,
} from './complianceModels'

export function useComplianceReviewData(
  target: ComplianceTarget,
  selectedDocuments: SelectedComplianceDocument[] | undefined,
) {
  const requestedReviewId = target.kind === 'review' ? target.reviewId : undefined
  const requestedDocumentId = target.kind === 'document' ? target.documentId : undefined
  const requestedWorkspaceId = target.kind === 'workspace' ? target.workspaceId : undefined

  const { currentData: reviewComplianceData, refetch: refetchReviewCompliance } =
    useGetComplianceReviewQuery(requestedReviewId || '', {
      skip: !requestedReviewId,
    })
  const documentId =
    requestedDocumentId ??
    reviewComplianceData?.review.primaryDocumentId ??
    reviewComplianceData?.primaryDocument?.id
  const workspaceId = requestedWorkspaceId ?? reviewComplianceData?.review.workspaceId ?? undefined
  const isWorkspace = Boolean(workspaceId)
  const scopeTarget: ComplianceScopeTarget = workspaceId
    ? { kind: 'workspace', workspaceId }
    : { kind: 'document', documentId }

  const { currentData: primaryDocument, isLoading: isPrimaryDocumentLoading } = useGetDocumentQuery(
    documentId || '',
    { skip: !documentId },
  )
  const { currentData: workspace } = useGetDriveWorkspaceQuery(workspaceId || '', {
    skip: !isWorkspace,
  })
  const { currentData: driveFilesData } = useGetDriveFilesQuery(
    { workspace_id: workspaceId },
    { skip: !isWorkspace },
  )
  const { currentData: workspaceDocuments } = useGetDocumentsQuery(
    { workspace_id: workspaceId },
    { skip: !isWorkspace },
  )

  const { currentData: documentComplianceData, refetch: refetchDocumentCompliance } =
    useGetComplianceReviewForDocumentQuery(
      { documentId: documentId || '' },
      { skip: target.kind !== 'document' },
    )
  const { currentData: workspaceComplianceData, refetch: refetchWorkspaceCompliance } =
    useGetComplianceReviewForWorkspaceQuery(
      { workspaceId: workspaceId || '' },
      { skip: target.kind !== 'workspace' },
    )

  const resolvedComplianceData =
    target.kind === 'review'
      ? reviewComplianceData
      : target.kind === 'workspace'
        ? workspaceComplianceData
        : documentComplianceData
  const workspaceFiles = useMemo(
    () => buildWorkspaceFiles(selectedDocuments, driveFilesData?.files || [], workspaceDocuments),
    [driveFilesData?.files, selectedDocuments, workspaceDocuments],
  )

  return {
    target,
    scopeTarget,
    isWorkspace,
    documentId,
    workspaceId,
    primaryDocument,
    isPrimaryDocumentLoading,
    workspace,
    workspaceFiles,
    complianceData: resolvedComplianceData,
    reviewId: resolvedComplianceData?.review.id ?? null,
    refetchCompliance:
      target.kind === 'review'
        ? refetchReviewCompliance
        : target.kind === 'workspace'
          ? refetchWorkspaceCompliance
          : refetchDocumentCompliance,
  }
}
