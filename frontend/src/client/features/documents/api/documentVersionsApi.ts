import { baseApi } from '../../../store/api/baseApi'

export interface DocumentVersion {
  id: string
  version_number: number
  source:
    'upload' | 'user_upload' | 'user_edit' | 'user_create' | 'assistant_edit' | 'generated' | string
  created_at: string
  display_name: string | null
}

export interface DocumentVersionsResponse {
  current_version_id: string | null
  versions: DocumentVersion[]
}

export interface TrackedChangeId {
  kind: 'ins' | 'del'
  w_id: string
}

export interface TrackedChangeIdsResponse {
  ids: TrackedChangeId[]
}

export interface EditResolutionResponse {
  ok: boolean
  already_resolved?: boolean
  status?: 'accepted' | 'rejected' | 'pending'
  version_id: string | null
  download_url: string | null
  remaining_pending: number
}

export interface UploadVersionRequest {
  documentId: string
  formData: FormData
}

export interface RenameVersionRequest {
  documentId: string
  versionId: string
  display_name: string | null
}

export interface DocumentEditAnnotation {
  kind: 'edit'
  edit_id: string
  document_id: string
  version_id: string
  version_number?: number | null
  change_id: string
  del_w_id?: string
  ins_w_id?: string
  deleted_text: string
  inserted_text: string
  context_before: string
  context_after: string
  reason?: string
  status: 'pending' | 'accepted' | 'rejected'
}

export const documentVersionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentVersions: builder.query<DocumentVersionsResponse, string>({
      query: (documentId) => `/documents/${documentId}/versions`,
      providesTags: (_result, _error, documentId) => [
        { type: 'Documents', id: `${documentId}-versions` },
      ],
    }),
    getDocumentEdits: builder.query<
      DocumentEditAnnotation[],
      { documentId: string; status?: 'pending' | 'accepted' | 'rejected' }
    >({
      query: ({ documentId, status }) => ({
        url: `/documents/${documentId}/edits`,
        params: status ? { status } : undefined,
      }),
      providesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentEdits', id: documentId },
      ],
    }),
    uploadDocumentVersion: builder.mutation<DocumentVersion, UploadVersionRequest>({
      query: ({ documentId, formData }) => ({
        url: `/documents/${documentId}/versions`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: `${documentId}-versions` },
        { type: 'Documents', id: 'LIST' },
        { type: 'DocumentInsights', id: documentId },
      ],
    }),
    saveDocumentVersionFromHtml: builder.mutation<
      DocumentVersion,
      { documentId: string; html: string; displayName?: string }
    >({
      query: ({ documentId, html, displayName }) => ({
        url: `/documents/${documentId}/versions/from-html`,
        method: 'POST',
        body: { html, display_name: displayName },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: `${documentId}-versions` },
        { type: 'Documents', id: 'LIST' },
        { type: 'DocumentActivity', id: documentId },
        { type: 'DocumentInsights', id: documentId },
      ],
    }),
    renameDocumentVersion: builder.mutation<DocumentVersion, RenameVersionRequest>({
      query: ({ documentId, versionId, display_name }) => ({
        url: `/documents/${documentId}/versions/${versionId}`,
        method: 'PATCH',
        body: { display_name },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: `${documentId}-versions` },
      ],
    }),
    getTrackedChangeIds: builder.query<
      TrackedChangeIdsResponse,
      { documentId: string; version_id?: string }
    >({
      query: ({ documentId, version_id }) => ({
        url: `/documents/${documentId}/tracked-change-ids`,
        params: version_id ? { version_id } : undefined,
      }),
    }),
    acceptDocumentEdit: builder.mutation<
      EditResolutionResponse,
      { documentId: string; editId: string }
    >({
      query: ({ documentId, editId }) => ({
        url: `/documents/${documentId}/edits/${editId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: `${documentId}-versions` },
        { type: 'DocumentEdits', id: documentId },
        { type: 'DocumentActivity', id: documentId },
        { type: 'DocumentInsights', id: documentId },
      ],
    }),
    rejectDocumentEdit: builder.mutation<
      EditResolutionResponse,
      { documentId: string; editId: string }
    >({
      query: ({ documentId, editId }) => ({
        url: `/documents/${documentId}/edits/${editId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: `${documentId}-versions` },
        { type: 'DocumentEdits', id: documentId },
        { type: 'DocumentActivity', id: documentId },
        { type: 'DocumentInsights', id: documentId },
      ],
    }),
  }),
})

export const {
  useGetDocumentVersionsQuery,
  useGetDocumentEditsQuery,
  useUploadDocumentVersionMutation,
  useSaveDocumentVersionFromHtmlMutation,
  useRenameDocumentVersionMutation,
  useGetTrackedChangeIdsQuery,
  useLazyGetTrackedChangeIdsQuery,
  useAcceptDocumentEditMutation,
  useRejectDocumentEditMutation,
} = documentVersionsApi
