import { NavigationTopbar } from '../features/navigation/NavigationTopbar'
import type { BreadcrumbItem } from '../features/navigation/navigationTypes'
import { useAuth } from '../hooks/useAuth'

export type { BreadcrumbItem }

interface TopbarProps {
  userName: string
  sidebarCollapsed: boolean
  activePage: string
  onToggleSidebar: () => void
  isMobile?: boolean
  breadcrumbs?: BreadcrumbItem[]
}

export default function Topbar({ userName: fallbackUserName, ...props }: TopbarProps) {
  const { user, logout } = useAuth()
  const userName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    fallbackUserName

  return (
    <NavigationTopbar
      {...props}
      accountDisplayName={user?.displayName}
      onLogout={logout}
      userEmail={user?.email}
      userName={userName}
    />
  )
}
