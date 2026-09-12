import { baseApi } from './baseApi'
export interface ColumnConfig {
  id: string
  index?: number
  name: string
  prompt?: string
  format?: string
  tags?: string[]
  width?: number
  type?: string
  question?: string
  category?: string
  severity?: string
  rationale?: string
}

export interface Workflow {
  id: string
  userId: string | null
  title: string
  type: 'assistant' | 'tabular'
  promptMd: string | null
  columnsConfig: ColumnConfig[] | null
  practice: string | null
  isSystem: boolean
  createdAt: string
  updatedAt: string
  allow_edit: boolean
  is_owner: boolean
  shared_by_name?: string | null
}

export interface WorkflowShare {
  id: string
  shared_with_email: string
  allow_edit: boolean
  created_at: string
}

export interface CreateWorkflowRequest {
  title: string
  type: 'assistant' | 'tabular'
  prompt_md?: string
  columns_config?: ColumnConfig[]
  practice?: string | null
}

export interface UpdateWorkflowRequest {
  title?: string
  prompt_md?: string
  columns_config?: ColumnConfig[]
  practice?: string | null
}

export interface ShareWorkflowRequest {
  emails: string[]
  allow_edit?: boolean
}

export const workflowsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflows: builder.query<Workflow[], { type?: 'assistant' | 'tabular' } | void>({
      query: (params) => ({
        url: '/workflows',
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Workflows' as const, id })),
              { type: 'Workflows', id: 'LIST' },
            ]
          : [{ type: 'Workflows', id: 'LIST' }],
    }),

    createWorkflow: builder.mutation<Workflow, CreateWorkflowRequest>({
      query: (body) => ({
        url: '/workflows',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Workflows', id: 'LIST' }],
    }),

    getWorkflow: builder.query<Workflow, string>({
      query: (workflowId) => `/workflows/${workflowId}`,
      providesTags: (_result, _error, workflowId) => [{ type: 'Workflows', id: workflowId }],
    }),

    updateWorkflow: builder.mutation<Workflow, { workflowId: string } & UpdateWorkflowRequest>({
      query: ({ workflowId, ...body }) => ({
        url: `/workflows/${workflowId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: 'Workflows', id: workflowId },
        { type: 'Workflows', id: 'LIST' },
      ],
    }),

    patchWorkflow: builder.mutation<Workflow, { workflowId: string } & UpdateWorkflowRequest>({
      query: ({ workflowId, ...body }) => ({
        url: `/workflows/${workflowId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: 'Workflows', id: workflowId },
        { type: 'Workflows', id: 'LIST' },
      ],
    }),

    deleteWorkflow: builder.mutation<void, string>({
      query: (workflowId) => ({
        url: `/workflows/${workflowId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Workflows', id: 'LIST' }],
    }),

    getHiddenWorkflows: builder.query<string[], void>({
      query: () => '/workflows/hidden',
      providesTags: [{ type: 'Workflows', id: 'HIDDEN' }],
    }),

    hideWorkflow: builder.mutation<void, string>({
      query: (workflow_id) => ({
        url: '/workflows/hidden',
        method: 'POST',
        body: { workflow_id },
      }),
      invalidatesTags: [{ type: 'Workflows', id: 'HIDDEN' }],
    }),

    unhideWorkflow: builder.mutation<void, string>({
      query: (workflowId) => ({
        url: `/workflows/hidden/${workflowId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Workflows', id: 'HIDDEN' }],
    }),

    getWorkflowShares: builder.query<WorkflowShare[], string>({
      query: (workflowId) => `/workflows/${workflowId}/shares`,
      providesTags: (_result, _error, workflowId) => [
        { type: 'Workflows', id: `${workflowId}-shares` },
      ],
    }),

    shareWorkflow: builder.mutation<void, { workflowId: string } & ShareWorkflowRequest>({
      query: ({ workflowId, ...body }) => ({
        url: `/workflows/${workflowId}/share`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: 'Workflows', id: `${workflowId}-shares` },
      ],
    }),

    removeWorkflowShare: builder.mutation<void, { workflowId: string; shareId: string }>({
      query: ({ workflowId, shareId }) => ({
        url: `/workflows/${workflowId}/shares/${shareId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { workflowId }) => [
        { type: 'Workflows', id: `${workflowId}-shares` },
      ],
    }),
  }),
})

export const {
  useGetWorkflowsQuery,
  useLazyGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useGetWorkflowQuery,
  useLazyGetWorkflowQuery,
  useUpdateWorkflowMutation,
  usePatchWorkflowMutation,
  useDeleteWorkflowMutation,
  useGetHiddenWorkflowsQuery,
  useHideWorkflowMutation,
  useUnhideWorkflowMutation,
  useGetWorkflowSharesQuery,
  useShareWorkflowMutation,
  useRemoveWorkflowShareMutation,
} = workflowsApi
