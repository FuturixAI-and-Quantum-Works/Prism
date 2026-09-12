import { baseApi } from '../baseApi'
import type { DriveFile } from './driveFileApi'

export interface DriveFolder {
  id: string
  user_id: string
  workspace_id: string | null
  parent_folder_id: string | null
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface DriveFoldersListResponse {
  folders: DriveFolder[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface ListFoldersRequest {
  workspace_id?: string | null
  parent_folder_id?: string | null
  search?: string
  limit?: number
  offset?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateDriveFolderRequest {
  name: string
  workspace_id?: string | null
  parent_folder_id?: string | null
  description?: string | null
}

export interface UpdateDriveFolderRequest {
  folderId: string
  name?: string
  description?: string | null
  parent_folder_id?: string | null
}

export interface MoveItemsRequest {
  file_ids?: string[]
  folder_ids?: string[]
  target_workspace_id?: string | null
  target_folder_id?: string | null
}

export interface MoveItemsResponse {
  files_moved: number
  folders_moved: number
  files: DriveFile[]
  folders: DriveFolder[]
}

export interface DeleteItemsRequest {
  file_ids?: string[]
  folder_ids?: string[]
}

export interface DeleteItemsResponse {
  success: boolean
  files_deleted: number
  folders_deleted: number
}

export const driveFolderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDriveFolders: builder.query<DriveFoldersListResponse, ListFoldersRequest | void>({
      query: (params) => ({
        url: '/drive/folders',
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.folders.map(({ id }) => ({ type: 'DriveFolders' as const, id })),
              { type: 'DriveFolders', id: 'LIST' },
            ]
          : [{ type: 'DriveFolders', id: 'LIST' }],
    }),
    createDriveFolder: builder.mutation<DriveFolder, CreateDriveFolderRequest>({
      query: (body) => ({
        url: '/drive/folders',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DriveFolders', id: 'LIST' }],
    }),
    getDriveFolder: builder.query<DriveFolder, string>({
      query: (folderId) => `/drive/folders/${folderId}`,
      providesTags: (_result, _error, folderId) => [{ type: 'DriveFolders', id: folderId }],
    }),
    updateDriveFolder: builder.mutation<DriveFolder, UpdateDriveFolderRequest>({
      query: ({ folderId, ...body }) => ({
        url: `/drive/folders/${folderId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { folderId }) => [
        { type: 'DriveFolders', id: folderId },
        { type: 'DriveFolders', id: 'LIST' },
      ],
    }),
    deleteDriveFolder: builder.mutation<void, string>({
      query: (folderId) => ({
        url: `/drive/folders/${folderId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'DriveFolders', id: 'LIST' },
        { type: 'DriveFiles', id: 'LIST' },
      ],
    }),
    moveDriveItems: builder.mutation<MoveItemsResponse, MoveItemsRequest>({
      query: (body) => ({
        url: '/drive/items/move',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'DriveFiles', id: 'LIST' },
        { type: 'DriveFolders', id: 'LIST' },
        { type: 'DriveWorkspaces', id: 'LIST' },
      ],
    }),
    deleteDriveItems: builder.mutation<DeleteItemsResponse, DeleteItemsRequest>({
      query: (body) => ({
        url: '/drive/items/delete',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'DriveFiles', id: 'LIST' },
        { type: 'DriveFolders', id: 'LIST' },
        { type: 'DriveWorkspaces', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetDriveFoldersQuery,
  useLazyGetDriveFoldersQuery,
  useCreateDriveFolderMutation,
  useGetDriveFolderQuery,
  useLazyGetDriveFolderQuery,
  useUpdateDriveFolderMutation,
  useDeleteDriveFolderMutation,
  useMoveDriveItemsMutation,
  useDeleteDriveItemsMutation,
} = driveFolderApi
