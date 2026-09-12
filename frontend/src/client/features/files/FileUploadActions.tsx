import emptyDocsWave from '../../assets/empty-docs-wave.svg'
import folderUploadIcon from '../../assets/folder-upload-icon.svg'
import plusFabIcon from '../../assets/plus-fab-icon.svg'
import questionMark from '../../assets/question-mark.svg'
import uploadIcon from '../../assets/upload-icon.svg'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface FileUploadActionsProps {
  onImport: () => void
  onUploadFolder?: () => void
}

export function FileImportAction({ onImport }: Pick<FileUploadActionsProps, 'onImport'>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px' }}>
      <button
        type="button"
        aria-label="Import documents"
        onClick={onImport}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#272727',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img src={plusFabIcon} alt="" style={{ width: '17.5px', height: '17.5px' }} />
      </button>
    </div>
  )
}

export function EmptyFileBrowser({ onImport, onUploadFolder }: FileUploadActionsProps) {
  return (
    <>
      <div
        style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#EDEDED',
          margin: '0 18px',
          maxWidth: 'calc(100% - 36px)',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          height: '379px',
          padding: '0 18px',
        }}
      >
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
            />
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
            />
            <img
              src={emptyDocsWave}
              alt=""
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '59px',
                height: '43px',
              }}
            />
          </div>
          <img
            src={questionMark}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: '56px',
              width: '15px',
              height: '27px',
            }}
          />
          <img
            src={questionMark}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: '73px',
              width: '15px',
              height: '27px',
            }}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 510, color: '#454545', display: 'block' }}>
            No documents yet
          </span>
          <span
            style={{
              fontSize: '16px',
              color: '#999999',
              width: '248px',
              display: 'block',
              marginTop: '8px',
            }}
          >
            Upload a contract or create a draft to start analyzing this matter
          </span>
        </div>
        <div style={{ display: 'flex', gap: '7px' }}>
          <button
            type="button"
            onClick={onImport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '40px',
              padding: '10px 15px',
              backgroundColor: '#272727',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              fontFamily,
            }}
          >
            <img
              src={uploadIcon}
              alt=""
              style={{ width: '16px', height: '16px', filter: 'brightness(0) invert(1)' }}
            />
            Import
          </button>
          {onUploadFolder && (
            <button
              type="button"
              onClick={onUploadFolder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '10px 15px',
                backgroundColor: '#EDEDED',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                fontFamily,
              }}
            >
              <img src={folderUploadIcon} alt="" style={{ width: '16px', height: '16px' }} />
              Upload Folder
            </button>
          )}
        </div>
      </div>
    </>
  )
}
