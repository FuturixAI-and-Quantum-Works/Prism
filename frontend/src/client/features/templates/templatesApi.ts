import { baseApi } from '../../store/api/baseApi'
import type { Document } from '../../store/types'

export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'number' | 'email' | 'phone' | 'address'
  required: boolean
  placeholder?: string
  section?: string
  options?: string[]
}

export interface Template {
  id: string
  userId: string | null
  name: string
  category: string
  description: string | null
  contentHtml: string
  fields: TemplateField[] | null
  sourceFilename: string | null
  sourceStoragePath: string | null
  sourceMimeType: string | null
  sourceChecksum: string | null
  sourceMetadata: unknown
  isCreatedByUser: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateRequest {
  name: string
  category: string
  description?: string
  content_html: string
  fields?: TemplateField[]
}

export interface UpdateTemplateRequest {
  name?: string
  category?: string
  description?: string
  content_html?: string
  fields?: TemplateField[]
}

export interface CloneTemplateRequest {
  name?: string
}

export interface CreateDocumentFromTemplateRequest {
  name?: string
  filename?: string
  values?: Record<string, string>
  project_id?: string | null
  workspace_id?: string | null
  folder_id?: string | null
  is_primary?: boolean
}

export type TemplateListType = 'system' | 'user' | 'all'

export const templatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTemplates: builder.query<Template[], { type?: TemplateListType } | void>({
      query: (params) => ({
        url: '/templates',
        params: params ? { type: params.type } : undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Templates' as const, id })),
              { type: 'Templates', id: 'LIST' },
            ]
          : [{ type: 'Templates', id: 'LIST' }],
    }),

    getTemplate: builder.query<Template, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Templates', id }],
    }),

    createTemplate: builder.mutation<Template, CreateTemplateRequest>({
      query: (body) => ({
        url: '/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Templates', id: 'LIST' }],
    }),

    updateTemplate: builder.mutation<Template, { id: string; data: UpdateTemplateRequest }>({
      query: ({ id, data }) => ({
        url: `/templates/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Templates', id },
        { type: 'Templates', id: 'LIST' },
      ],
    }),

    deleteTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Templates', id: 'LIST' }],
    }),

    cloneTemplate: builder.mutation<Template, { id: string; data?: CloneTemplateRequest }>({
      query: ({ id, data }) => ({
        url: `/templates/${id}/clone`,
        method: 'POST',
        body: data ?? {},
      }),
      invalidatesTags: [{ type: 'Templates', id: 'LIST' }],
    }),

    createDocumentFromTemplate: builder.mutation<
      Document,
      { id: string; data?: CreateDocumentFromTemplateRequest }
    >({
      query: ({ id, data }) => ({
        url: `/templates/${id}/create-document`,
        method: 'POST',
        body: data ?? {},
      }),
      invalidatesTags: [
        { type: 'Documents', id: 'LIST' },
        { type: 'Projects', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetTemplatesQuery,
  useLazyGetTemplatesQuery,
  useGetTemplateQuery,
  useLazyGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useCloneTemplateMutation,
  useCreateDocumentFromTemplateMutation,
} = templatesApi
