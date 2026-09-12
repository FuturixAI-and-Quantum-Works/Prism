import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceDocumentsSession } from './useWorkspaceDocumentsSession'

interface WorkspaceDocumentDialogsProps {
  session: WorkspaceDocumentsSession
}

export function WorkspaceDocumentDialogs({ session }: WorkspaceDocumentDialogsProps) {
  return (
    <>
      {session.deleteOpen && (session.deleteTarget || session.selectedIds.size > 0) && (
        <DeleteDocumentsDialog session={session} />
      )}
      {session.uploadCandidate && <UploadDocumentDialog session={session} />}
    </>
  )
}

function DeleteDocumentsDialog({ session }: WorkspaceDocumentDialogsProps) {
  const fallback = session.allItems.find((item) => session.selectedIds.has(item.id))?.name
  return (
    <AccessibleDialog
      open
      onClose={session.actions.closeDelete}
      labelledBy="remove-documents-title"
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1001 }}
      contentStyle={{ ...dialogStyle, width: '400px' }}
    >
      <h3 id="remove-documents-title" style={titleStyle}>
        Remove from Workspace
      </h3>
      <p style={copyStyle}>
        {session.deleteCount > 1
          ? `Are you sure you want to remove ${session.deleteCount} items from this workspace? This action cannot be undone.`
          : `Are you sure you want to remove "${session.deleteTarget?.name || fallback || 'this item'}" from this workspace? This action cannot be undone.`}
      </p>
      {session.deleteError && <DialogError>{session.deleteError}</DialogError>}
      <DialogButtons
        onCancel={session.actions.closeDelete}
        onConfirm={session.actions.confirmDelete}
        confirmLabel={`Remove${session.deleteCount > 1 ? ` (${session.deleteCount})` : ''}`}
        danger
        disabled={session.isDeleting}
      />
    </AccessibleDialog>
  )
}

function UploadDocumentDialog({ session }: WorkspaceDocumentDialogsProps) {
  const file = session.uploadCandidate
  if (!file) return null
  return (
    <AccessibleDialog
      open
      onClose={session.actions.closeUpload}
      labelledBy="upload-document-title"
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1001 }}
      contentStyle={{ ...dialogStyle, width: '420px' }}
    >
      <h3 id="upload-document-title" style={{ ...titleStyle, marginBottom: '20px' }}>
        Upload Document
      </h3>
      <div
        style={{
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#F7F7F7',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6Z"
              stroke="#454545"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 2V8H20"
              stroke="#454545"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#272727',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.name}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 400, color: '#797979' }}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: '24px' }}>
        <Button
          role="checkbox"
          aria-checked={session.uploadIsPrimary}
          onClick={() => session.actions.setUploadIsPrimary(!session.uploadIsPrimary)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            userSelect: 'none',
            border: 'none',
            backgroundColor: 'transparent',
            padding: 0,
            fontFamily: workspaceFont,
          }}
        >
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: session.uploadIsPrimary ? 'none' : '2px solid #CCCCCC',
              backgroundColor: session.uploadIsPrimary ? '#F36A33' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {session.uploadIsPrimary && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6L5 9L10 3"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>
            Mark as Primary Document
          </span>
        </Button>
        <p
          style={{
            margin: '8px 0 0 32px',
            fontSize: '12px',
            fontWeight: 400,
            color: '#797979',
            lineHeight: '16px',
          }}
        >
          Primary documents are the main focus of your project. Supporting documents provide
          context.
        </p>
      </div>
      {session.uploadError && <DialogError>{session.uploadError}</DialogError>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button
          onClick={session.actions.closeUpload}
          style={{ ...buttonStyle, backgroundColor: '#F7F7F7', color: '#454545' }}
        >
          Cancel
        </Button>
        <Button
          onClick={session.actions.confirmUpload}
          disabled={session.isUploading}
          style={{
            ...buttonStyle,
            backgroundColor: session.isUploading ? '#CCCCCC' : '#272727',
            color: '#FFFFFF',
            cursor: session.isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {session.isUploading && <LoadingSpinner />}
          {session.isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
    </AccessibleDialog>
  )
}

function DialogError({ children }: { children: string }) {
  return (
    <p
      role="alert"
      style={{
        margin: '0 0 16px',
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: '#FEF2F2',
        color: '#B42318',
        fontSize: '13px',
        lineHeight: '18px',
      }}
    >
      {children}
    </p>
  )
}

function DialogButtons({
  onCancel,
  onConfirm,
  confirmLabel,
  danger = false,
  disabled = false,
}: {
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  confirmLabel: string
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
      <Button
        onClick={onCancel}
        style={{ ...buttonStyle, backgroundColor: '#F7F7F7', color: '#454545' }}
      >
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        disabled={disabled}
        style={{
          ...buttonStyle,
          backgroundColor: disabled ? '#CCCCCC' : danger ? '#DC2626' : '#272727',
          color: '#FFFFFF',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  )
}

const dialogStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: 'calc(100vw - 48px)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
  fontFamily: workspaceFont,
}

const titleStyle = {
  margin: '0 0 8px',
  fontSize: '18px',
  fontWeight: 510,
  color: '#272727',
}

const copyStyle = {
  margin: '0 0 20px',
  fontSize: '14px',
  color: '#666666',
  lineHeight: '1.5',
}

const buttonStyle = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 510,
  cursor: 'pointer',
  fontFamily: workspaceFont,
}

function LoadingSpinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>
        {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
