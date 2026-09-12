import { baseApi } from '../baseApi'

export interface DriveFileVersion {
  id: string
  file_id: string
  version_number: number
  storage_path: string
  size_bytes: number | string
  checksum: string | null
  created_by_user_id: string | null
  created_by_email?: string | null
  created_by_name?: string | null
  created_at: string
}

export interface DriveFileVersionsResponse {
  current_version: number
  versions: DriveFileVersion[]
}

export const driveVersionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDriveFileVersions: builder.query<DriveFileVersionsResponse, string>({
      query: (fileId) => `/drive/files/${fileId}/versions`,
      providesTags: (_result, _error, fileId) => [{ type: 'DriveVersions', id: fileId }],
    }),
    uploadDriveFileVersion: builder.mutation<
      DriveFileVersion,
      { fileId: string; formData: FormData }
    >({
      query: ({ fileId, formData }) => ({
        url: `/drive/files/${fileId}/versions`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { fileId }) => [
        { type: 'DriveFiles', id: fileId },
        { type: 'DriveVersions', id: fileId },
        { type: 'DriveActivity', id: fileId },
      ],
    }),
  }),
})

export const { useGetDriveFileVersionsQuery, useUploadDriveFileVersionMutation } = driveVersionApi
