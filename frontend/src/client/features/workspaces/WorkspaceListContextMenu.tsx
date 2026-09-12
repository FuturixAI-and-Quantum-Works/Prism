import pencilEditIcon from '../../assets/pencil-edit-icon.svg'
import projectOpenIcon from '../../assets/project-open-icon.svg'
import shareIcon from '../../assets/share-icon.svg'
import trashIcon from '../../assets/trash-icon.svg'
import { Button } from '../../components/ui/Button'
import type { WorkspaceListSession } from './useWorkspaceListSession'
import { workspaceFont } from './workspaceModels'

const menuItems = [
  { id: 'open' as const, label: 'Open', icon: projectOpenIcon },
  { id: 'rename' as const, label: 'Rename', icon: pencilEditIcon },
  { id: 'share' as const, label: 'Share', icon: shareIcon },
  { id: 'delete' as const, label: 'Delete', icon: trashIcon, danger: true },
]

export function WorkspaceListContextMenu({ session }: { session: WorkspaceListSession }) {
  const { contextMenu, contextMenuRef, handleWorkspaceAction, setContextMenu } = session
  if (!contextMenu) return null

  return (
    <div
      ref={contextMenuRef}
      data-context-menu
      role="menu"
      aria-label={`Actions for ${contextMenu.workspace.name}`}
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
        fontFamily: workspaceFont,
      }}
    >
      {menuItems.map((item) => (
        <Button
          key={item.id}
          role="menuitem"
          onClick={() => {
            handleWorkspaceAction(item.id, contextMenu.workspace)
            setContextMenu(null)
          }}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '14px',
            fontWeight: 510,
            color: item.danger ? '#E53935' : '#454545',
            fontFamily: workspaceFont,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = item.danger ? '#FEF2F2' : '#F5F5F5'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <img
            src={item.icon}
            alt=""
            style={{
              width: '16px',
              height: '16px',
              transform: item.id === 'open' ? 'rotate(180deg)' : undefined,
            }}
          />
          {item.label}
        </Button>
      ))}
    </div>
  )
}
