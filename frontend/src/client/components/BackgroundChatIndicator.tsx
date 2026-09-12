import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { appRoutes } from '../appRoutes'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { dismissNotification, clearBackgroundChat } from '../store/slices/backgroundChatSlice'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'
const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8L6.5 11.5L13 4.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default function BackgroundChatIndicator() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isActive, isStreaming, isComplete, workspaceId, lastUserMessage, notificationDismissed } =
    useAppSelector((state) => state.backgroundChat)
  const [showNotification, setShowNotification] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isComplete && !notificationDismissed) {
      setShowNotification(true)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Chat Response Ready', {
          body: 'Your AI assistant has finished responding.',
          icon: '/favicon.ico',
        })
      }
    }
  }, [isComplete, notificationDismissed])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  if (!isActive) return null

  const handleContinue = () => {
    navigate(workspaceId ? appRoutes.workspace(workspaceId) : '/assistant')
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(dismissNotification())
    setShowNotification(false)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(clearBackgroundChat())
  }

  const truncatedMessage =
    lastUserMessage.length > 40 ? lastUserMessage.slice(0, 40) + '...' : lastUserMessage

  return (
    <>
      <span role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {isStreaming
          ? 'AI is responding'
          : isComplete
            ? 'AI response ready'
            : 'Background chat active'}
      </span>
      <div
        className="prism-background-chat-indicator"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: isComplete ? '#10B981' : '#272727',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          zIndex: 1000,
          fontFamily,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <button
          type="button"
          onClick={handleContinue}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            fontFamily,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div
            className={
              isStreaming
                ? 'prism-background-chat-icon prism-background-chat-icon--streaming'
                : isComplete
                  ? 'prism-background-chat-icon prism-background-chat-icon--complete'
                  : 'prism-background-chat-icon'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              color: '#FFFFFF',
            }}
          >
            {isComplete ? <CheckIcon /> : <ChatIcon />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                letterSpacing: '-0.3px',
              }}
            >
              {isStreaming ? 'AI is responding...' : 'Response ready'}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.7)',
                letterSpacing: '-0.2px',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {truncatedMessage}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              marginLeft: '8px',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 510,
                color: '#FFFFFF',
                letterSpacing: '-0.3px',
              }}
            >
              Continue
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 3L9 7L5 11"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>

        <button
          type="button"
          aria-label="Dismiss background chat"
          onClick={handleClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'rgba(255, 255, 255, 0.7)',
            padding: 0,
            marginLeft: '4px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {showNotification && isComplete && !notificationDismissed && (
        <div
          className="prism-background-chat-toast"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
            border: '1px solid #E5E7EB',
            zIndex: 1001,
            fontFamily,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: '#D1FAE5',
              borderRadius: '8px',
              color: '#10B981',
            }}
          >
            <CheckIcon />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#272727',
                letterSpacing: '-0.3px',
              }}
            >
              Response Complete
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 400,
                color: '#6B7280',
                letterSpacing: '-0.2px',
              }}
            >
              Click the chat indicator to continue
            </span>
          </div>
          <button
            type="button"
            aria-label="Dismiss response notification"
            onClick={handleDismiss}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: 0,
              marginLeft: '8px',
            }}
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </>
  )
}
