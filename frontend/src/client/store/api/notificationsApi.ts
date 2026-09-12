import { baseApi } from './baseApi'

export type NotificationIcon =
  | 'document'
  | 'compliance'
  | 'comment'
  | 'approval'
  | 'workspace'
  | 'alert'
  | 'share'
  | 'mention'
  | 'system'

export interface Notification {
  id: string
  icon: NotificationIcon
  title: string
  description: string | null
  read: boolean
  link: string | null
  resource_type: string | null
  resource_id: string | null
  actor_user_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface NotificationsResponse {
  notifications: Notification[]
}

export interface UnreadCountResponse {
  unread_count: number
}

export interface MarkReadResponse {
  id: string
  read: boolean
  updated_at: string
}

export interface MarkAllReadResponse {
  marked_read: number
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      NotificationsResponse,
      { limit?: number; offset?: number; unreadOnly?: boolean }
    >({
      query: ({ limit = 50, offset = 0, unreadOnly = false }) => ({
        url: '/notifications',
        params: {
          limit,
          offset,
          unread_only: unreadOnly ? 'true' : undefined,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.notifications.map(({ id }) => ({ type: 'Notifications' as const, id })),
              { type: 'Notifications', id: 'LIST' },
            ]
          : [{ type: 'Notifications', id: 'LIST' }],
    }),

    getUnreadCount: builder.query<UnreadCountResponse, void>({
      query: () => '/notifications/count',
      providesTags: [{ type: 'Notifications', id: 'COUNT' }],
    }),

    markNotificationAsRead: builder.mutation<MarkReadResponse, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, notificationId) => [
        { type: 'Notifications', id: notificationId },
        { type: 'Notifications', id: 'COUNT' },
        { type: 'Notifications', id: 'LIST' },
      ],
    }),

    markAllNotificationsAsRead: builder.mutation<MarkAllReadResponse, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: [
        { type: 'Notifications', id: 'LIST' },
        { type: 'Notifications', id: 'COUNT' },
      ],
    }),

    deleteNotification: builder.mutation<void, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, notificationId) => [
        { type: 'Notifications', id: notificationId },
        { type: 'Notifications', id: 'COUNT' },
        { type: 'Notifications', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi
