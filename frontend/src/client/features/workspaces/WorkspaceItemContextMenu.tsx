import { Button } from '../../components/ui/Button'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceDocumentsSession } from './useWorkspaceDocumentsSession'

interface WorkspaceItemContextMenuProps {
  session: WorkspaceDocumentsSession
}

export function WorkspaceItemContextMenu({ session }: WorkspaceItemContextMenuProps) {
  const menu = session.contextMenu
  if (!menu) return null
  const run = (action: () => void) => {
    action()
    session.actions.closeContextMenu()
  }
  return (
    <div
      ref={session.refs.contextMenuRef}
      role="menu"
      aria-label={`Actions for ${menu.item.name}`}
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        border: '1px solid #EDEDED',
        zIndex: 1002,
        minWidth: '160px',
        overflow: 'hidden',
      }}
    >
      <ContextAction
        kind="open"
        label="Open"
        divided
        onClick={() => run(() => session.actions.openItem(menu.item))}
      />
      {menu.item.type === 'document' && (
        <ContextAction
          kind="edit"
          label="Edit"
          divided
          onClick={() => run(() => session.actions.editItem(menu.item))}
        />
      )}
      <ContextAction
        kind="preview"
        label="Preview"
        onClick={() => run(() => session.actions.previewItem(menu.item))}
      />
      <ContextAction
        kind="delete"
        label="Delete"
        danger
        onClick={() => session.actions.requestDelete(menu.item)}
      />
    </div>
  )
}

function ContextAction({
  kind,
  label,
  onClick,
  danger = false,
  divided = false,
}: {
  kind: 'open' | 'edit' | 'preview' | 'delete'
  label: string
  onClick: () => void
  danger?: boolean
  divided?: boolean
}) {
  return (
    <Button
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 510,
        color: danger ? '#DC2626' : '#454545',
        border: 'none',
        borderBottom: divided ? '1px solid #F3F3F3' : 'none',
        fontFamily: workspaceFont,
        width: '100%',
        backgroundColor: 'transparent',
        textAlign: 'left',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = danger ? '#FEF2F2' : '#F7F7F7'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <ContextActionIcon kind={kind} />
      {label}
    </Button>
  )
}

function ContextActionIcon({ kind }: { kind: 'open' | 'edit' | 'preview' | 'delete' }) {
  if (kind === 'open') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 3h6v6"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 14L21 3"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'edit') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'preview') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="#454545" strokeWidth="2" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
        stroke="#DC2626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
