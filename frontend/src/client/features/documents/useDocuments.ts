import { useCallback } from 'react'
import {
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
  useUpdateDocumentMutation,
  useUploadDocumentMutation,
} from './api/documentCoreApi'
import type { CreateDocumentRequest, UpdateDocumentRequest } from '../../store/types'

export function useDocuments(params?: { project_id?: string | null }) {
  const { data: documents = [], isLoading, error, refetch } = useGetDocumentsQuery(params ?? {})

  const [createDocumentMutation, { isLoading: isCreating }] = useCreateDocumentMutation()
  const [updateDocumentMutation, { isLoading: isUpdating }] = useUpdateDocumentMutation()
  const [deleteDocumentMutation, { isLoading: isDeleting }] = useDeleteDocumentMutation()
  const [uploadDocumentMutation, { isLoading: isUploading }] = useUploadDocumentMutation()

  const createDocument = useCallback(
    async (data: CreateDocumentRequest) => {
      try {
        const document = await createDocumentMutation(data).unwrap()
        return { success: true, document }
      } catch (error) {
        return { success: false, error }
      }
    },
    [createDocumentMutation],
  )

  const updateDocument = useCallback(
    async (data: UpdateDocumentRequest) => {
      try {
        const document = await updateDocumentMutation(data).unwrap()
        return { success: true, document }
      } catch (error) {
        return { success: false, error }
      }
    },
    [updateDocumentMutation],
  )

  const deleteDocument = useCallback(
    async (id: string) => {
      try {
        await deleteDocumentMutation(id).unwrap()
        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    },
    [deleteDocumentMutation],
  )

  const uploadDocument = useCallback(
    async (file: File, projectId?: string | null, folderId?: string | null) => {
      const formData = new FormData()
      formData.append('file', file)
      if (projectId) formData.append('project_id', projectId)
      if (folderId) formData.append('folder_id', folderId)

      try {
        const document = await uploadDocumentMutation(formData).unwrap()
        return { success: true, document }
      } catch (error) {
        return { success: false, error }
      }
    },
    [uploadDocumentMutation],
  )

  return {
    documents,
    isLoading,
    error,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
    isUploading,
    createDocument,
    updateDocument,
    deleteDocument,
    uploadDocument,
  }
}
