import { baseApi } from './baseApi'

export type AttentionItemSourceType =
  | 'document_risk'
  | 'compliance_issue'
  | 'compliance_question'
  | 'project_invitation'
  | 'document_invitation'
  | 'approval_request'
  | 'workspace_invitation'
  | 'document_change_request'
  | 'access_request'

export type AttentionItemStatus = 'pending' | 'viewed' | 'resolved' | 'dismissed'

export interface AttentionItem {
  id: string
  user_id: string
  source_type: AttentionItemSourceType
  source_id: string | null
  secondary_source_id: string | null
  severity: 'high' | 'medium'
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  status: AttentionItemStatus
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface UserActivity {
  id: string
  user_id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  actor_user_id: string | null
  actor_name: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface AttentionItemsParams {
  status?: AttentionItemStatus
  limit?: number
  offset?: number
}

export interface UserActivityParams {
  limit?: number
  offset?: number
}

export const attentionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAttentionItems: builder.query<AttentionItem[], AttentionItemsParams | void>({
      query: (params) => ({
        url: '/attention-items',
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AttentionItems' as const, id })),
              { type: 'AttentionItems', id: 'LIST' },
            ]
          : [{ type: 'AttentionItems', id: 'LIST' }],
    }),

    updateAttentionItem: builder.mutation<
      { ok: boolean; status: AttentionItemStatus },
      { id: string; status: AttentionItemStatus }
    >({
      query: ({ id, status }) => ({
        url: `/attention-items/${id}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'AttentionItems', id },
        { type: 'AttentionItems', id: 'LIST' },
      ],
    }),

    getUserActivity: builder.query<UserActivity[], UserActivityParams | void>({
      query: (params) => ({
        url: '/attention-items/activity',
        params: params ?? undefined,
      }),
      providesTags: [{ type: 'UserActivity', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetAttentionItemsQuery,
  useLazyGetAttentionItemsQuery,
  useUpdateAttentionItemMutation,
  useGetUserActivityQuery,
  useLazyGetUserActivityQuery,
} = attentionApi
