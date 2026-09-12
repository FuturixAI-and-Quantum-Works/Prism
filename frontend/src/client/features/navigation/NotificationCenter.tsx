import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { NotificationIcon } from '../../components/icons'
import type {
  Notification,
  NotificationIcon as NotificationIconType,
} from '../../store/api/notificationsApi'
import { navigationFontFamily } from './navigationModel'
import { useNotificationCenter } from './useNotificationCenter'

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

function NotificationTypeIcon({ type }: { type: NotificationIconType }) {
  const iconStyle = { width: '18px', height: '18px', flexShrink: 0 }

  switch (type) {
    case 'document':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M10 2H5C4.44772 2 4 2.44772 4 3V15C4 15.5523 4.44772 16 5 16H13C13.5523 16 14 15.5523 14 15V6L10 2Z"
            stroke="#3B82F6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 2V6H14"
            stroke="#3B82F6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'compliance':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M9 16C12.866 16 16 12.866 16 9C16 5.13401 12.866 2 9 2C5.13401 2 2 5.13401 2 9C2 12.866 5.13401 16 9 16Z"
            stroke="#22C55E"
            strokeWidth="1.5"
          />
          <path
            d="M6 9L8 11L12 7"
            stroke="#22C55E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'comment':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M15 9C15 12.3137 12.3137 15 9 15C7.93913 15 6.93914 14.7362 6.05 14.27L3 15L3.73 11.95C3.26375 11.0609 3 9.93913 3 9C3 5.68629 5.68629 3 9 3C12.3137 3 15 5.68629 15 9Z"
            stroke="#8B5CF6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'approval':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M9 2L11.09 6.26L16 6.97L12.5 10.34L13.18 15.25L9 13.07L4.82 15.25L5.5 10.34L2 6.97L6.91 6.26L9 2Z"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'workspace':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M2 5.5C2 4.67 2.67 4 3.5 4H6.59C6.85 4 7.1 4.1 7.29 4.29L8.41 5.41C8.6 5.6 8.85 5.7 9.11 5.7H14.5C15.33 5.7 16 6.37 16 7.2V13.5C16 14.33 15.33 15 14.5 15H3.5C2.67 15 2 14.33 2 13.5V5.5Z"
            stroke="#6366F1"
            strokeWidth="1.5"
          />
        </svg>
      )
    case 'share':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <circle cx="13" cy="4" r="2.5" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="5" cy="9" r="2.5" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="13" cy="14" r="2.5" stroke="#10B981" strokeWidth="1.5" />
          <path d="M7.5 7.5L10.5 5.5M7.5 10.5L10.5 12.5" stroke="#10B981" strokeWidth="1.5" />
        </svg>
      )
    case 'mention':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke="#EC4899" strokeWidth="1.5" />
          <circle cx="9" cy="9" r="3" stroke="#EC4899" strokeWidth="1.5" />
          <path
            d="M12 9V10.5C12 11.88 13.12 13 14.5 13"
            stroke="#EC4899"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'system':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M9 2L2 6V12L9 16L16 12V6L9 2Z"
            stroke="#6B7280"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="9" r="2" stroke="#6B7280" strokeWidth="1.5" />
        </svg>
      )
    case 'alert':
    default:
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M9 16C12.866 16 16 12.866 16 9C16 5.13401 12.866 2 9 2C5.13401 2 2 5.13401 2 9C2 12.866 5.13401 16 9 16Z"
            stroke="#EF4444"
            strokeWidth="1.5"
          />
          <path d="M9 6V9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="12" r="0.5" fill="#EF4444" stroke="#EF4444" />
        </svg>
      )
  }
}

function NotificationRow({
  notification,
  onDelete,
  onSelect,
}: {
  notification: Notification
  onDelete: (id: string) => Promise<void>
  onSelect: (notification: Notification) => Promise<void>
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: notification.read ? '#FFFFFF' : '#F8FAFC',
        borderBottom: '1px solid #F3F4F6',
        cursor: notification.link ? 'pointer' : 'default',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = '#F7F7F7'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = notification.read ? '#FFFFFF' : '#F8FAFC'
      }}
    >
      <button
        type="button"
        onClick={() => void onSelect(notification)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          flex: 1,
          minWidth: 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
          textAlign: 'left',
          cursor: notification.link ? 'pointer' : 'default',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <NotificationTypeIcon type={notification.icon} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: notification.read ? 450 : 510,
                color: '#272727',
                letterSpacing: '-0.3px',
                fontFamily: navigationFontFamily,
              }}
            >
              {notification.title}
            </span>
            {!notification.read && (
              <span
                aria-label="Unread"
                role="img"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#3B82F6',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          {notification.description && (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 400,
                color: '#6B7280',
                letterSpacing: '-0.2px',
                fontFamily: navigationFontFamily,
                lineHeight: '18px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.description}
            </p>
          )}
          <span
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#9CA3AF',
              fontFamily: navigationFontFamily,
              marginTop: '4px',
              display: 'block',
            }}
          >
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>
      </button>

      <button
        type="button"
        aria-label={`Delete notification: ${notification.title}`}
        onClick={(event) => {
          event.stopPropagation()
          void onDelete(notification.id)
        }}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = '#FEE2E2'
          event.currentTarget.style.color = '#EF4444'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = 'transparent'
          event.currentTarget.style.color = '#9CA3AF'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}

export function NotificationCenter({
  containerRef,
  onClose,
  onToggle,
  open,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onToggle: () => void
  open: boolean
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const {
    actionError,
    deleteNotification,
    isLoading,
    markAllAsRead,
    notifications,
    selectNotification,
    unreadCount,
  } = useNotificationCenter(onClose)

  useLayoutEffect(() => {
    if (!open) return
    const restoreTarget = triggerRef.current
    const dialog = dialogRef.current
    const target = dialog?.querySelector<HTMLElement>('button:not(:disabled), a[href]') ?? dialog
    target?.focus()
    return () => restoreTarget?.focus()
  }, [open])

  const closeFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    onClose()
  }

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-controls={open ? 'notifications-popover' : undefined}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onToggle}
        onKeyDown={closeFromKeyboard}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '17px',
          height: '17px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#454545',
          padding: 0,
          position: 'relative',
        }}
      >
        <NotificationIcon />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '10px',
              height: '10px',
              backgroundColor: '#EF4444',
              borderRadius: '50%',
              fontSize: '9px',
              fontWeight: 600,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
            }}
          />
        )}
      </button>

      {open && (
        <div
          ref={dialogRef}
          id="notifications-popover"
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          onKeyDown={closeFromKeyboard}
          style={{
            position: 'absolute',
            top: '28px',
            right: '0',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EDEDED',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            width: '340px',
            maxHeight: '420px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #EDEDED',
            }}
          >
            <span
              style={{
                fontSize: '15px',
                fontWeight: 590,
                color: '#272727',
                letterSpacing: '-0.5px',
                fontFamily: navigationFontFamily,
              }}
            >
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    backgroundColor: '#FEE2E2',
                    color: '#EF4444',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 510,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 510,
                  color: '#3B82F6',
                  cursor: 'pointer',
                  fontFamily: navigationFontFamily,
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {actionError && (
            <p
              role="alert"
              style={{
                margin: '12px 16px 0',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#B42318',
                fontSize: '13px',
                lineHeight: '18px',
              }}
            >
              {actionError}
            </p>
          )}

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '340px' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  color: '#999999',
                }}
              >
                <NotificationIcon />
                <span
                  style={{ marginTop: '12px', fontSize: '14px', fontFamily: navigationFontFamily }}
                >
                  No notifications yet
                </span>
              </div>
            ) : isLoading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  color: '#999999',
                }}
              >
                <span style={{ fontSize: '14px', fontFamily: navigationFontFamily }}>
                  Loading...
                </span>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onDelete={deleteNotification}
                  onSelect={selectNotification}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
