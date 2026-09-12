import { AccountMenu } from './AccountMenu'
import { NotificationCenter } from './NotificationCenter'
import { SettingsDialog } from './SettingsDialog'
import { useTopbarState } from './useTopbarState'

export function TopbarActions({
  displayName,
  isMobile,
  onLogout,
  userEmail,
  userName,
}: {
  displayName?: string
  isMobile: boolean
  onLogout: () => void | Promise<unknown>
  userEmail?: string
  userName: string
}) {
  const state = useTopbarState()

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
        <NotificationCenter
          containerRef={state.notificationsContainerRef}
          onClose={state.closePopover}
          onToggle={() => state.togglePopover('notifications')}
          open={state.activePopover === 'notifications'}
        />
        <AccountMenu
          containerRef={state.accountContainerRef}
          onClose={state.closePopover}
          onLogout={onLogout}
          onOpenSettings={state.openSettings}
          onToggle={() => state.togglePopover('account')}
          open={state.activePopover === 'account'}
          userEmail={userEmail}
          userName={userName}
        />
      </div>
      {state.settingsOpen && (
        <SettingsDialog
          displayName={displayName}
          onClose={state.closeSettings}
          open
          userEmail={userEmail}
        />
      )}
    </>
  )
}
