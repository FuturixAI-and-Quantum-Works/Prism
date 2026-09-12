import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { appRoutes } from '../appRoutes'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import {
  dismissProcess,
  removeProcess,
  selectVisibleProcesses,
  type PendingProcess,
} from '../store/slices/pendingProcessesSlice'

function getProcessPath(process: PendingProcess): string | null {
  if (process.type === 'chat') {
    if (process.workspaceId) return appRoutes.workspace(process.workspaceId)
    return '/assistant'
  }
  if (process.type === 'compliance') {
    if (process.reviewId) return appRoutes.complianceReview(process.reviewId)
    if (process.documentId) return appRoutes.complianceDocument(process.documentId)
    if (process.workspaceId) return appRoutes.complianceWorkspace(process.workspaceId)
  }
  if (process.workspaceId) return appRoutes.workspace(process.workspaceId)
  if (process.reviewId) return `/review/${process.reviewId}`
  return null
}

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

const SpinnerIcon = () => (
  <svg
    className="prism-pending-process-spinner"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
  >
    <circle
      cx="10"
      cy="10"
      r="8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="50"
      strokeDashoffset="20"
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

const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 5V8M8 11H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
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

const getProcessIcon = (type: PendingProcess['type']) => {
  switch (type) {
    case 'compliance':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'tabular_review':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 10H21M3 14H21M12 3V21M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'analysis':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 19V13M5 19V9M13 19V17M17 19V11M21 19V7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'document_generation':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 2V8H20M12 18V12M9 15H15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'chat':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

const getStatusBgColor = (status: PendingProcess['status']) => {
  switch (status) {
    case 'running':
      return '#272727'
    case 'completed':
      return '#047857'
    case 'error':
      return '#B91C1C'
  }
}

const getStatusIcon = (status: PendingProcess['status']) => {
  switch (status) {
    case 'running':
      return <SpinnerIcon />
    case 'completed':
      return <CheckIcon />
    case 'error':
      return <ErrorIcon />
  }
}

const getStatusText = (status: PendingProcess['status']) => {
  switch (status) {
    case 'running':
      return 'Running...'
    case 'completed':
      return 'Completed'
    case 'error':
      return 'Failed'
  }
}

export default function PendingProcessesIndicator() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const visibleProcesses = useAppSelector(selectVisibleProcesses)
  const [isHovered, setIsHovered] = useState(false)

  const offPageProcesses = visibleProcesses.filter((p) => {
    const processPath = getProcessPath(p)
    return (
      !processPath || !location.pathname.startsWith(processPath.split('/').slice(0, 3).join('/'))
    )
  })

  if (offPageProcesses.length === 0) return null

  const latestProcess = offPageProcesses[0]
  const runningCount = offPageProcesses.filter((p) => p.status === 'running').length
  const otherCount = offPageProcesses.length - 1

  const handleClick = () => {
    const processPath = getProcessPath(latestProcess)
    if (!processPath) return
    if (latestProcess.type === 'chat' && latestProcess.chatId && !latestProcess.workspaceId) {
      localStorage.setItem('prism_assistant_active_chat', latestProcess.chatId)
    }
    const query =
      latestProcess.type === 'tabular_review' && latestProcess.workspaceId ? '?tab=tabular' : ''
    navigate(`${processPath}${query}`)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (latestProcess.status === 'running') {
      dispatch(dismissProcess(latestProcess.id))
    } else {
      dispatch(removeProcess(latestProcess.id))
    }
  }

  const statusIcon = getStatusIcon(latestProcess.status)
  const statusText = getStatusText(latestProcess.status)

  return (
    <>
      <span role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {latestProcess.title}: {statusText}
        {runningCount > 1 &&
          latestProcess.status === 'running' &&
          `, ${runningCount} active processes`}
      </span>
      <div
        className="prism-pending-process-indicator"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: getStatusBgColor(latestProcess.status),
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          zIndex: 999,
          fontFamily,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <button
          type="button"
          onClick={handleClick}
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
            {getProcessIcon(latestProcess.type)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  letterSpacing: '-0.3px',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {latestProcess.title}
              </span>
              {otherCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  +{otherCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{ color: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center' }}
              >
                {statusIcon}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  color: '#FFFFFF',
                  letterSpacing: '-0.2px',
                }}
              >
                {statusText}
                {runningCount > 1 &&
                  latestProcess.status === 'running' &&
                  ` (${runningCount} active)`}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              marginLeft: '4px',
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
              View
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
          aria-label={`Dismiss ${latestProcess.title}`}
          onClick={handleDismiss}
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
    </>
  )
}
