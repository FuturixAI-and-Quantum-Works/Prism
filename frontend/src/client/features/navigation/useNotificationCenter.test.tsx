import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationCenter } from './useNotificationCenter'

const api = vi.hoisted(() => ({
  deleteNotification: vi.fn(),
  markAllAsRead: vi.fn(),
  markAsRead: vi.fn(),
}))

vi.mock('../../store/api/notificationsApi', () => ({
  useDeleteNotificationMutation: () => [api.deleteNotification],
  useGetNotificationsQuery: () => ({ data: { notifications: [] }, isLoading: false }),
  useGetUnreadCountQuery: () => ({ data: { unread_count: 1 } }),
  useMarkAllNotificationsAsReadMutation: () => [api.markAllAsRead],
  useMarkNotificationAsReadMutation: () => [api.markAsRead],
}))

let pathname = ''

function LocationCapture() {
  pathname = useLocation().pathname
  return null
}

function Router({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/documents']}>
      <LocationCapture />
      {children}
    </MemoryRouter>
  )
}

describe('useNotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pathname = ''
    api.deleteNotification.mockReturnValue({ unwrap: () => Promise.resolve({ ok: true }) })
    api.markAllAsRead.mockReturnValue({ unwrap: () => Promise.resolve({ ok: true }) })
    api.markAsRead.mockReturnValue({ unwrap: () => Promise.resolve({ ok: true }) })
  })

  it('does not close or navigate when marking a selected notification fails', async () => {
    api.markAsRead.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Read status was not saved.' } }),
    })
    const onClose = vi.fn()
    const { result } = renderHook(() => useNotificationCenter(onClose), { wrapper: Router })

    await act(async () =>
      result.current.selectNotification({
        id: 'notification-1',
        icon: 'document',
        title: 'Document updated',
        description: 'Review changes',
        read: false,
        link: '/documents/document-1',
        resource_type: 'document',
        resource_id: 'document-1',
        actor_user_id: null,
        metadata: null,
        created_at: '2026-09-01T12:00:00.000Z',
      }),
    )

    expect(result.current.actionError).toBe('Read status was not saved.')
    expect(onClose).not.toHaveBeenCalled()
    expect(pathname).toBe('/documents')
  })

  it('exposes delete and mark-all failures for rendering', async () => {
    api.deleteNotification.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Delete failed.' } }),
    })
    api.markAllAsRead.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Bulk update failed.' } }),
    })
    const { result } = renderHook(() => useNotificationCenter(vi.fn()), { wrapper: Router })

    await act(async () => result.current.deleteNotification('notification-1'))
    expect(result.current.actionError).toBe('Delete failed.')

    await act(async () => result.current.markAllAsRead())
    expect(result.current.actionError).toBe('Bulk update failed.')
  })
})
