import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { documentFontFamily } from './documentLibraryModel'
import type { DocumentsScreenSession } from './useDocumentsScreen'

export function DocumentDialogs({ session }: { session: DocumentsScreenSession }) {
  const {
    selectedDocument,
    renameModalOpen,
    deleteModalOpen,
    renameValue,
    renameError,
    deleteError,
    isRenaming,
    isDeleting,
    actions,
  } = session
  if (!selectedDocument) return null

  return (
    <>
      <AccessibleDialog
        open={renameModalOpen}
        onClose={() => actions.setRenameModalOpen(false)}
        labelledBy="rename-document-title"
        contentStyle={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '400px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h3
          id="rename-document-title"
          style={{
            margin: '0 0 16px',
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            fontFamily: documentFontFamily,
          }}
        >
          Rename Document
        </h3>
        <input
          aria-label="Document name"
          type="text"
          value={renameValue}
          onChange={(event) => actions.setRenameValue(event.target.value)}
          placeholder="Enter new name"
          autoFocus
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #EDEDED',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 400,
            color: '#454545',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: documentFontFamily,
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void actions.submitRename()
            if (event.key === 'Escape') actions.setRenameModalOpen(false)
          }}
        />
        {renameError && (
          <p role="alert" style={errorStyle}>
            {renameError}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <Button
            onClick={() => actions.setRenameModalOpen(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F7F7F7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              cursor: 'pointer',
              fontFamily: documentFontFamily,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void actions.submitRename()}
            disabled={isRenaming}
            aria-busy={isRenaming}
            style={{
              padding: '10px 20px',
              backgroundColor: '#272727',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              cursor: isRenaming ? 'not-allowed' : 'pointer',
              opacity: isRenaming ? 0.7 : 1,
              fontFamily: documentFontFamily,
            }}
          >
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={deleteModalOpen}
        onClose={() => actions.setDeleteModalOpen(false)}
        labelledBy="delete-document-title"
        contentStyle={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '400px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h3
          id="delete-document-title"
          style={{
            margin: '0 0 8px',
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            fontFamily: documentFontFamily,
          }}
        >
          Delete Document
        </h3>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '14px',
            color: '#666666',
            lineHeight: '1.5',
            fontFamily: documentFontFamily,
          }}
        >
          Are you sure you want to delete "{selectedDocument.title}"? This action cannot be undone.
        </p>
        {deleteError && (
          <p role="alert" style={errorStyle}>
            {deleteError}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button
            onClick={() => actions.setDeleteModalOpen(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F7F7F7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              cursor: 'pointer',
              fontFamily: documentFontFamily,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void actions.confirmDelete()}
            disabled={isDeleting}
            aria-busy={isDeleting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#E53935',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.7 : 1,
              fontFamily: documentFontFamily,
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </AccessibleDialog>
    </>
  )
}

const errorStyle = {
  margin: '12px 0 0',
  padding: '10px 12px',
  borderRadius: '8px',
  backgroundColor: '#FEF2F2',
  color: '#B42318',
  fontSize: '13px',
  lineHeight: '18px',
}
