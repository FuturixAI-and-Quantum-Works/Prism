import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRightIcon,
  HomeIcon,
  LibraryIcon,
  MenuIcon,
  ProjectsIcon,
  ReviewIcon,
  RulebookIcon,
  SettingsIcon,
  SharedIcon,
  SourcesIcon,
} from '../../components/icons'
import { getDefaultBreadcrumb } from './navigationModel'
import type { BreadcrumbItem } from './navigationTypes'

const pageIcons: Readonly<Record<string, ReactNode>> = {
  home: <HomeIcon />,
  library: <LibraryIcon />,
  shared: <SharedIcon />,
  review: <ReviewIcon />,
  sources: <SourcesIcon />,
  rulebook: <RulebookIcon />,
  settings: <SettingsIcon />,
  projects: <ProjectsIcon />,
}

export function TopbarBreadcrumbs({
  activePage,
  breadcrumbs,
  isMobile,
  onToggleSidebar,
  sidebarCollapsed,
}: {
  activePage: string
  breadcrumbs?: BreadcrumbItem[]
  isMobile: boolean
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
}) {
  const fallbackBreadcrumb = getDefaultBreadcrumb(activePage)
  const items = breadcrumbs ?? [
    {
      ...fallbackBreadcrumb,
      icon: pageIcons[activePage] || <HomeIcon />,
    },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '15px' }}>
      <button
        type="button"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggleSidebar}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#454545',
          padding: 0,
        }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <MenuIcon />
      </button>

      {!isMobile && (
        <div
          style={{
            width: '2px',
            height: '15px',
            backgroundColor: '#EDEDED',
            transform: 'rotate(180deg)',
            marginLeft: '4px',
            marginRight: '4px',
          }}
        />
      )}

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {index > 0 && <ChevronRightIcon size={20} color="#999999" />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {item.icon && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#454545',
                    width: '16px',
                    height: '16px',
                  }}
                >
                  {item.icon}
                </span>
              )}
              {item.path ? (
                <Link
                  to={item.path}
                  style={{
                    fontSize: '15px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.7px',
                    lineHeight: '16px',
                    textDecoration: 'none',
                    marginLeft: 10,
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.7px',
                    lineHeight: '16px',
                    marginLeft: 10,
                  }}
                >
                  {item.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}
