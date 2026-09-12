import type { KeyboardEventHandler, ReactNode } from 'react'
import { placeholderTexts } from './workspaceOptions'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface ChatComposerPresentationProps {
  handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
  inputText: string
  isAnimating: boolean
  isBusy: boolean
  onInputChange: (value: string) => void
  placeholderIndex: number
  statusText: string
  toolbar: ReactNode
}

export function ChatComposerPresentation({
  handleKeyDown,
  inputText,
  isAnimating,
  isBusy,
  onInputChange,
  placeholderIndex,
  statusText,
  toolbar,
}: ChatComposerPresentationProps) {
  return (
    <>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {statusText}
      </span>
      <div aria-busy={isBusy} style={{ padding: '16px 20px 20px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDEDED',
            borderRadius: '20px',
            boxShadow: '0px 0px 16px rgba(0, 0, 0, 0.12)',
          }}
        >
          <div style={{ position: 'relative', width: '100%', minHeight: '40px' }}>
            <textarea
              value={inputText}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Message Prism"
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                fontWeight: 400,
                color: '#454545',
                backgroundColor: 'transparent',
                fontFamily,
                resize: 'none',
                minHeight: '40px',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                position: 'relative',
                zIndex: 1,
              }}
            />
            {!inputText && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '21px',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#9CA3AF',
                    fontFamily,
                    letterSpacing: '-0.8px',
                    lineHeight: '21px',
                    transform: isAnimating ? 'translateY(-100%)' : 'translateY(0)',
                    opacity: isAnimating ? 0 : 1,
                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                  }}
                >
                  {placeholderTexts[placeholderIndex]}
                </div>
              </div>
            )}
          </div>

          {toolbar}
        </div>
      </div>
    </>
  )
}
