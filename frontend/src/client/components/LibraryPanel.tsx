import { useState } from 'react'
import templatesIcon from '../assets/library/templates-icon.svg'
import { Button } from './ui/Button'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface LibraryItem {
  id: string
  label: string
  icon: string
  disabled: boolean
}

interface LibraryPanelProps {
  open: boolean
  sidebarCollapsed: boolean
  onClose: () => void
  onItemSelect?: (itemId: string) => void
}

const libraryItems: LibraryItem[] = [
  { id: 'templates', label: 'Templates', icon: templatesIcon, disabled: false },
]

export default function LibraryPanel({
  open,
  sidebarCollapsed,
  onClose,
  onItemSelect,
}: LibraryPanelProps) {
  const [activeItemId, setActiveItemId] = useState<string>('')
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const sidebarWidth = sidebarCollapsed ? 72 : 220

  const handleItemClick = (itemId: string) => {
    setActiveItemId(itemId)
    onItemSelect?.(itemId)
    onClose()
  }

  return (
    <>
      <nav
        aria-label="Library"
        aria-hidden={!open}
        inert={!open}
        style={{
          position: 'absolute',
          left: `${sidebarWidth}px`,
          top: '42px',
          bottom: 0,
          width: open ? '224px' : '0px',
          backgroundColor: '#FFFFFF',
          borderRight: open ? '0.5px solid #EDEDED' : 'none',
          boxShadow: open ? '12px 12px 24px rgba(0, 0, 0, 0.12)' : 'none',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          fontFamily,
          overflow: 'hidden',
          transition: 'width 0.25s ease-out, box-shadow 0.25s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '7px 12px',
            borderBottom: '0.5px solid #EDEDED',
            height: '30px',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{ fontSize: '12px', fontWeight: 510, color: '#999999', letterSpacing: '-0.6px' }}
          >
            Library
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {libraryItems.map((item) => {
            const isActive = activeItemId === item.id
            const isHovered = hoveredItemId === item.id
            return (
              <Button
                key={item.id}
                disabled={item.disabled}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleItemClick(item.id)}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  height: '40px',
                  padding: '0 12px',
                  backgroundColor: isActive ? '#EDEDED' : isHovered ? '#F5F5F5' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily,
                }}
              >
                <img
                  src={item.icon}
                  alt=""
                  style={{ width: '20px', height: '20px', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.8px',
                    lineHeight: '21px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.label}
                </span>
              </Button>
            )
          })}
        </div>
      </nav>

      {open && (
        <Button
          aria-label="Close library panel"
          onClick={onClose}
          style={{
            position: 'absolute',
            left: `${sidebarWidth + 224}px`,
            top: '56px',
            right: 0,
            bottom: 0,
            zIndex: 50,
            cursor: 'default',
            padding: 0,
            border: 'none',
            background: 'transparent',
          }}
        />
      )}
    </>
  )
}
