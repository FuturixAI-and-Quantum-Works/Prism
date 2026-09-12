import { useLocation, useNavigate } from 'react-router-dom'
import { SidebarNavigation } from '../features/navigation/SidebarNavigation'

interface SidebarProps {
  collapsed: boolean
  activePage: string
  onLibraryClick: () => void
}

export default function Sidebar({ collapsed, activePage, onLibraryClick }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <SidebarNavigation
      activePage={activePage}
      collapsed={collapsed}
      onLibraryClick={onLibraryClick}
      onNavigate={navigate}
      pathname={pathname}
    />
  )
}
