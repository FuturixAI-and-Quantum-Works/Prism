import { navigationFontFamily } from './navigationModel'
import { TopbarActions } from './TopbarActions'
import { TopbarBreadcrumbs } from './TopbarBreadcrumbs'
import type { NavigationTopbarProps } from './navigationTypes'

export function NavigationTopbar({
  accountDisplayName,
  activePage,
  breadcrumbs,
  isMobile = false,
  onLogout,
  onToggleSidebar,
  sidebarCollapsed,
  userEmail,
  userName,
}: NavigationTopbarProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '12px 16px' : '10px 20px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EDEDED',
        height: '42px',
        boxSizing: 'border-box',
        fontFamily: navigationFontFamily,
      }}
    >
      <TopbarBreadcrumbs
        activePage={activePage}
        breadcrumbs={breadcrumbs}
        isMobile={isMobile}
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />
      <TopbarActions
        displayName={accountDisplayName}
        isMobile={isMobile}
        onLogout={onLogout}
        userEmail={userEmail}
        userName={userName}
      />
    </header>
  )
}
