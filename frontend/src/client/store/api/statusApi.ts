import { baseApi } from './baseApi'

type HealthStatus = 'operational' | 'degraded' | 'down'

interface ServiceStatus {
  name: string
  displayName: string
  status: HealthStatus
  responseTimeMs: number | null
}

interface OverallStatus {
  status: HealthStatus
  message: string
  lastUpdated: string | null
  services: ServiceStatus[]
}

interface DailyStatus {
  date: string
  status: HealthStatus | 'no_data'
}

interface ServiceHistory {
  name: string
  displayName: string
  uptimePercentage: number
  history: DailyStatus[]
}

interface StatusHistoryResponse {
  services: ServiceHistory[]
}

export const statusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemStatus: builder.query<OverallStatus, void>({
      query: () => '/status',
      providesTags: ['ServiceStatus'],
    }),
    getStatusHistory: builder.query<StatusHistoryResponse, number | void>({
      query: (days = 90) => `/status/history?days=${days}`,
      providesTags: ['ServiceStatus'],
    }),
    triggerHealthCheck: builder.mutation<OverallStatus & { ok: boolean }, void>({
      query: () => ({
        url: '/status/check',
        method: 'POST',
      }),
      invalidatesTags: ['ServiceStatus'],
    }),
  }),
})

export const { useGetSystemStatusQuery, useGetStatusHistoryQuery, useTriggerHealthCheckMutation } =
  statusApi
