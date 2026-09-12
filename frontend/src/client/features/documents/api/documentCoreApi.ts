import { baseApi } from '../../../store/api/baseApi'
import type { CreateDocumentRequest, Document, UpdateDocumentRequest } from '../../../store/types'

export interface DocumentListRequest {
  project_id?: string | null
  workspace_id?: string | null
  limit?: number
}

export const documentCoreApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocuments: builder.query<Document[], DocumentListRequest | void>({
      query: (params) => ({
        url: '/documents',
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Documents' as const, id })),
              { type: 'Documents', id: 'LIST' },
            ]
          : [{ type: 'Documents', id: 'LIST' }],
    }),
    getDocument: builder.query<Document, string>({
      query: (id) => `/documents/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Documents', id }],
    }),
    createDocument: builder.mutation<Document, CreateDocumentRequest>({
      query: (body) => ({
        url: '/documents',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Documents', id: 'LIST' },
        { type: 'Projects', id: 'LIST' },
      ],
    }),
    updateDocument: builder.mutation<Document, UpdateDocumentRequest>({
      query: ({ id, ...body }) => ({
        url: `/documents/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Documents', id },
        { type: 'Documents', id: 'LIST' },
        { type: 'Projects', id: 'LIST' },
      ],
    }),
    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({
        url: `/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Documents', id: 'LIST' },
        { type: 'Projects', id: 'LIST' },
      ],
    }),
    uploadDocument: builder.mutation<Document, FormData>({
      query: (formData) => ({
        url: '/documents/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [
        { type: 'Documents', id: 'LIST' },
        { type: 'Projects', id: 'LIST' },
      ],
    }),
    downloadDocumentsZip: builder.mutation<Blob, string[]>({
      query: (document_ids) => ({
        url: '/documents/download-zip',
        method: 'POST',
        body: { document_ids },
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
})

export const {
  useGetDocumentsQuery,
  useLazyGetDocumentsQuery,
  useGetDocumentQuery,
  useLazyGetDocumentQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useUploadDocumentMutation,
  useDownloadDocumentsZipMutation,
} = documentCoreApi
