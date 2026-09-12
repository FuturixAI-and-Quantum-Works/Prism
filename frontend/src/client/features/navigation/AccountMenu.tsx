import { useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import avatarLogoutIcon from '../../assets/avatar-logout-icon.svg'
import avatarSettingsIcon from '../../assets/avatar-settings-icon.svg'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import { navigationFontFamily } from './navigationModel'

function getInitials(userName: string) {
  return userName
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function AccountMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        height: '40px',
        padding: '10px 12px',
        backgroundColor: hovered ? '#F7F7F7' : '#FFFFFF',
        border: 'none',
        cursor: 'pointer',
        fontFamily: navigationFontFamily,
        transition: 'background-color 0.1s ease',
      }}
    >
      <img src={icon} alt="" style={{ width: '18px', height: '18px' }} />
      <span
        style={{
          fontSize: '14px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.7px',
          lineHeight: '16px',
        }}
      >
        {label}
      </span>
    </button>
  )
}

export function AccountMenu({
  containerRef,
  onClose,
  onLogout,
  onOpenSettings,
  onToggle,
  open,
  userEmail,
  userName,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onLogout: () => void | Promise<unknown>
  onOpenSettings: () => void
  onToggle: () => void
  open: boolean
  userEmail?: string
  userName: string
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useMenuFocus<HTMLDivElement>({
    open,
    onClose,
    onOpen: onToggle,
    triggerRef,
  })

  const closeFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    onClose()
    triggerRef.current?.focus()
  }

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-controls={open ? 'account-menu' : undefined}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
        onKeyDown={closeFromKeyboard}
        style={{
          width: '25px',
          height: '25px',
          borderRadius: '50%',
          backgroundColor: '#284679',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: '9px',
          fontWeight: 510,
          cursor: 'pointer',
          letterSpacing: '-0.45px',
          border: 'none',
        }}
      >
        {getInitials(userName)}
      </button>

      {open && (
        <div
          ref={menuRef}
          id="account-menu"
          role="menu"
          aria-label="Account actions"
          style={{
            position: 'absolute',
            top: '28px',
            right: '0',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #F7F7F7',
            boxShadow: '0px 0px 11.5px rgba(0, 0, 0, 0.24)',
            zIndex: 1000,
            width: '206px',
            padding: '8px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            role="none"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#E0E0E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '36px',
                width: '107px',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: navigationFontFamily,
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#272727',
                  letterSpacing: '-0.8px',
                  lineHeight: '21px',
                }}
              >
                {userName}
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: navigationFontFamily,
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#999999',
                  letterSpacing: '-0.7px',
                  lineHeight: '16px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userEmail || 'Not provided'}
              </p>
            </div>
          </div>

          <div
            role="separator"
            style={{ height: '1px', backgroundColor: '#EDEDED', width: '100%' }}
          />

          <div role="group" style={{ display: 'flex', flexDirection: 'column' }}>
            <AccountMenuItem icon={avatarSettingsIcon} label="Settings" onClick={onOpenSettings} />
          </div>

          <div
            role="separator"
            style={{ height: '1px', backgroundColor: '#EDEDED', width: '100%' }}
          />

          <div role="group" style={{ display: 'flex', flexDirection: 'column' }}>
            <AccountMenuItem
              icon={avatarLogoutIcon}
              label="Log out"
              onClick={() => {
                onClose()
                void onLogout()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
