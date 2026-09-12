import { baseApi } from '../../../store/api/baseApi'

export type ProductShareRole = 'editor' | 'viewer'

export interface ShareDelivery {
  email: string
  status: 'sent' | 'failed' | 'suppressed' | 'skipped'
  message_id?: string
  error?: string
  suppressed?: boolean
  attempts?: number
}

export interface PendingShareInvitation {
  id: string
  email: string
  role: ProductShareRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
  created_at: string
}

export interface DocumentShare {
  id: string
  document_id: string
  user_id: string | null
  email: string
  role: ProductShareRole
  created_at: string
  updated_at: string
}

export interface DocumentSharesResponse {
  shares: DocumentShare[]
  pending_invitations: PendingShareInvitation[]
}

export const documentSharingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentShares: builder.query<DocumentSharesResponse, string>({
      query: (documentId) => `/documents/${documentId}/shares`,
      providesTags: (_result, _error, documentId) => [
        { type: 'Documents', id: `${documentId}-shares` },
      ],
    }),
    createDocumentInvitation: builder.mutation<
      { invitation: PendingShareInvitation; delivery: ShareDelivery },
      { documentId: string; email: string; role: ProductShareRole }
    >({
      query: ({ documentId, email, role }) => ({
        url: `/documents/${documentId}/invitations`,
        method: 'POST',
        body: { email, role },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: `${documentId}-shares` },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    updateDocumentShare: builder.mutation<
      DocumentShare,
      { documentId: string; shareId: string; role: ProductShareRole }
    >({
      query: ({ documentId, shareId, role }) => ({
        url: `/documents/${documentId}/shares/${shareId}`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: `${documentId}-shares` },
        { type: 'Documents', id: `${documentId}-session` },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    removeDocumentShare: builder.mutation<void, { documentId: string; shareId: string }>({
      query: ({ documentId, shareId }) => ({
        url: `/documents/${documentId}/shares/${shareId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: `${documentId}-shares` },
        { type: 'Documents', id: `${documentId}-session` },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
  }),
})

export const {
  useGetDocumentSharesQuery,
  useCreateDocumentInvitationMutation,
  useUpdateDocumentShareMutation,
  useRemoveDocumentShareMutation,
} = documentSharingApi
