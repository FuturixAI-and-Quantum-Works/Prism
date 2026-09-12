import type { CSSProperties, ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M12.5 15L7.5 10L12.5 5"
      stroke="#454545"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

interface ConversationLayoutProps {
  showSidebar: boolean
  showBackButton: boolean
  isLoading: boolean
  sidebar: ReactNode
  children: ReactNode
  overlays?: ReactNode
  onBack: () => void
}

export function ConversationLayout({
  showSidebar,
  showBackButton,
  isLoading,
  sidebar,
  children,
  overlays,
  onBack,
}: ConversationLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily,
      }}
    >
      <span role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {isLoading ? 'Assistant is responding' : ''}
      </span>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes fadeSlideIn {
            from {
              opacity: 0;
              transform: translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          @keyframes bounce {
            0%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-4px);
            }
          }
          .skeleton-item {
            background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite ease-in-out;
            border-radius: 4px;
          }
          .history-item-animated {
            animation: fadeSlideIn 0.3s ease-out forwards;
            opacity: 0;
          }
          .markdown-content p:last-child {
            display: inline;
          }
        `}
      </style>

      {showSidebar && sidebar}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#FFFFFF',
          borderLeft: showSidebar ? '0.5px solid #EDEDED' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {showBackButton && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderBottom: '0.5px solid #EDEDED',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#F7F7F7',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
                fontFamily,
              }}
            >
              <BackArrowIcon />
              Back to Dashboard
            </Button>
          </div>
        )}

        {children}
      </div>

      {overlays}
    </div>
  )
}
