import { Link } from 'react-router-dom'
import settingsIconLarge from '../../assets/settings-icon-large.svg'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { navigationFontFamily } from './navigationModel'

export function SettingsDialog({
  displayName,
  onClose,
  open,
  userEmail,
}: {
  displayName?: string
  onClose: () => void
  open: boolean
  userEmail?: string
}) {
  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      labelledBy="navigation-settings-title"
      overlayStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 2000,
      }}
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: '22px',
        padding: '28px 23px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '308px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <img src={settingsIconLarge} alt="" style={{ width: '22px', height: '22px' }} />
          <h2
            id="navigation-settings-title"
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 590,
              color: '#272727',
              letterSpacing: '-0.24px',
              lineHeight: '32px',
              fontFamily: navigationFontFamily,
            }}
          >
            Settings
          </h2>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 400,
            color: '#454545',
            letterSpacing: '-0.8px',
            lineHeight: '21px',
            fontFamily: navigationFontFamily,
          }}
        >
          View your signed-in account or manage AI provider connections.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '354px',
        }}
      >
        {[
          ['Name', displayName || 'Not provided'],
          ['Email', userEmail || 'Not provided'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 510,
                color: '#272727',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                fontFamily: navigationFontFamily,
              }}
            >
              {label}
            </span>
            <div
              style={{
                backgroundColor: '#F7F7F7',
                borderRadius: '12px',
                padding: '10px 15px',
                fontSize: '16px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                fontFamily: navigationFontFamily,
              }}
            >
              {value}
            </div>
          </div>
        ))}

        <Link
          to="/settings"
          onClick={onClose}
          style={{
            alignSelf: 'flex-start',
            color: '#272727',
            fontFamily: navigationFontFamily,
            fontSize: '14px',
            fontWeight: 510,
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Manage AI settings
        </Link>
      </div>
    </AccessibleDialog>
  )
}
