import { baseApi } from '../../../store/api/baseApi'
import type { DocumentEditAnnotation } from './documentVersionsApi'

export interface DocumentUrlResponse {
  url: string
  document_id: string
  filename: string
  version_id: string
  has_pdf_rendition: boolean
}

export interface PreviewSummaryResponse {
  id: string
  source_type: 'document' | 'drive'
  filename: string
  summary: string[]
  status: 'ready' | 'empty' | 'error'
  detail?: string
}

export interface DocumentPlaceholderField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'number'
  required: boolean
  occurrences: number
  value: string | null
}

export interface DocumentPlaceholdersResponse {
  document_id: string
  version_id: string
  version_number: number | null
  fields: DocumentPlaceholderField[]
}

export interface ApplyDocumentPlaceholdersResponse {
  ok: boolean
  document_id?: string
  filename?: string
  version_id?: string
  version_number?: number | null
  download_url?: string
  applied: number
  errors?: { index: number; reason: string }[]
  annotations: DocumentEditAnnotation[]
  message?: string
}

export interface DocumentContextFile {
  id: string
  context_document_id: string
  filename: string
  file_type: string | null
  created_at: string
}

export interface DocumentRisk {
  title: string
  severity: 'high' | 'medium' | 'low'
  description: string
  recommendation?: string
  location?: string
}

export interface DocumentInsights {
  mainDocument: {
    id: string
    filename: string
    summary: string[]
    risks: DocumentRisk[]
  } | null
  contextFiles: Array<{
    id: string
    filename: string
    summary: string[]
    risks: DocumentRisk[]
  }>
}

export const documentContentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentHtml: builder.query<
      { html: string; messages: { type: string; message: string }[] },
      { documentId: string; versionId?: string }
    >({
      query: ({ documentId, versionId }) => ({
        url: `/documents/${documentId}/html`,
        params: versionId ? { version_id: versionId } : undefined,
      }),
    }),
    getDocumentDisplay: builder.query<Blob, { documentId: string; version_id?: string }>({
      query: ({ documentId, version_id }) => ({
        url: `/documents/${documentId}/display`,
        params: version_id ? { version_id } : undefined,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getDocumentUrl: builder.query<
      DocumentUrlResponse,
      { documentId: string; version_id?: string; inline?: boolean }
    >({
      query: ({ documentId, version_id, inline }) => ({
        url: `/documents/${documentId}/url`,
        params: {
          ...(version_id ? { version_id } : {}),
          ...(inline ? { inline: 'true' } : {}),
        },
      }),
    }),
    getDocumentPreviewSummary: builder.query<PreviewSummaryResponse, string>({
      query: (documentId) => `/documents/${documentId}/preview-summary`,
      providesTags: (_result, _error, documentId) => [
        { type: 'DocumentInsights', id: `preview-${documentId}` },
      ],
    }),
    getDocumentDocx: builder.query<Blob, { documentId: string; version_id?: string }>({
      query: ({ documentId, version_id }) => ({
        url: `/documents/${documentId}/docx`,
        params: version_id ? { version_id } : undefined,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getDocumentPlaceholders: builder.query<DocumentPlaceholdersResponse, string>({
      query: (documentId) => `/documents/${documentId}/placeholders`,
      providesTags: (_result, _error, documentId) => [
        { type: 'DocumentPlaceholders', id: documentId },
      ],
    }),
    saveDocumentPlaceholderValues: builder.mutation<
      DocumentPlaceholdersResponse,
      { documentId: string; values: Record<string, string> }
    >({
      query: ({ documentId, values }) => ({
        url: `/documents/${documentId}/placeholders/values`,
        method: 'PUT',
        body: { values },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentPlaceholders', id: documentId },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    applyDocumentPlaceholders: builder.mutation<
      ApplyDocumentPlaceholdersResponse,
      { documentId: string; confirm: 'Confirm and fill' }
    >({
      query: ({ documentId, confirm }) => ({
        url: `/documents/${documentId}/placeholders/apply`,
        method: 'POST',
        body: { confirm },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentPlaceholders', id: documentId },
        { type: 'DocumentEdits', id: documentId },
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: `${documentId}-versions` },
        { type: 'DocumentActivity', id: documentId },
        { type: 'DocumentInsights', id: documentId },
      ],
    }),
    getDocumentContextFiles: builder.query<DocumentContextFile[], string>({
      query: (documentId) => `/documents/${documentId}/context-files`,
      providesTags: (_result, _error, documentId) => [
        { type: 'DocumentContextFiles', id: documentId },
      ],
    }),
    addDocumentContextFile: builder.mutation<
      DocumentContextFile,
      { documentId: string; contextDocumentId: string }
    >({
      query: ({ documentId, contextDocumentId }) => ({
        url: `/documents/${documentId}/context-files`,
        method: 'POST',
        body: { context_document_id: contextDocumentId },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentContextFiles', id: documentId },
        { type: 'DocumentInsights', id: documentId },
      ],
    }),
    removeDocumentContextFile: builder.mutation<
      { ok: boolean },
      { documentId: string; contextFileId: string }
    >({
      query: ({ documentId, contextFileId }) => ({
        url: `/documents/${documentId}/context-files/${contextFileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentContextFiles', id: documentId },
        { type: 'DocumentInsights', id: documentId },
      ],
    }),
    getDocumentInsights: builder.query<DocumentInsights, string>({
      query: (documentId) => `/documents/${documentId}/insights`,
      providesTags: (_result, _error, documentId) => [{ type: 'DocumentInsights', id: documentId }],
    }),
  }),
})

export const {
  useGetDocumentHtmlQuery,
  useLazyGetDocumentHtmlQuery,
  useGetDocumentDisplayQuery,
  useLazyGetDocumentDisplayQuery,
  useGetDocumentUrlQuery,
  useLazyGetDocumentUrlQuery,
  useGetDocumentPreviewSummaryQuery,
  useLazyGetDocumentPreviewSummaryQuery,
  useGetDocumentDocxQuery,
  useLazyGetDocumentDocxQuery,
  useGetDocumentPlaceholdersQuery,
  useLazyGetDocumentPlaceholdersQuery,
  useSaveDocumentPlaceholderValuesMutation,
  useApplyDocumentPlaceholdersMutation,
  useGetDocumentContextFilesQuery,
  useAddDocumentContextFileMutation,
  useRemoveDocumentContextFileMutation,
  useGetDocumentInsightsQuery,
  useLazyGetDocumentInsightsQuery,
} = documentContentApi
