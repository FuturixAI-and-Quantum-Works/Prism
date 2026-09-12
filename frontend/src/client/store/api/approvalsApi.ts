import { baseApi } from './baseApi'

export type ApprovalSubjectType = 'document' | 'drive_file' | 'workspace'
export type ApproverRole = string

export interface ApprovalRoleOption {
  role: ApproverRole
  label: string
}

export interface ApprovalApprover {
  id: string
  subject_type: ApprovalSubjectType
  subject_id: string
  role: ApproverRole
  role_label: string
  approver_name: string
  approver_email: string
  is_required: boolean
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalChange {
  id?: string | null
  decision: 'accepted' | 'pending' | 'rejected'
  section_name?: string | null
  original_text?: string | null
  new_text?: string | null
  ai_summary?: string | null
  required_roles: ApproverRole[]
  reason?: string | null
}

export interface ApprovalAnalysis {
  subject_type: ApprovalSubjectType
  subject_id: string
  subject_label: string
  required: boolean
  required_roles: ApproverRole[]
  role_options: ApprovalRoleOption[]
  missing_roles: ApproverRole[]
  configured_approvers: ApprovalApprover[]
  changes_by_approver: Record<string, number>
  changes: ApprovalChange[]
}

export interface ApprovalRequest {
  id: string
  subject_type: ApprovalSubjectType
  subject_id: string
  approver_id: string | null
  role: ApproverRole
  role_label: string
  approver_name: string
  approver_email: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  decision_note: string | null
  requested_by_user_id: string | null
  decided_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
  item_count: number
}

export interface PublicApprovalRequest {
  role_label: string
  approver_name: string
  status: ApprovalRequest['status']
}

export interface PublicApprovalItem {
  id: string
  title: string
  reason: string | null
}

export interface ApprovalStatus {
  subject_type: ApprovalSubjectType
  subject_id: string
  required_roles: ApproverRole[]
  missing_roles: ApproverRole[]
  approvers: ApprovalApprover[]
  requests: ApprovalRequest[]
  pending_count: number
  approved_count: number
  rejected_count: number
}

export interface UpsertApproversRequest {
  subjectType: ApprovalSubjectType
  subjectId: string
  approvers: Array<{
    role: ApproverRole
    approver_name: string
    approver_email: string
  }>
}

export interface RequestApprovalsRequest extends UpsertApproversRequest {
  expires_in_days?: number
}

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApprovalRoles: builder.query<{ roles: ApprovalRoleOption[] }, void>({
      query: () => '/approvals/roles',
    }),

    getApprovers: builder.query<
      ApprovalApprover[],
      { subjectType: ApprovalSubjectType; subjectId: string }
    >({
      query: ({ subjectType, subjectId }) => `/approvals/${subjectType}/${subjectId}/approvers`,
      providesTags: (_result, _error, { subjectType, subjectId }) => [
        { type: 'Approvals', id: `${subjectType}:${subjectId}:approvers` },
      ],
    }),

    upsertApprovers: builder.mutation<ApprovalApprover[], UpsertApproversRequest>({
      query: ({ subjectType, subjectId, approvers }) => ({
        url: `/approvals/${subjectType}/${subjectId}/approvers`,
        method: 'PUT',
        body: { approvers },
      }),
      invalidatesTags: (_result, _error, { subjectType, subjectId }) => [
        { type: 'Approvals', id: `${subjectType}:${subjectId}:approvers` },
        { type: 'Approvals', id: `${subjectType}:${subjectId}:status` },
      ],
    }),

    analyzeApprovals: builder.mutation<
      ApprovalAnalysis,
      { subjectType: ApprovalSubjectType; subjectId: string }
    >({
      query: ({ subjectType, subjectId }) => ({
        url: `/approvals/${subjectType}/${subjectId}/analyze`,
        method: 'POST',
      }),
    }),

    getApprovalStatus: builder.query<
      ApprovalStatus,
      { subjectType: ApprovalSubjectType; subjectId: string }
    >({
      query: ({ subjectType, subjectId }) => `/approvals/${subjectType}/${subjectId}/status`,
      providesTags: (_result, _error, { subjectType, subjectId }) => [
        { type: 'Approvals', id: `${subjectType}:${subjectId}:status` },
      ],
    }),

    requestApprovals: builder.mutation<
      { success: boolean; requests: ApprovalRequest[] },
      RequestApprovalsRequest
    >({
      query: ({ subjectType, subjectId, approvers, expires_in_days }) => ({
        url: `/approvals/${subjectType}/${subjectId}/request`,
        method: 'POST',
        body: { approvers, expires_in_days },
      }),
      invalidatesTags: (_result, _error, { subjectType, subjectId }) => [
        { type: 'Approvals', id: `${subjectType}:${subjectId}:status` },
        { type: 'DocumentActivity', id: subjectId },
        { type: 'DriveActivity', id: subjectId },
      ],
    }),

    decideApprovalRequest: builder.mutation<
      ApprovalRequest,
      { requestId: string; status: 'approved' | 'rejected'; decision_note?: string }
    >({
      query: ({ requestId, status, decision_note }) => ({
        url: `/approvals/requests/${requestId}/decision`,
        method: 'PATCH',
        body: { status, decision_note },
      }),
      invalidatesTags: [{ type: 'Approvals', id: 'LIST' }],
    }),

    getPublicApprovalRequest: builder.query<
      { request: PublicApprovalRequest; items: PublicApprovalItem[] },
      string
    >({
      query: (token) => `/approvals/public/${token}`,
    }),

    decidePublicApprovalRequest: builder.mutation<
      PublicApprovalRequest,
      { token: string; status: 'approved' | 'rejected'; decision_note?: string }
    >({
      query: ({ token, status, decision_note }) => ({
        url: `/approvals/public/${token}/decision`,
        method: 'POST',
        body: { status, decision_note },
      }),
    }),
  }),
})

export const {
  useGetApprovalRolesQuery,
  useGetApproversQuery,
  useUpsertApproversMutation,
  useAnalyzeApprovalsMutation,
  useGetApprovalStatusQuery,
  useRequestApprovalsMutation,
  useDecideApprovalRequestMutation,
  useGetPublicApprovalRequestQuery,
  useDecidePublicApprovalRequestMutation,
} = approvalsApi
