import { appRoutes } from '../../appRoutes'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import type { WorkspaceListSession } from './useWorkspaceListSession'
import { workspaceFont } from './workspaceModels'

export function WorkspaceListDialogs({ session }: { session: WorkspaceListSession }) {
  const {
    confirmDelete,
    deleteError,
    deleteModalOpen,
    isSharing,
    renameModalOpen,
    renameError,
    renameValue,
    selectedWorkspace,
    setDeleteModalOpen,
    setRenameModalOpen,
    setRenameValue,
    setShareEmail,
    setShareModalOpen,
    shareEmail,
    shareError,
    shareModalOpen,
    submitRename,
    submitShare,
  } = session

  if (!selectedWorkspace) return null

  return (
    <>
      <AccessibleDialog
        open={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        labelledBy="rename-workspace-title"
        contentStyle={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '400px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h3
          id="rename-workspace-title"
          style={{
            margin: '0 0 16px',
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            fontFamily: workspaceFont,
          }}
        >
          Rename Workspace
        </h3>
        <input
          aria-label="Workspace name"
          type="text"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
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
            fontFamily: workspaceFont,
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submitRename()
            if (event.key === 'Escape') setRenameModalOpen(false)
          }}
        />
        {renameError && (
          <p
            role="alert"
            style={{
              margin: '12px 0 0',
              fontSize: '13px',
              color: '#E53935',
              lineHeight: '18px',
              fontFamily: workspaceFont,
            }}
          >
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
            onClick={() => setRenameModalOpen(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F7F7F7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              cursor: 'pointer',
              fontFamily: workspaceFont,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={submitRename}
            style={{
              padding: '10px 20px',
              backgroundColor: '#272727',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontFamily: workspaceFont,
            }}
          >
            Rename
          </Button>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        labelledBy="delete-workspace-title"
        contentStyle={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '400px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h3
          id="delete-workspace-title"
          style={{
            margin: '0 0 8px',
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            fontFamily: workspaceFont,
          }}
        >
          Delete Workspace
        </h3>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '14px',
            color: '#666666',
            lineHeight: '1.5',
            fontFamily: workspaceFont,
          }}
        >
          Are you sure you want to delete "{selectedWorkspace.name}"? This action cannot be undone.
        </p>
        {deleteError && (
          <p
            role="alert"
            style={{
              margin: '0 0 16px',
              fontSize: '13px',
              color: '#E53935',
              lineHeight: '18px',
              fontFamily: workspaceFont,
            }}
          >
            {deleteError}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button
            onClick={() => setDeleteModalOpen(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F7F7F7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              cursor: 'pointer',
              fontFamily: workspaceFont,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            style={{
              padding: '10px 20px',
              backgroundColor: '#E53935',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontFamily: workspaceFont,
            }}
          >
            Delete
          </Button>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        labelledBy="share-workspace-title"
        contentStyle={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '450px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h3
          id="share-workspace-title"
          style={{
            margin: '0 0 16px',
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            fontFamily: workspaceFont,
          }}
        >
          Share "{selectedWorkspace.name}"
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="workspace-share-email"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              fontFamily: workspaceFont,
            }}
          >
            Invite by email
          </label>
          <input
            id="workspace-share-email"
            type="email"
            value={shareEmail}
            onChange={(event) => setShareEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void submitShare()
              }
            }}
            placeholder="Enter email address"
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
              fontFamily: workspaceFont,
            }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="workspace-share-link"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              fontFamily: workspaceFont,
            }}
          >
            Or copy link
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="workspace-share-link"
              type="text"
              value={`${window.location.origin}${appRoutes.workspace(selectedWorkspace.id)}`}
              readOnly
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 400,
                color: '#999999',
                backgroundColor: '#F7F7F7',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: workspaceFont,
              }}
            />
            <Button
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}${appRoutes.workspace(selectedWorkspace.id)}`,
                )
              }
              style={{
                padding: '12px 16px',
                backgroundColor: '#F7F7F7',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                cursor: 'pointer',
                fontFamily: workspaceFont,
                whiteSpace: 'nowrap',
              }}
            >
              Copy
            </Button>
          </div>
        </div>
        {shareError && (
          <p
            role="alert"
            style={{
              margin: '0 0 16px',
              fontSize: '13px',
              color: '#E53935',
              lineHeight: '18px',
              fontFamily: workspaceFont,
            }}
          >
            {shareError}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button
            onClick={() => setShareModalOpen(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F7F7F7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              cursor: 'pointer',
              fontFamily: workspaceFont,
            }}
          >
            Close
          </Button>
          <Button
            onClick={submitShare}
            disabled={isSharing || !shareEmail.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: isSharing || !shareEmail.trim() ? '#CCCCCC' : '#272727',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              cursor: isSharing || !shareEmail.trim() ? 'not-allowed' : 'pointer',
              fontFamily: workspaceFont,
            }}
          >
            {isSharing ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </AccessibleDialog>
    </>
  )
}
