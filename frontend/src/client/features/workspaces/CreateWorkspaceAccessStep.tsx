import { TabPanel } from '../../components/ui/Tabs'
import type { CreateWorkspaceSession } from './useCreateWorkspaceSession'
import type { WorkspaceMemberRole } from './workspaceModels'
import { workspaceFont } from './workspaceModels'

const roleOptions: WorkspaceMemberRole[] = ['Editor', 'Viewer', 'Admin']

interface CreateWorkspaceAccessStepProps {
  session: CreateWorkspaceSession
}

export function CreateWorkspaceAccessStep({ session }: CreateWorkspaceAccessStepProps) {
  const { fields, ids, refs, actions } = session

  return (
    <TabPanel
      value="access"
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label
          htmlFor={ids.inviteEmailId}
          style={{
            fontSize: '16px',
            fontWeight: 510,
            color: '#272727',
            letterSpacing: '-0.8px',
          }}
        >
          Invite Members
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={refs.inviteEmailRef}
            id={ids.inviteEmailId}
            type="email"
            placeholder="Enter email address"
            value={fields.emailInput}
            onChange={(event) => actions.setEmailInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                actions.addInvite()
              }
            }}
            style={{
              flex: 1,
              padding: '10px 15px',
              backgroundColor: '#F7F7F7',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 400,
              color: '#272727',
              outline: 'none',
              fontFamily: workspaceFont,
            }}
          />
          <button
            type="button"
            onClick={actions.addInvite}
            style={{
              padding: '10px 16px',
              backgroundColor: '#454545',
              border: '1px solid #EDEDED',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#ffffff',
              letterSpacing: '0.2px',
              cursor: 'pointer',
              fontFamily: workspaceFont,
              whiteSpace: 'nowrap',
            }}
          >
            Add
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
          {fields.invites.map((invite) => (
            <div
              key={invite.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '0.5px solid #ededed',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: invite.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 510,
                  }}
                >
                  {invite.email.charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#454545',
                    letterSpacing: '-0.28px',
                  }}
                >
                  {invite.email}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  aria-label={`Role for ${invite.email}`}
                  value={invite.role}
                  onChange={(event) =>
                    actions.setInviteRole(invite.email, event.target.value as WorkspaceMemberRole)
                  }
                  style={{
                    padding: '6px 10px',
                    paddingRight: '24px',
                    backgroundColor: '#F7F7F7',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: 'none',
                    appearance: 'none',
                    fontSize: '12px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.24px',
                    fontFamily: workspaceFont,
                  }}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="#454545"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {fields.invitationFailures.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            color: '#B42318',
            fontSize: '13px',
            lineHeight: '18px',
          }}
        >
          <div>{fields.error}</div>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
            {fields.invitationFailures.map((failure) => (
              <li key={failure.email}>
                {failure.email}: {failure.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <FooterButton onClick={actions.close}>Cancel</FooterButton>
        {fields.invitationFailures.length > 0 ? (
          <button
            type="button"
            onClick={actions.continueWithoutFailedInvitations}
            style={{
              ...footerButtonStyle,
              backgroundColor: '#272727',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Continue without failed invitations
          </button>
        ) : (
          <>
            <FooterButton onClick={actions.create} disabled={fields.isCreating}>
              Skip For Now
            </FooterButton>
            <button
              type="button"
              onClick={actions.create}
              disabled={fields.isCreating}
              aria-busy={fields.isCreating}
              style={{
                ...footerButtonStyle,
                backgroundColor: fields.isCreating ? '#666666' : '#272727',
                color: '#FFFFFF',
                cursor: fields.isCreating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {fields.isCreating && <LoadingSpinner />}
              {fields.isCreating ? 'Creating...' : 'Continue'}
            </button>
          </>
        )}
      </div>
      {fields.error && fields.invitationFailures.length === 0 && (
        <p
          role="alert"
          style={{
            color: '#EF4444',
            fontSize: '14px',
            margin: '8px 0 0 0',
            textAlign: 'center',
          }}
        >
          {fields.error}
        </p>
      )}
    </TabPanel>
  )
}

function FooterButton({
  children,
  onClick,
  disabled,
}: {
  children: string
  onClick: () => void | Promise<void>
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...footerButtonStyle,
        backgroundColor: '#F7F7F7',
        color: '#454545',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function LoadingSpinner() {
  return (
    <svg
      width="16"
      height="16"
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

const footerButtonStyle = {
  flex: 1,
  padding: '10px',
  height: '44px',
  border: 'none',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 510,
  letterSpacing: '0.2px',
  fontFamily: workspaceFont,
}
