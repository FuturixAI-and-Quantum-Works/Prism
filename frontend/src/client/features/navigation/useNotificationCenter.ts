import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
  type Notification,
} from '../../store/api/notificationsApi'

export function useNotificationCenter(onClose: () => void) {
  const navigate = useNavigate()
  const { data: notificationsData, isLoading } = useGetNotificationsQuery({ limit: 50 })
  const { data: unreadCountData } = useGetUnreadCountQuery()
  const [markAsRead] = useMarkNotificationAsReadMutation()
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()
  const [actionError, setActionError] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setActionError(null)
    try {
      await deleteNotification(id).unwrap()
    } catch (requestError) {
      setActionError(getRequestErrorMessage(requestError, 'Could not delete the notification.'))
    }
  }

  const handleMarkAsRead = async (id: string) => {
    setActionError(null)
    try {
      await markAsRead(id).unwrap()
      return true
    } catch (requestError) {
      setActionError(
        getRequestErrorMessage(requestError, 'Could not mark the notification as read.'),
      )
      return false
    }
  }

  const handleMarkAllAsRead = async () => {
    setActionError(null)
    try {
      await markAllAsRead().unwrap()
    } catch (requestError) {
      setActionError(
        getRequestErrorMessage(requestError, 'Could not mark all notifications as read.'),
      )
    }
  }

  const handleSelect = async (notification: Notification) => {
    if (!notification.read) {
      const marked = await handleMarkAsRead(notification.id)
      if (!marked) return
    }
    if (notification.link) {
      onClose()
      navigate(notification.link)
    }
  }

  return {
    actionError,
    deleteNotification: handleDelete,
    isLoading,
    markAllAsRead: handleMarkAllAsRead,
    notifications: notificationsData?.notifications ?? [],
    selectNotification: handleSelect,
    unreadCount: unreadCountData?.unread_count ?? 0,
  }
}
