import arrowRightOutlineIcon from '../../assets/compliance/arrow-right-outline-icon.svg'
import blankWorkspaceIcon from '../../assets/compliance/blank-workspace-icon.svg'
import rulebookPresetIcon from '../../assets/compliance/rulebook-preset-icon.svg'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { complianceFontFamily } from './compliancePresentation'

interface ReviewSetupChoiceDialogProps {
  open: boolean
  onClose: () => void
  onSelectPreset: () => void
  onSelectBlank: () => void
}

export function ReviewSetupChoiceDialog({
  open,
  onClose,
  onSelectPreset,
  onSelectBlank,
}: ReviewSetupChoiceDialogProps) {
  if (!open) return null

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      labelledBy="review-setup-title"
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '24px' }}
      contentStyle={{
        width: '480px',
        maxWidth: 'calc(100vw - 48px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: complianceFontFamily,
      }}
    >
      <div style={{ padding: '24px 24px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2
          id="review-setup-title"
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 590,
            color: '#171717',
            letterSpacing: '-0.5px',
            lineHeight: '24px',
          }}
        >
          Choose your review setup
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#797979',
            letterSpacing: '-0.3px',
            lineHeight: '20px',
          }}
        >
          Start with a prebuilt compliance rulebook or create a custom review workspace from
          scratch.
        </p>
      </div>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ChoiceButton
          title="Rulebook Presets"
          description="Pre-configured review logic, policy checks, AI questions, and compliance conditions for common legal workflows."
          icon={rulebookPresetIcon}
          accentColor="#9124FF"
          hoverColor="#FDFAFF"
          onClick={onSelectPreset}
        />
        <ChoiceButton
          title="Start Without Preset"
          description="Create a blank compliance workspace and manually add review rules, AI questions, conditions, and policy sources later."
          icon={blankWorkspaceIcon}
          accentColor="#247BFF"
          hoverColor="#F5F9FF"
          onClick={onSelectBlank}
        />
      </div>
    </AccessibleDialog>
  )
}

function ChoiceButton({
  title,
  description,
  icon,
  accentColor,
  hoverColor,
  onClick,
}: {
  title: string
  description: string
  icon: string
  accentColor: string
  hoverColor: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px',
        border: '1px solid #EDEDED',
        borderRadius: '12px',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        fontFamily: complianceFontFamily,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = accentColor
        event.currentTarget.style.backgroundColor = hoverColor
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = '#EDEDED'
        event.currentTarget.style.backgroundColor = '#FFFFFF'
      }}
    >
      <span
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <img src={icon} alt="" style={{ width: '24px', height: '24px' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 590,
              color: '#171717',
              letterSpacing: '-0.3px',
            }}
          >
            {title}
          </span>
          <img src={arrowRightOutlineIcon} alt="" style={{ width: '20px', height: '20px' }} />
        </span>
        <span
          style={{
            display: 'block',
            marginTop: '6px',
            fontSize: '13px',
            color: '#797979',
            letterSpacing: '-0.2px',
            lineHeight: '18px',
          }}
        >
          {description}
        </span>
      </span>
    </button>
  )
}
