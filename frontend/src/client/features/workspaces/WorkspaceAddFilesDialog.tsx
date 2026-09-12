import filesPanelEmptyWave from '../../assets/files-panel/empty-docs-wave.svg'
import filesPanelQuestionMark from '../../assets/files-panel/question-mark.svg'
import filesPanelUploadIcon from '../../assets/files-panel/upload-icon.svg'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceDocumentsSession } from './useWorkspaceDocumentsSession'

interface WorkspaceAddFilesDialogProps {
  session: WorkspaceDocumentsSession
}

export function WorkspaceAddFilesDialog({ session }: WorkspaceAddFilesDialogProps) {
  if (!session.addFilesOpen) return null
  const busy = session.isUploading || session.isImporting
  return (
    <AccessibleDialog
      open
      onClose={session.actions.closeAddFiles}
      labelledBy="add-files-title"
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '24px' }}
      contentStyle={{
        width: '420px',
        maxWidth: 'calc(100vw - 48px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: workspaceFont,
        padding: '32px',
      }}
    >
      <AddFilesIllustration />
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h3
          id="add-files-title"
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 590,
            color: '#272727',
            letterSpacing: '-0.9px',
            lineHeight: '21px',
            fontFamily: workspaceFont,
          }}
        >
          Add files to project
        </h3>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#797979',
            letterSpacing: '-0.7px',
            lineHeight: '20px',
            marginTop: '8px',
            fontFamily: workspaceFont,
          }}
        >
          Upload files from your device or browse existing documents from your library
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            onClick={session.actions.triggerUpload}
            disabled={busy}
            style={{
              ...actionStyle,
              flex: 1,
              backgroundColor: '#272727',
              border: 'none',
              opacity: busy ? 0.7 : 1,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            <img
              src={filesPanelUploadIcon}
              alt=""
              style={{ width: '16px', height: '16px', filter: 'brightness(0) invert(1)' }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#FFFFFF',
                letterSpacing: '-0.7px',
              }}
            >
              {session.isUploading
                ? 'Uploading...'
                : session.isImporting
                  ? 'Importing...'
                  : 'Upload'}
            </span>
          </Button>
          <Button
            onClick={session.actions.openBrowseFiles}
            style={{
              ...actionStyle,
              flex: 1,
              backgroundColor: '#F7F7F7',
              border: '1px solid #EDEDED',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
              }}
            >
              Browse Files
            </span>
          </Button>
        </div>
        <Button
          onClick={session.actions.createBlank}
          disabled={session.isCreating}
          style={{
            ...actionStyle,
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDEDED',
            opacity: session.isCreating ? 0.7 : 1,
            cursor: session.isCreating ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M9 2H4C3.46957 2 2.96086 2.21071 2.58579 2.58579C2.21071 2.96086 2 3.46957 2 4V12C2 12.5304 2.21071 13.0391 2.58579 13.4142C2.96086 13.7893 3.46957 14 4 14H12C12.5304 14 13.0391 13.7893 13.4142 13.4142C13.7893 13.0391 14 12.5304 14 12V7"
              stroke="#454545"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 2L8 7V9H10L15 4L13 2Z"
              stroke="#454545"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
            }}
          >
            {session.isCreating ? 'Creating...' : 'Blank Document'}
          </span>
        </Button>
      </div>
      {session.addFilesError && (
        <p
          role="alert"
          style={{
            margin: '16px 0 0',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            color: '#B42318',
            fontSize: '13px',
            lineHeight: '18px',
            textAlign: 'center',
          }}
        >
          {session.addFilesError}
        </p>
      )}
    </AccessibleDialog>
  )
}

function AddFilesIllustration() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
      <div style={{ position: 'relative', width: '88px', height: '95px' }}>
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: 0,
            width: '57px',
            height: '59px',
            borderRadius: '3px',
            background: 'linear-gradient(180deg, #C4C4C4 0%, #4B4B4B 65.55%)',
            overflow: 'visible',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-5px',
              left: '9px',
              width: '46.5px',
              height: '46.5px',
              backgroundColor: '#DFDFDF',
              borderRadius: '5.8px',
              transform: 'rotate(24.83deg)',
              boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '5.25px',
                left: '5.31px',
                width: '35px',
                height: '2.3px',
                backgroundColor: '#F9F9F9',
                borderRadius: '2px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '13.19px',
                left: '5.31px',
                width: '35px',
                height: '4.5px',
                backgroundColor: '#F9F9F9',
                borderRadius: '2px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '22.27px',
                left: '5.31px',
                width: '35px',
                height: '4.5px',
                backgroundColor: '#FAFEFF',
                borderRadius: '2px',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: '-5px',
              left: '-9px',
              width: '46.5px',
              height: '46.5px',
              background: 'linear-gradient(37deg, #F8F8F8 5.37%, #F6F6F6 94.63%)',
              borderRadius: '5.8px',
              transform: 'rotate(-15.97deg)',
              boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '5.25px',
                left: '5.31px',
                width: '35px',
                height: '2.3px',
                backgroundColor: '#DFDFDF',
                borderRadius: '2px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '13.19px',
                left: '5.31px',
                width: '35px',
                height: '4.5px',
                backgroundColor: '#DFDFDF',
                borderRadius: '2px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '22.27px',
                left: '5.31px',
                width: '35px',
                height: '4.5px',
                backgroundColor: '#E2E2E2',
                borderRadius: '2px',
              }}
            />
          </div>
          <img
            src={filesPanelEmptyWave}
            alt=""
            style={{ position: 'absolute', bottom: 0, left: '-1px', width: '59px', height: '43px' }}
          />
        </div>
        {[56, 73].map((left) => (
          <img
            key={left}
            src={filesPanelQuestionMark}
            alt=""
            style={{ position: 'absolute', top: 0, left, width: '15px', height: '27px' }}
          />
        ))}
      </div>
    </div>
  )
}

const actionStyle = {
  height: '44px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '14px',
  fontWeight: 510,
  fontFamily: workspaceFont,
  cursor: 'pointer',
}
