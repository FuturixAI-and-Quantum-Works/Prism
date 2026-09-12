import { useState } from 'react'
import bulbIcon from '../../../assets/conversation/bulb-icon.svg'
import copyIcon from '../../../assets/conversation/copy-icon.svg'
import downloadIcon from '../../../assets/conversation/download-icon.svg'
import { Button, IconButton } from '../../../components/ui/Button'
import type { ActionVisibility } from './conversationModel'

const SHOW_FOLLOW_UPS = false

interface ResponseActionsProps {
  onFollowUpClick: (text: string) => void
  onCopy: () => void
  onDownload: () => void
  followUps: string[]
  visibility: ActionVisibility
}

export function ResponseActions({
  onFollowUpClick,
  onCopy,
  onDownload,
  followUps,
  visibility,
}: ResponseActionsProps) {
  const { showExportAndEditor, showCopyShareDownload, showFollowUps, showSources } = visibility
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!showExportAndEditor && !showCopyShareDownload && !showFollowUps) {
    return null
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '20px',
        marginBottom: '32px',
        width: '100%',
      }}
    >
      {(showCopyShareDownload || showSources) && (
        <>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {showCopyShareDownload && (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '6px 0' }}>
                <IconButton
                  label={copied ? 'Response copied' : 'Copy response'}
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy response'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: copied ? 0.6 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {copied ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M4 10L8 14L16 6"
                        stroke="#22C55E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <img src={copyIcon} alt="" style={{ width: '20px', height: '20px' }} />
                  )}
                </IconButton>
                <IconButton
                  label="Download response as text"
                  onClick={onDownload}
                  title="Download as text file"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img src={downloadIcon} alt="" style={{ width: '15px', height: '14px' }} />
                </IconButton>
              </div>
            )}
            {showCopyShareDownload && showSources && (
              <div style={{ height: '20px', width: '1px', backgroundColor: '#EDEDED' }} />
            )}
          </div>
          {showFollowUps && (
            <div style={{ width: '100%', height: '1px', backgroundColor: '#EDEDED' }} />
          )}
        </>
      )}

      {SHOW_FOLLOW_UPS && showFollowUps && followUps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p
            style={{
              fontSize: '18px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.9px',
              lineHeight: '21px',
              margin: 0,
            }}
          >
            Follow ups
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '450px' }}>
            {followUps.map((followUp, index) => (
              <Button
                key={index}
                onClick={() => onFollowUpClick(followUp)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#F7F7F7',
                  border: '1px solid #EDEDED',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = '#EFEFEF'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = '#F7F7F7'
                }}
              >
                <img
                  src={bulbIcon}
                  alt=""
                  style={{ width: '24px', height: '24px', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#454545',
                    letterSpacing: '-0.28px',
                    lineHeight: '18px',
                  }}
                >
                  {followUp}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
