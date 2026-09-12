import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { apiBaseUrl, notifySessionLost } from '../../lib/apiTransport'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: 'include',
})

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    notifySessionLost()
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'User',
    'Projects',
    'Documents',
    'Library',
    'Sources',
    'Rulebook',
    'Review',
    'Shared',
    'Chat',
    'ChatSession',
    'Notifications',
    'Team',
    'Workflows',
    'TabularReview',
    'ComplianceReview',
    'DriveFiles',
    'DriveFolders',
    'DriveWorkspaces',
    'Templates',
    'Approvals',
    'DocumentComments',
    'DocumentActivity',
    'DocumentEdits',
    'DocumentPlaceholders',
    'DocumentContextFiles',
    'DocumentInsights',
    'DriveActivity',
    'DriveVersions',
    'ServiceStatus',
    'AttentionItems',
    'UserActivity',
  ],
  endpoints: () => ({}),
})
