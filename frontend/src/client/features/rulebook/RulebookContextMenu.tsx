import type { ReactNode } from 'react'
import { rulebookFontFamily } from './rulebookModel'
import type { RulebookListSession } from './useRulebookListSession'

export function RulebookContextMenu({ session }: { session: RulebookListSession }) {
  const { contextMenu, refs, actions } = session
  if (!contextMenu) return null

  return (
    <div
      id="rulebook-context-menu"
      ref={refs.contextMenuRef}
      data-context-menu
      role="menu"
      aria-label={`Actions for ${contextMenu.workflow.title}`}
      onKeyDown={actions.handleContextMenuKeyDown}
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        backgroundColor: '#FFFFFF',
        border: '1px solid #EDEDED',
        borderRadius: '8px',
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
        zIndex: 1000,
        minWidth: '160px',
        overflow: 'hidden',
        fontFamily: rulebookFontFamily,
      }}
    >
      <MenuButton
        label="Create review"
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="#454545" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        }
        onClick={() => {
          actions.focusContextTrigger()
          actions.setReviewWorkflow(contextMenu.workflow)
          actions.setContextMenu(null)
        }}
      />
      <MenuButton
        label={contextMenu.workflow.allow_edit ? 'Edit' : 'Open'}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z"
              stroke="#454545"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        onClick={() => {
          actions.focusContextTrigger()
          actions.setRulebookModal({ mode: 'edit', workflow: contextMenu.workflow })
          actions.setContextMenu(null)
        }}
      />
      {contextMenu.workflow.allow_edit && (
        <MenuButton
          label="Delete"
          danger
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z"
                stroke="#E53935"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          onClick={() => {
            void actions.removeWorkflow(contextMenu.workflow)
            actions.setContextMenu(null)
            requestAnimationFrame(actions.focusContextTrigger)
          }}
        />
      )}
    </div>
  )
}

function MenuButton({
  label,
  icon,
  danger = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 14px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '14px',
        fontWeight: 510,
        color: danger ? '#E53935' : '#454545',
        fontFamily: rulebookFontFamily,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = danger ? '#FEF2F2' : '#F5F5F5'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {icon}
      {label}
    </button>
  )
}
