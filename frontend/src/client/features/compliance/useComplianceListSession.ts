import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { appRoutes } from '../../appRoutes'
import {
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
  useUpdateDocumentMutation,
  useUploadDocumentMutation,
} from '../documents/api/documentCoreApi'
import {
  useDeleteComplianceReviewMutation,
  useGetComplianceReviewsQuery,
} from '../../store/api/complianceApi'
import { useGetDriveWorkspacesQuery } from '../../store/api/drive/driveWorkspaceApi'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  complianceReviewRoute,
  filterAndSortComplianceDocuments,
  toBrowseFiles,
  toComplianceListDocument,
  type ComplianceListDocument,
  type ComplianceSortOption,
} from './reviewListModel'

export function useComplianceListSession() {
  const navigate = useNavigate()
  const { data: complianceReviews = [] } = useGetComplianceReviewsQuery()
  const { data: apiDocuments } = useGetDocumentsQuery()
  const { data: workspaces = [] } = useGetDriveWorkspacesQuery()
  const [deleteComplianceReview] = useDeleteComplianceReviewMutation()
  const [deleteDocument] = useDeleteDocumentMutation()
  const [updateDocument] = useUpdateDocumentMutation()
  const [uploadDocument] = useUploadDocumentMutation()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<ComplianceSortOption>('newest')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [browseFilesOpen, setBrowseFilesOpen] = useState(false)
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const documents = useMemo(
    () => complianceReviews.map(toComplianceListDocument),
    [complianceReviews],
  )
  const filteredDocuments = useMemo(
    () => filterAndSortComplianceDocuments(documents, searchQuery, activeFilters, sortOption),
    [activeFilters, documents, searchQuery, sortOption],
  )
  const browseFiles = useMemo(() => toBrowseFiles(apiDocuments), [apiDocuments])

  const toggleFilter = (filter: string) => {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    )
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const selectedFiles = Array.from(files)
    setUploadError(null)
    setIsUploading(true)
    try {
      let firstDocumentId: string | null = null
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadDocument(formData).unwrap()
        firstDocumentId ??= result.id
      }
      if (firstDocumentId) navigate(appRoutes.complianceDocument(firstDocumentId))
    } catch (error) {
      setUploadError(getRequestErrorMessage(error, 'Could not upload the selected files.'))
    } finally {
      setIsUploading(false)
    }
    event.target.value = ''
  }

  const openReview = (document: ComplianceListDocument) => {
    navigate(complianceReviewRoute(document))
  }

  return {
    search: {
      query: searchQuery,
      setQuery: setSearchQuery,
      activeFilters,
      toggleFilter,
      clearFilters: () => setActiveFilters([]),
      sortOption,
      setSortOption,
    },
    documents: {
      all: documents,
      filtered: filteredDocuments,
      browseFiles,
      workspaces,
      openReview,
      openBrowseFile: (documentId: string) => {
        navigate(appRoutes.complianceDocument(documentId))
      },
      deleteReview: async (reviewId: string) => {
        await deleteComplianceReview(reviewId).unwrap()
      },
      deleteFiles: async (fileIds: string[]) => {
        for (const id of fileIds) {
          await deleteDocument(id).unwrap()
        }
      },
      renameFile: async (fileId: string, filename: string) => {
        await updateDocument({ id: fileId, filename }).unwrap()
      },
    },
    upload: {
      isUploading,
      error: uploadError,
      fileInputRef,
      folderInputRef,
      open: () => fileInputRef.current?.click(),
      handleFileUpload,
    },
    dialogs: {
      browseFilesOpen,
      setBrowseFilesOpen,
      projectPickerOpen,
      setProjectPickerOpen,
    },
    navigateToProject: (workspaceId: string) => {
      setProjectPickerOpen(false)
      navigate(appRoutes.complianceWorkspace(workspaceId))
    },
  }
}
