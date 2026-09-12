import { baseApi } from '../baseApi'

export interface WorkspaceMember {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
}

export interface WorkspaceMembersResponse {
  owner_id: string
  members: WorkspaceMember[]
}

export interface AddWorkspaceMemberRequest {
  workspaceId: string
  user_id: string
  role?: 'admin' | 'editor' | 'viewer'
}

export interface AddWorkspaceMemberResponse {
  id: string
  workspace_id: string
  user_id: string
  role: string
  created_at: string
  updated_at: string
}

export interface RemoveWorkspaceMemberRequest {
  workspaceId: string
  user_id: string
}

export interface InviteWorkspaceMemberRequest {
  workspaceId: string
  email: string
  role?: 'admin' | 'editor' | 'viewer'
}

export interface InviteWorkspaceMemberResponse {
  invitation: {
    id: string
    email: string
    role: 'admin' | 'editor' | 'viewer'
    status: 'pending' | 'accepted' | 'revoked' | 'expired'
    expires_at: string
    created_at: string
  }
  delivery: {
    email: string
    status: 'sent' | 'failed' | 'suppressed' | 'skipped'
    message_id?: string
    error?: string
    suppressed?: boolean
    attempts?: number
  }
}

export const driveInvitationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspaceMembers: builder.query<WorkspaceMembersResponse, string>({
      query: (workspaceId) => `/drive/workspaces/${workspaceId}/members`,
      providesTags: (_result, _error, workspaceId) => [
        { type: 'DriveWorkspaces', id: `${workspaceId}-members` },
      ],
    }),
    addWorkspaceMember: builder.mutation<AddWorkspaceMemberResponse, AddWorkspaceMemberRequest>({
      query: ({ workspaceId, ...body }) => ({
        url: `/drive/workspaces/${workspaceId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'DriveWorkspaces', id: `${workspaceId}-members` },
      ],
    }),
    inviteWorkspaceMember: builder.mutation<
      InviteWorkspaceMemberResponse,
      InviteWorkspaceMemberRequest
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `/drive/workspaces/${workspaceId}/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'DriveWorkspaces', id: `${workspaceId}-members` },
        { type: 'DriveWorkspaces', id: 'LIST' },
        { type: 'AttentionItems', id: 'LIST' },
      ],
    }),
    removeWorkspaceMember: builder.mutation<void, RemoveWorkspaceMemberRequest>({
      query: ({ workspaceId, ...body }) => ({
        url: `/drive/workspaces/${workspaceId}/members`,
        method: 'DELETE',
        body,
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'DriveWorkspaces', id: `${workspaceId}-members` },
        { type: 'DriveWorkspaces', id: workspaceId },
        { type: 'DriveWorkspaces', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetWorkspaceMembersQuery,
  useAddWorkspaceMemberMutation,
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
} = driveInvitationsApi
