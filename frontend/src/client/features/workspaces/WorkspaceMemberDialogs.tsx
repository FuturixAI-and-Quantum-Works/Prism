import { appRoutes } from '../../appRoutes'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceMembersSession } from './useWorkspaceMembersSession'
import type { WorkspaceMemberRole } from './workspaceModels'

interface WorkspaceMemberDialogsProps {
  session: WorkspaceMembersSession
  workspaceId: string
  workspaceName?: string
}

export function WorkspaceMemberDialogs({
  session,
  workspaceId,
  workspaceName,
}: WorkspaceMemberDialogsProps) {
  return (
    <>
      {session.memberToRemove && <RemoveMemberDialog session={session} />}
      {session.shareOpen && (
        <ShareWorkspaceDialog
          session={session}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
        />
      )}
    </>
  )
}

function RemoveMemberDialog({ session }: { session: WorkspaceMembersSession }) {
  const member = session.memberToRemove
  if (!member) return null
  return (
    <AccessibleDialog
      open
      onClose={session.actions.cancelRemove}
      labelledBy="remove-member-title"
      overlayStyle={overlayStyle}
      contentStyle={{ ...dialogStyle, width: '400px' }}
    >
      <h3 id="remove-member-title" style={titleStyle}>
        Remove Collaborator
      </h3>
      <p style={copyStyle}>
        Are you sure you want to remove <strong>{member.name}</strong> from this project? They will
        no longer have access to this workspace.
      </p>
      {session.removeError && (
        <p
          role="alert"
          style={{ margin: '0 0 16px', fontSize: '13px', color: '#E53935', lineHeight: '18px' }}
        >
          {session.removeError}
        </p>
      )}
      <div style={footerStyle}>
        <DialogButton label="Cancel" onClick={session.actions.cancelRemove} />
        <DialogButton label="Remove" onClick={session.actions.confirmRemove} danger />
      </div>
    </AccessibleDialog>
  )
}

function ShareWorkspaceDialog({
  session,
  workspaceId,
  workspaceName,
}: WorkspaceMemberDialogsProps) {
  const link = `${window.location.origin}${appRoutes.workspace(workspaceId)}`
  return (
    <AccessibleDialog
      open
      onClose={session.actions.closeShare}
      labelledBy="share-workspace-title"
      overlayStyle={overlayStyle}
      contentStyle={{ ...dialogStyle, width: '450px' }}
    >
      <h3 id="share-workspace-title" style={{ ...titleStyle, marginBottom: '16px' }}>
        Share "{workspaceName || 'Project'}"
      </h3>
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="share-workspace-email" style={labelStyle}>
          Invite by email
        </label>
        <input
          id="share-workspace-email"
          type="email"
          value={session.shareEmail}
          onChange={(event) => session.actions.setShareEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void session.actions.submitShare()
          }}
          placeholder="Enter email address"
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <span id="share-workspace-role-label" style={labelStyle}>
          Role
        </span>
        <div style={{ position: 'relative' }}>
          <Button
            ref={session.refs.shareRoleButtonRef}
            aria-labelledby="share-workspace-role-label"
            aria-haspopup="menu"
            aria-expanded={session.shareRoleOpen}
            aria-controls={session.shareRoleOpen ? 'share-workspace-role-menu' : undefined}
            onClick={session.actions.toggleShareRole}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              backgroundColor: '#FFFFFF',
              fontWeight: 510,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{session.shareRole}</span>
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                transform: session.shareRoleOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="#454545"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          {session.shareRoleOpen && (
            <div
              ref={session.refs.shareRoleMenuRef}
              id="share-workspace-role-menu"
              role="menu"
              aria-labelledby="share-workspace-role-label"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                zIndex: 10,
                overflow: 'hidden',
              }}
            >
              {(['Editor', 'Viewer', 'Admin'] satisfies WorkspaceMemberRole[]).map(
                (role, index) => (
                  <Button
                    key={role}
                    role="menuitemradio"
                    aria-checked={session.shareRole === role}
                    onClick={() => session.actions.setShareRole(role)}
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      cursor: 'pointer',
                      backgroundColor: session.shareRole === role ? '#F7F7F7' : 'transparent',
                      border: 'none',
                      borderBottom: index < 2 ? '1px solid #EDEDED' : 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      fontFamily: workspaceFont,
                      width: '100%',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(event) => {
                      if (session.shareRole !== role) {
                        event.currentTarget.style.backgroundColor = '#F7F7F7'
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (session.shareRole !== role) {
                        event.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    {role}
                  </Button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="share-workspace-link" style={labelStyle}>
          Or copy link
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="share-workspace-link"
            type="text"
            value={link}
            readOnly
            style={{ ...inputStyle, flex: 1, color: '#999999', backgroundColor: '#F7F7F7' }}
          />
          <Button
            onClick={() => void navigator.clipboard.writeText(link)}
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
      {session.shareError && (
        <p
          role="alert"
          style={{ margin: '0 0 16px', fontSize: '13px', color: '#E53935', lineHeight: '18px' }}
        >
          {session.shareError}
        </p>
      )}
      <div style={footerStyle}>
        <DialogButton label="Close" onClick={session.actions.closeShare} />
        <Button
          onClick={session.actions.submitShare}
          disabled={session.isSharing || !session.shareEmail.trim()}
          style={{
            ...buttonStyle,
            backgroundColor:
              session.isSharing || !session.shareEmail.trim() ? '#CCCCCC' : '#272727',
            color: '#FFFFFF',
            cursor: session.isSharing || !session.shareEmail.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {session.isSharing && <LoadingSpinner />}
          {session.isSharing ? 'Sending...' : 'Send Invite'}
        </Button>
      </div>
    </AccessibleDialog>
  )
}

function DialogButton({
  label,
  onClick,
  danger = false,
}: {
  label: string
  onClick: () => void | Promise<void>
  danger?: boolean
}) {
  return (
    <Button
      onClick={onClick}
      style={{
        ...buttonStyle,
        backgroundColor: danger ? '#DC2626' : '#F7F7F7',
        color: danger ? '#FFFFFF' : '#454545',
      }}
    >
      {label}
    </Button>
  )
}

const overlayStyle = { backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1001 }
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
const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: 510,
  color: '#454545',
}
const inputStyle = {
  width: '100%',
  padding: '12px',
  border: '1px solid #EDEDED',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 400,
  color: '#454545',
  outline: 'none',
  boxSizing: 'border-box' as const,
  fontFamily: workspaceFont,
}
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: '12px' }
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
