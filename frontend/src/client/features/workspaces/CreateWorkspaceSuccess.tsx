import { workspaceFont } from './workspaceModels'
import type { CreateWorkspaceSession } from './useCreateWorkspaceSession'

interface CreateWorkspaceSuccessProps {
  session: CreateWorkspaceSession
}

export function CreateWorkspaceSuccess({ session }: CreateWorkspaceSuccessProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: '#4CAF50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12L10 17L20 7"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
          textAlign: 'center',
          width: '230px',
        }}
      >
        <p
          role="status"
          aria-live="polite"
          style={{
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            letterSpacing: '-0.9px',
            lineHeight: '21px',
            margin: 0,
          }}
        >
          Workspace created successfully
        </p>
        <p
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#454545',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            margin: 0,
            width: '212px',
          }}
        >
          Your project workspace is ready. Start uploading files and managing approvals
        </p>
      </div>
      <button
        ref={session.refs.continueButtonRef}
        type="button"
        onClick={session.actions.continueToWorkspace}
        style={{
          width: '230px',
          height: '48px',
          padding: '10px',
          backgroundColor: '#F7F7F7',
          border: '1px solid #EDEDED',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.8px',
          lineHeight: '21px',
          cursor: 'pointer',
          fontFamily: workspaceFont,
        }}
      >
        Continue
      </button>
    </div>
  )
}
