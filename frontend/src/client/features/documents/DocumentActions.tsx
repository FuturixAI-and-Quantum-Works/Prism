import { Button } from '../../components/ui/Button'
import { documentActionOptions } from './documentActionOptions'
import { documentFontFamily } from './documentLibraryModel'
import type { DocumentsScreenSession } from './useDocumentsScreen'

export function DocumentContextMenu({ session }: { session: DocumentsScreenSession }) {
  const { contextMenu, refs, actions } = session
  if (!contextMenu) return null

  return (
    <div
      ref={refs.contextMenuRef}
      data-context-menu
      role="menu"
      aria-label={`Actions for ${contextMenu.doc.title}`}
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        backgroundColor: '#FFFFFF',
        border: '1px solid #F7F7F7',
        borderRadius: '8px',
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
        zIndex: 1000,
        minWidth: '160px',
        overflow: 'hidden',
        fontFamily: documentFontFamily,
      }}
    >
      {documentActionOptions.map((option) => (
        <Button
          key={option.id}
          role="menuitem"
          onClick={() => {
            actions.runDocumentAction(option.id, contextMenu.doc)
            actions.setContextMenu(null)
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
            color: option.danger ? '#E53935' : '#454545',
            fontFamily: documentFontFamily,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = option.danger ? '#FEF2F2' : '#F5F5F5'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <img src={option.icon} alt="" style={{ width: '16px', height: '16px' }} />
          {option.label}
        </Button>
      ))}
    </div>
  )
}
