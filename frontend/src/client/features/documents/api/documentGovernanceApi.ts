import { baseApi } from '../../../store/api/baseApi'
import type { ProductShareRole } from './documentSharingApi'

export type DocumentRole = 'DRAFTER' | 'REVIEWER' | 'APPROVER'
export type DocumentAccessRole = 'owner' | 'admin' | ProductShareRole
export type DocumentLifecycleStatus =
  'DRAFT' | 'IN_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'FINALIZED'

export interface DocumentSessionContext {
  document_id: string
  document_state: DocumentLifecycleStatus
  document_role: DocumentRole | null
  role_badge: DocumentRole | 'OWNER_ADMIN' | 'PROJECT_MEMBER' | null
  product_role: DocumentAccessRole | null
  access_source: 'owner' | 'admin' | 'document' | 'project' | null
  is_owner: boolean
  is_workspace_admin: boolean
  is_owner_admin: boolean
  allowed_actions: string[]
  visible_tabs: string[]
}

export interface DocumentCommentMetadata {
  kind?: string
  label?: string
  page_number?: number | null
  section_ref?: string | null
  anchor_text?: string | null
  fix_prompt?: string | null
}

export interface DocumentComment {
  id: string
  document_id: string
  version_id: string | null
  user_id: string | null
  user_email: string | null
  user_name: string | null
  parent_comment_id: string | null
  body: string
  anchor_text: string | null
  anchor_start: number | null
  anchor_end: number | null
  metadata: DocumentCommentMetadata | null
  resolved: boolean
  resolved_by_user_id: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateDocumentCommentRequest {
  documentId: string
  body: string
  version_id?: string | null
  parent_comment_id?: string | null
  anchor_text?: string | null
  anchor_start?: number | null
  anchor_end?: number | null
}

export interface UpdateDocumentCommentRequest {
  documentId: string
  commentId: string
  body?: string
  resolved?: boolean
}

export interface DocumentActivity {
  id: string
  document_id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  action: string
  target_type: string | null
  target_id: string | null
  target_name: string | null
  details: unknown
  created_at: string
  edit_details?: {
    deleted_text: string | null
    inserted_text: string | null
    context_before: string | null
    context_after: string | null
    reason: string | null
    status: string | null
  } | null
  favorability?: 'favorable' | 'unfavorable' | 'neutral'
  favorability_explanation?: string
}

export interface RejectionTarget {
  page_number?: number | null
  section_ref?: string | null
  anchor_text?: string | null
}

export interface DocumentMember {
  id: string
  document_id: string
  user_id: string | null
  email: string | null
  role: DocumentRole
  assigned_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface DocumentChatMessage {
  id: string
  documentId: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  roleBadge: DocumentRole | 'OWNER_ADMIN' | 'AI'
  aiLabel: 'AI_LUNA' | 'AI_LUNA_PRISM' | null
  content: string
  metadata: Record<string, unknown> | null
  emailNotification: Record<string, unknown> | null
  createdAt: string
}

export const documentGovernanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentSessionContext: builder.query<DocumentSessionContext, string>({
      query: (id) => `/documents/${id}/session-context`,
      providesTags: (_result, _error, id) => [{ type: 'Documents', id: `${id}-session` }],
    }),
    getDocumentMembers: builder.query<DocumentMember[], string>({
      query: (documentId) => `/documents/${documentId}/members`,
      providesTags: (_result, _error, documentId) => [
        { type: 'Documents', id: `${documentId}-members` },
      ],
    }),
    getDocumentChatMessages: builder.query<DocumentChatMessage[], string>({
      query: (documentId) => `/documents/${documentId}/chat-messages`,
      providesTags: (_result, _error, documentId) => [
        { type: 'Documents', id: `${documentId}-chat-messages` },
      ],
    }),
    assignDocumentMember: builder.mutation<
      DocumentMember,
      { documentId: string; email?: string; user_id?: string; role: DocumentRole }
    >({
      query: ({ documentId, ...body }) => ({
        url: `/documents/${documentId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: `${documentId}-members` },
        { type: 'Documents', id: `${documentId}-session` },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    transitionDocumentLifecycle: builder.mutation<
      DocumentSessionContext,
      {
        documentId: string
        action:
          | 'send-review'
          | 'send-approval'
          | 'approve'
          | 'reject'
          | 'finalize'
          | 'request-clarification'
        note?: string | null
        rejection_target?: RejectionTarget | null
      }
    >({
      query: ({ documentId, action, note, rejection_target }) => ({
        url: `/documents/${documentId}/${action}`,
        method: 'POST',
        body: { note, rejection_target },
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: `${documentId}-session` },
        { type: 'DocumentComments', id: documentId },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    getDocumentComments: builder.query<DocumentComment[], string>({
      query: (documentId) => `/documents/${documentId}/comments`,
      providesTags: (_result, _error, documentId) => [{ type: 'DocumentComments', id: documentId }],
    }),
    createDocumentComment: builder.mutation<DocumentComment, CreateDocumentCommentRequest>({
      query: ({ documentId, ...body }) => ({
        url: `/documents/${documentId}/comments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentComments', id: documentId },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    updateDocumentComment: builder.mutation<DocumentComment, UpdateDocumentCommentRequest>({
      query: ({ documentId, commentId, ...body }) => ({
        url: `/documents/${documentId}/comments/${commentId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentComments', id: documentId },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    deleteDocumentComment: builder.mutation<void, { documentId: string; commentId: string }>({
      query: ({ documentId, commentId }) => ({
        url: `/documents/${documentId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'DocumentComments', id: documentId },
        { type: 'DocumentActivity', id: documentId },
      ],
    }),
    getDocumentActivity: builder.query<DocumentActivity[], string>({
      query: (documentId) => `/documents/${documentId}/activity`,
      providesTags: (_result, _error, documentId) => [{ type: 'DocumentActivity', id: documentId }],
    }),
  }),
})

export const {
  useGetDocumentSessionContextQuery,
  useGetDocumentMembersQuery,
  useGetDocumentChatMessagesQuery,
  useAssignDocumentMemberMutation,
  useTransitionDocumentLifecycleMutation,
  useGetDocumentCommentsQuery,
  useCreateDocumentCommentMutation,
  useUpdateDocumentCommentMutation,
  useDeleteDocumentCommentMutation,
  useGetDocumentActivityQuery,
} = documentGovernanceApi
