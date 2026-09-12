import { baseApi } from '../../store/api/baseApi'
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '../../store/types'
import { streamSSE, type StreamOutcome } from '../../lib/sseTransport'
import { apiUrl } from '../../lib/apiTransport'
import { isChatStreamEvent, type ChatStreamEvent } from '@prism/protocol'

export type ProjectShareRole = 'editor' | 'viewer'
export type ProjectAccessRole = 'owner' | 'admin' | ProjectShareRole

export interface ShareDelivery {
  email: string
  status: 'sent' | 'failed' | 'suppressed' | 'skipped'
  message_id?: string
  error?: string
  suppressed?: boolean
  attempts?: number
}

export interface PendingProjectInvitation {
  id: string
  email: string
  role: ProjectShareRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string | null
  email: string
  role: ProjectShareRole
  created_at: string
  updated_at: string
}

export interface ProjectMembersResponse {
  owner: {
    user_id: string
    email: string | null
    full_name: string | null
    role: 'owner'
  }
  members: ProjectMember[]
  pending_invitations: PendingProjectInvitation[]
}

export interface ProjectChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ProjectChatDocument {
  filename: string
  document_id: string
}

export interface ProjectFolder {
  id: string
  projectId: string
  userId: string
  name: string
  parentFolderId: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectResponse {
  id: string
  userId: string
  name: string
  cmNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectDetailsResponse extends ProjectResponse {
  folders: ProjectFolder[]
  is_owner: boolean
  role: ProjectAccessRole
}

export interface ProjectUpdateResponse extends ProjectResponse {
  folders: ProjectFolder[]
}

export interface ProjectPeopleOwner {
  user_id: string
  email: string | null
  display_name: string | null
}

export interface ProjectPeopleMember {
  email: string
  display_name: string | null
}

export interface ProjectPeopleResponse {
  owner: ProjectPeopleOwner
  members: ProjectPeopleMember[]
}

export interface ProjectChat {
  id: string
  title: string | null
  userId: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface CreateFolderRequest {
  projectId: string
  name: string
  parent_folder_id?: string | null
}

export interface UpdateFolderRequest {
  projectId: string
  folderId: string
  name?: string
  parent_folder_id?: string | null
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Projects' as const, id })),
              { type: 'Projects', id: 'LIST' },
            ]
          : [{ type: 'Projects', id: 'LIST' }],
    }),

    getProject: builder.query<ProjectDetailsResponse, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Projects', id }],
    }),

    createProject: builder.mutation<ProjectResponse, CreateProjectRequest>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Projects', id: 'LIST' }],
    }),

    updateProject: builder.mutation<ProjectUpdateResponse, UpdateProjectRequest>({
      query: ({ id, ...body }) => ({
        url: `/projects/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Projects', id },
        { type: 'Projects', id: 'LIST' },
      ],
    }),

    deleteProject: builder.mutation<void, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Projects', id: 'LIST' }],
    }),

    getProjectPeople: builder.query<ProjectPeopleResponse, string>({
      query: (projectId) => `/projects/${projectId}/people`,
      providesTags: (_result, _error, projectId) => [
        { type: 'Projects', id: `${projectId}-people` },
      ],
    }),

    getProjectMembers: builder.query<ProjectMembersResponse, string>({
      query: (projectId) => `/projects/${projectId}/members`,
      providesTags: (_result, _error, projectId) => [
        { type: 'Projects', id: `${projectId}-members` },
      ],
    }),

    createProjectInvitation: builder.mutation<
      { invitation: PendingProjectInvitation; delivery: ShareDelivery },
      { projectId: string; email: string; role: ProjectShareRole }
    >({
      query: ({ projectId, email, role }) => ({
        url: `/projects/${projectId}/invitations`,
        method: 'POST',
        body: { email, role },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Projects', id: `${projectId}-members` },
        { type: 'Projects', id: projectId },
        { type: 'Projects', id: 'LIST' },
      ],
    }),

    updateProjectMember: builder.mutation<
      ProjectMember,
      { projectId: string; memberId: string; role: ProjectShareRole }
    >({
      query: ({ projectId, memberId, role }) => ({
        url: `/projects/${projectId}/members/${memberId}`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Projects', id: `${projectId}-members` },
        { type: 'Projects', id: projectId },
        { type: 'Projects', id: 'LIST' },
      ],
    }),

    removeProjectMember: builder.mutation<void, { projectId: string; memberId: string }>({
      query: ({ projectId, memberId }) => ({
        url: `/projects/${projectId}/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Projects', id: `${projectId}-members` },
        { type: 'Projects', id: projectId },
        { type: 'Projects', id: 'LIST' },
      ],
    }),

    getProjectChats: builder.query<ProjectChat[], string>({
      query: (projectId) => `/projects/${projectId}/chats`,
      providesTags: (_result, _error, projectId) => [
        { type: 'Projects', id: `${projectId}-chats` },
        { type: 'Chat', id: 'LIST' },
      ],
    }),

    createProjectFolder: builder.mutation<ProjectFolder, CreateFolderRequest>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/folders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),

    updateProjectFolder: builder.mutation<ProjectFolder, UpdateFolderRequest>({
      query: ({ projectId, folderId, ...body }) => ({
        url: `/projects/${projectId}/folders/${folderId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),

    deleteProjectFolder: builder.mutation<void, { projectId: string; folderId: string }>({
      query: ({ projectId, folderId }) => ({
        url: `/projects/${projectId}/folders/${folderId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Projects', id: projectId },
        { type: 'Documents', id: 'LIST' },
      ],
    }),
  }),
})

export const { useGetProjectsQuery, useGetProjectQuery, useGetProjectChatsQuery } = projectsApi

export interface ProjectChatStreamOptions {
  projectId: string
  messages: ProjectChatMessage[]
  chat_id?: string
  model?: string
  displayed_doc?: ProjectChatDocument
  attached_documents?: ProjectChatDocument[]
  onEvent: (event: ChatStreamEvent) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  signal?: AbortSignal
}

export async function streamProjectChat(options: ProjectChatStreamOptions): Promise<StreamOutcome> {
  const {
    projectId,
    messages,
    chat_id,
    model,
    displayed_doc,
    attached_documents,
    onEvent,
    onError,
    onComplete,
    signal,
  } = options

  return streamSSE(
    apiUrl(`/projects/${projectId}/chat`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        chat_id,
        model,
        displayed_doc,
        attached_documents,
      }),
      signal,
    },
    {
      accepts: isChatStreamEvent,
      onEvent,
      onError,
      onComplete,
    },
  )
}
