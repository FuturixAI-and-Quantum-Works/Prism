import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import arrowRight from '../../../assets/dashboard/arrow-right.svg'
import { MenuIcon } from '../../../components/icons'
import { Button, IconButton } from '../../../components/ui/Button'
import { panelAnimationStyles, panelFontFamily } from './panelStyles'

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <MenuIcon
      style={{
        display: 'block',
        transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    />
  )
}

function HistoryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function CollapsedPanel({
  showHistory,
  onShowHistory,
  onToggle,
}: {
  showHistory: boolean
  onShowHistory: () => void
  onToggle: () => void
}) {
  return (
    <div
      data-ai-panel
      style={{
        position: 'fixed',
        right: 0,
        top: '42px',
        bottom: 0,
        width: '48px',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #EDEDED',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '12px',
        paddingBottom: '30px',
        zIndex: 100,
      }}
    >
      <IconButton
        label="Expand assistant panel"
        onClick={onToggle}
        aria-expanded={false}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '24px',
        }}
      >
        <CollapseIcon collapsed />
      </IconButton>
      <IconButton
        label="Open chat history"
        onClick={onShowHistory}
        aria-pressed={showHistory}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          backgroundColor: '#F7F7F7',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          padding: 0,
          color: '#454545',
        }}
      >
        <HistoryIcon />
      </IconButton>
    </div>
  )
}

interface PanelFrameProps {
  children: ReactNode
  panelWidth: number
  isTablet: boolean
  isSending: boolean
  isResizing: boolean
  resizable: boolean
  minWidth: number
  maxWidth: number
  onResizeMouseDown: (event: MouseEvent) => void
  onResizeKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

export function PanelFrame({
  children,
  panelWidth,
  isTablet,
  isSending,
  isResizing,
  resizable,
  minWidth,
  maxWidth,
  onResizeMouseDown,
  onResizeKeyDown,
}: PanelFrameProps) {
  return (
    <div
      id="ai-assistant-panel"
      data-ai-panel
      aria-busy={isSending}
      style={{
        position: 'fixed',
        right: 0,
        top: '42px',
        bottom: 0,
        width: `${panelWidth}px`,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #EDEDED',
        display: 'flex',
        flexDirection: 'column',
        padding: isTablet ? '20px 16px' : '30px 22px',
        fontFamily: panelFontFamily,
        zIndex: 100,
        boxSizing: 'border-box',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      <style>{panelAnimationStyles}</style>
      {resizable && (
        <div
          role="separator"
          aria-label="Resize assistant panel"
          aria-orientation="vertical"
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={panelWidth}
          aria-valuetext={`${Math.round(panelWidth)} pixels`}
          tabIndex={0}
          onMouseDown={onResizeMouseDown}
          onKeyDown={onResizeKeyDown}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '2px',
            cursor: 'ew-resize',
            backgroundColor: isResizing ? '#338BE3' : 'transparent',
            transition: 'background-color 0.15s ease',
            zIndex: 101,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(event) => {
            if (!isResizing) {
              event.currentTarget.style.backgroundColor = '#EDEDED'
              const icon = event.currentTarget.querySelector('.resize-icon') as HTMLElement
              if (icon) icon.style.opacity = '1'
            }
          }}
          onMouseLeave={(event) => {
            if (!isResizing) {
              event.currentTarget.style.backgroundColor = 'transparent'
              const icon = event.currentTarget.querySelector('.resize-icon') as HTMLElement
              if (icon) icon.style.opacity = '0'
            }
          }}
          onFocus={(event) => {
            event.currentTarget.style.backgroundColor = '#EDEDED'
            const icon = event.currentTarget.querySelector('.resize-icon') as HTMLElement
            if (icon) icon.style.opacity = '1'
          }}
          onBlur={(event) => {
            if (!isResizing) {
              event.currentTarget.style.backgroundColor = 'transparent'
              const icon = event.currentTarget.querySelector('.resize-icon') as HTMLElement
              if (icon) icon.style.opacity = '0'
            }
          }}
        >
          <div
            className="resize-icon"
            style={{
              opacity: isResizing ? 1 : 0,
              transition: 'opacity 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              padding: '6px',
              borderRadius: '50%',
              border: '1px solid #EDEDED',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                backgroundColor: '#F5F5F5',
                width: 25,
                display: 'flex',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
            >
              <img
                src={arrowRight}
                style={{ width: '10px', height: '25px', transform: 'rotate(-180deg)' }}
                alt=""
              />
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

export function PanelHeader({
  showHistory,
  onToggleHistory,
  onTogglePanel,
}: {
  showHistory: boolean
  onToggleHistory: () => void
  onTogglePanel: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexShrink: 0,
      }}
    >
      <Button
        onClick={onToggleHistory}
        aria-label={showHistory ? 'Back to chat' : 'Open chat history'}
        aria-pressed={showHistory}
        title={showHistory ? 'Back to Chat' : 'Chat History'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '32px',
          padding: '0 10px',
          backgroundColor: showHistory ? '#F7F7F7' : 'transparent',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#454545',
        }}
      >
        {showHistory ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 510 }}>Back</span>
          </>
        ) : (
          <HistoryIcon />
        )}
      </Button>
      <IconButton
        label="Collapse assistant panel"
        onClick={onTogglePanel}
        aria-expanded={true}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <CollapseIcon collapsed={false} />
      </IconButton>
    </div>
  )
}
