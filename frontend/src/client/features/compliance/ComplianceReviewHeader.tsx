import directboxSendIcon from '../../assets/docs-compliance/directbox-send-icon.svg'
import packageOpenIcon from '../../assets/docs-compliance/package-open-icon.svg'
import playCircleIcon from '../../assets/docs-compliance/play-circle-icon.svg'
import { complianceFontFamily } from './compliancePresentation'

interface ComplianceReviewHeaderProps {
  embedded: boolean
  canClose: boolean
  hasSelectedRulebook: boolean
  rulebookImported: boolean
  reviewId: string | null
  isRunning: boolean
  onClose: (() => void) | undefined
  onImportRules: () => void
  onAddRule: () => void
  onAddQuestion: () => void
  onRun: () => void
  onCancel: () => void
}

export function ComplianceReviewHeader({
  embedded,
  canClose,
  hasSelectedRulebook,
  rulebookImported,
  reviewId,
  isRunning,
  onClose,
  onImportRules,
  onAddRule,
  onAddQuestion,
  onRun,
  onCancel,
}: ComplianceReviewHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EDEDED',
        flexShrink: 0,
      }}
    >
      {embedded && canClose && (
        <button
          type="button"
          aria-label="Close compliance review"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#F7F7F7',
            border: '1px solid #EDEDED',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '12px',
            fontFamily: complianceFontFamily,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="#454545"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>Close</span>
        </button>
      )}
      <p
        style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.9px',
          lineHeight: '21px',
          fontFamily: complianceFontFamily,
        }}
      >
        Compliance Review
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {hasSelectedRulebook && (
          <button
            type="button"
            onClick={onImportRules}
            disabled={rulebookImported}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '32px',
              padding: '8px 14px',
              backgroundColor: rulebookImported ? '#9CA3AF' : '#22C55E',
              border: 'none',
              borderRadius: '5px',
              cursor: rulebookImported ? 'not-allowed' : 'pointer',
              fontFamily: complianceFontFamily,
              opacity: rulebookImported ? 0.7 : 1,
            }}
          >
            {rulebookImported ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.5 4.5L6 12L2.5 8.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            <span style={{ fontSize: '14px', fontWeight: 510, color: '#FFFFFF' }}>
              {rulebookImported ? 'Imported' : 'Import Rules'}
            </span>
          </button>
        )}

        <HeaderButton icon={packageOpenIcon} label="Add Review Rule" onClick={onAddRule} flip />
        <HeaderButton icon={directboxSendIcon} label="Add Question" onClick={onAddQuestion} />
        <button
          type="button"
          onClick={isRunning ? onCancel : onRun}
          disabled={!reviewId}
          aria-live="polite"
          aria-busy={isRunning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '32px',
            padding: '8px 14px',
            backgroundColor: '#FFFFFF',
            border: 'none',
            borderRadius: '5px',
            cursor: reviewId ? 'pointer' : 'not-allowed',
            fontFamily: complianceFontFamily,
            opacity: isRunning ? 0.7 : 1,
          }}
        >
          {isRunning ? (
            <span
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #454545',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : (
            <img src={playCircleIcon} alt="" style={{ width: '16px', height: '16px' }} />
          )}
          <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>
            {isRunning ? 'Cancel' : 'Run'}
          </span>
        </button>
      </div>
    </header>
  )
}

function HeaderButton({
  icon,
  label,
  onClick,
  flip = false,
}: {
  icon: string
  label: string
  onClick: () => void
  flip?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '32px',
        padding: '8px 14px',
        backgroundColor: '#FFFFFF',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontFamily: complianceFontFamily,
      }}
    >
      <img
        src={icon}
        alt=""
        style={{
          width: '16px',
          height: '16px',
          transform: flip ? 'rotate(180deg) scaleX(-1)' : undefined,
        }}
      />
      <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>{label}</span>
    </button>
  )
}
