import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { FilePreviewFile } from '../../components/FilePreviewModal'
import {
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
  useUpdateDocumentMutation,
  useUploadDocumentMutation,
} from '../documents/api/documentCoreApi'
import {
  useAddComplianceSupportingDocMutation,
  useRemoveComplianceSupportingDocMutation,
  type ComplianceReviewResponse,
} from '../../store/api/complianceApi'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import type { BrowseFile } from '../files/fileBrowserTypes'
import type { ComplianceScopeTarget, SupportingDocument } from './complianceModels'
import { toBrowseFiles } from './reviewListModel'

export function useComplianceSources(
  target: ComplianceScopeTarget,
  reviewId: string | null,
  complianceData: ComplianceReviewResponse | undefined,
) {
  const { data: apiDocuments } = useGetDocumentsQuery()
  const [deleteDocument] = useDeleteDocumentMutation()
  const [updateDocument] = useUpdateDocumentMutation()
  const [uploadDocument] = useUploadDocumentMutation()
  const [addSupportingDocument] = useAddComplianceSupportingDocMutation()
  const [removeSupportingDocument] = useRemoveComplianceSupportingDocMutation()
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([])
  const [error, setError] = useState<string | null>(null)
  const [browseFilesOpen, setBrowseFilesOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FilePreviewFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const activeReviewIdRef = useRef(reviewId)
  const hydratedReviewKeyRef = useRef<string | null | undefined>(undefined)
  activeReviewIdRef.current = reviewId
  const browseFiles = useMemo(() => toBrowseFiles(apiDocuments), [apiDocuments])

  useEffect(() => {
    const dataMatchesReview = complianceData?.review.id === reviewId
    const nextReviewKey = dataMatchesReview
      ? `${complianceData.review.id}:${complianceData.review.status}`
      : reviewId
        ? `${reviewId}:unresolved`
        : null
    if (hydratedReviewKeyRef.current === nextReviewKey) return
    hydratedReviewKeyRef.current = nextReviewKey
    setSupportingDocuments(
      dataMatchesReview
        ? complianceData.supportingDocs.map((document) => ({
            id: document.documentId,
            filename: document.filename || 'Untitled',
            created_at: document.createdAt,
          }))
        : [],
    )
    setError(null)
    setIsUploading(false)
    setBrowseFilesOpen(false)
    setPreviewFile(null)
  }, [complianceData, reviewId])

  const remove = async (documentId: string) => {
    if (!reviewId) return
    setError(null)
    try {
      await removeSupportingDocument({ reviewId, documentId }).unwrap()
      if (activeReviewIdRef.current === reviewId) {
        setSupportingDocuments((current) =>
          current.filter((document) => document.id !== documentId),
        )
      }
    } catch (error) {
      if (activeReviewIdRef.current === reviewId) {
        setError(getRequestErrorMessage(error, 'Could not remove the supporting document.'))
      }
    }
  }

  const clear = async () => {
    if (!reviewId) return
    setError(null)
    try {
      for (const document of supportingDocuments) {
        await removeSupportingDocument({ reviewId, documentId: document.id }).unwrap()
        if (activeReviewIdRef.current === reviewId) {
          setSupportingDocuments((current) =>
            current.filter((candidate) => candidate.id !== document.id),
          )
        }
      }
    } catch (error) {
      if (activeReviewIdRef.current === reviewId) {
        setError(getRequestErrorMessage(error, 'Could not clear the supporting documents.'))
      }
    }
  }

  const preview = (document: SupportingDocument) => {
    const extension = document.filename.split('.').pop()?.toLowerCase() || null
    setPreviewFile({
      sourceType: 'document',
      id: document.id,
      filename: document.filename,
      fileType: extension,
      extension,
      createdAt: document.created_at,
    })
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    if (!reviewId) {
      setError('The compliance review is still loading.')
      event.target.value = ''
      return
    }

    const selectedFiles = Array.from(files)
    const activeReviewId = reviewId
    setError(null)
    setIsUploading(true)
    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadDocument(formData).unwrap()
        await addSupportingDocument({
          reviewId: activeReviewId,
          document_id: result.id,
        }).unwrap()
        if (activeReviewIdRef.current === activeReviewId) {
          setSupportingDocuments((current) =>
            current.some((document) => document.id === result.id)
              ? current
              : [
                  ...current,
                  {
                    id: result.id,
                    filename: result.filename || 'Untitled',
                    created_at: result.created_at,
                  },
                ],
          )
        }
      }
    } catch (error) {
      if (activeReviewIdRef.current === activeReviewId) {
        setError(getRequestErrorMessage(error, 'Could not add the supporting documents.'))
      }
    } finally {
      if (activeReviewIdRef.current === activeReviewId) setIsUploading(false)
      event.target.value = ''
    }
  }

  const select = async (file: BrowseFile) => {
    const document = apiDocuments?.find((candidate) => candidate.id === file.id)
    const primaryDocumentId = target.kind === 'document' ? target.documentId : undefined
    if (
      document &&
      !supportingDocuments.find((candidate) => candidate.id === file.id) &&
      file.id !== primaryDocumentId
    ) {
      if (!reviewId) throw new Error('The compliance review is still loading.')
      setError(null)
      try {
        await addSupportingDocument({ reviewId, document_id: document.id }).unwrap()
        if (activeReviewIdRef.current === reviewId) {
          setSupportingDocuments((current) =>
            current.some((candidate) => candidate.id === document.id)
              ? current
              : [
                  ...current,
                  {
                    id: document.id,
                    filename: document.filename || 'Untitled',
                    created_at: document.created_at,
                  },
                ],
          )
        }
      } catch (error) {
        if (activeReviewIdRef.current === reviewId) {
          setError(getRequestErrorMessage(error, 'Could not add the selected document.'))
        }
        throw error
      }
    }
  }

  return {
    supportingDocuments,
    isUploading,
    error,
    openUpload: () => fileInputRef.current?.click(),
    openBrowse: () => setBrowseFilesOpen(true),
    preview,
    remove,
    clear,
    dialogs: {
      browseFiles,
      browseFilesOpen,
      closeBrowse: () => setBrowseFilesOpen(false),
      previewFile,
      closePreview: () => setPreviewFile(null),
      fileInputRef,
      folderInputRef,
      error,
      upload,
      select,
      deleteFiles: async (fileIds: string[]) => {
        for (const id of fileIds) {
          await deleteDocument(id).unwrap()
        }
      },
      renameFile: async (fileId: string, filename: string) => {
        await updateDocument({ id: fileId, filename }).unwrap()
      },
    },
  }
}

export type ComplianceSources = ReturnType<typeof useComplianceSources>
