import { baseApi } from './baseApi'

export type InvitationResourceType = 'document' | 'project' | 'workspace'

export interface InvitationInfo {
  resource_type: InvitationResourceType
  resource_id: string | null
  resource_name: string
  role: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
}

export interface AcceptInvitationResponse {
  ok: boolean
  resource_type: InvitationResourceType
  resource_id: string | null
  resource_name: string
  role: string
  status: string
}

export type InvitationAcceptanceTarget =
  { kind: 'token'; token: string } | { kind: 'id'; invitationId: string }

export interface DeclineInvitationResponse {
  ok: boolean
  resource_type: string
  resource_id: string | null
  resource_name: string
  status: string
}

export interface AccessRequestActionResponse {
  id: string
  status: string
  reviewed_at: string
}

export interface ChangeRequestActionResponse {
  id: string
  status: string
  reviewed_at: string
  review_notes: string | null
}

export const invitationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvitation: builder.query<InvitationInfo, string>({
      query: (token) => `/invitations/${token}`,
    }),

    acceptInvitation: builder.mutation<AcceptInvitationResponse, InvitationAcceptanceTarget>({
      query: (target) => ({
        url:
          target.kind === 'token'
            ? `/invitations/${target.token}/accept`
            : `/invitations/by-id/${target.invitationId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'AttentionItems', id: 'LIST' },
        { type: 'DriveWorkspaces', id: 'LIST' },
        { type: 'Documents', id: 'LIST' },
        { type: 'Projects', id: 'LIST' },
      ],
    }),

    declineInvitation: builder.mutation<DeclineInvitationResponse, string>({
      query: (invitationId) => ({
        url: `/invitations/by-id/${invitationId}/decline`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'AttentionItems', id: 'LIST' }],
    }),

    approveAccessRequest: builder.mutation<
      AccessRequestActionResponse,
      { workspaceId: string; requestId: string }
    >({
      query: ({ workspaceId, requestId }) => ({
        url: `/drive/workspaces/${workspaceId}/access-requests/${requestId}`,
        method: 'PATCH',
        body: { action: 'approve' },
      }),
      invalidatesTags: [
        { type: 'AttentionItems', id: 'LIST' },
        { type: 'DriveWorkspaces', id: 'LIST' },
      ],
    }),

    rejectAccessRequest: builder.mutation<
      AccessRequestActionResponse,
      { workspaceId: string; requestId: string }
    >({
      query: ({ workspaceId, requestId }) => ({
        url: `/drive/workspaces/${workspaceId}/access-requests/${requestId}`,
        method: 'PATCH',
        body: { action: 'reject' },
      }),
      invalidatesTags: [{ type: 'AttentionItems', id: 'LIST' }],
    }),

    approveChangeRequest: builder.mutation<
      ChangeRequestActionResponse,
      { documentId: string; requestId: string; reviewNotes?: string }
    >({
      query: ({ documentId, requestId, reviewNotes }) => ({
        url: `/documents/${documentId}/change-requests/${requestId}`,
        method: 'PATCH',
        body: { action: 'approve', review_notes: reviewNotes },
      }),
      invalidatesTags: [{ type: 'AttentionItems', id: 'LIST' }],
    }),

    rejectChangeRequest: builder.mutation<
      ChangeRequestActionResponse,
      { documentId: string; requestId: string; reviewNotes?: string }
    >({
      query: ({ documentId, requestId, reviewNotes }) => ({
        url: `/documents/${documentId}/change-requests/${requestId}`,
        method: 'PATCH',
        body: { action: 'reject', review_notes: reviewNotes },
      }),
      invalidatesTags: [{ type: 'AttentionItems', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetInvitationQuery,
  useLazyGetInvitationQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useApproveAccessRequestMutation,
  useRejectAccessRequestMutation,
  useApproveChangeRequestMutation,
  useRejectChangeRequestMutation,
} = invitationsApi
