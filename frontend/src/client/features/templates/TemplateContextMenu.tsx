import templatePreviewIcon from '../../assets/template-preview-icon.svg'
import { Button } from '../../components/ui/Button'
import { templateFontFamily } from './templateLibraryModel'
import type { TemplateLibrarySession } from './useTemplateLibrary'

export function TemplateContextMenu({ session }: { session: TemplateLibrarySession }) {
  const { contextMenu, refs, actions } = session
  if (!contextMenu) return null

  const close = () => actions.setContextMenu(null)

  return (
    <div
      ref={refs.contextMenuRef}
      data-context-menu
      role="menu"
      aria-label={`Actions for ${contextMenu.template.title}`}
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        backgroundColor: '#FFFFFF',
        border: '1px solid #EDEDED',
        borderRadius: '8px',
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
        zIndex: 1000,
        minWidth: '150px',
        overflow: 'hidden',
        fontFamily: templateFontFamily,
      }}
    >
      <ContextMenuButton
        icon={templatePreviewIcon}
        label="Preview"
        onClick={() => {
          actions.previewRoute(contextMenu.template.apiTemplate)
          close()
        }}
      />
    </div>
  )
}

function ContextMenuButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <Button
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
        color: '#454545',
        fontFamily: templateFontFamily,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = '#F5F5F5'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <img src={icon} alt="" style={{ width: '16px', height: '16px' }} />
      {label}
    </Button>
  )
}
