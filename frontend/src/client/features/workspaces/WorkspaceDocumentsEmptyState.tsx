import folderLibraryElements from '../../assets/empty-state/folder-library-elements.svg'
import primaryGroup1 from '../../assets/empty-state/primary-group-1.svg'
import primaryGroup2 from '../../assets/empty-state/primary-group-2.svg'
import primaryGroup3 from '../../assets/empty-state/primary-group-3.svg'
import primaryGroup4 from '../../assets/empty-state/primary-group-4.svg'
import primaryVector1 from '../../assets/empty-state/primary-vector-1.svg'
import primaryVector2 from '../../assets/empty-state/primary-vector-2.svg'
import primaryVector3 from '../../assets/empty-state/primary-vector-3.svg'
import primaryVector4 from '../../assets/empty-state/primary-vector-4.svg'
import primaryVector5 from '../../assets/empty-state/primary-vector-5.svg'
import primaryVector6 from '../../assets/empty-state/primary-vector-6.svg'
import uploadIconEmpty from '../../assets/empty-state/upload-icon.svg'
import { Button } from '../../components/ui/Button'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceDocumentTab } from './workspaceModels'

interface WorkspaceDocumentsEmptyStateProps {
  tab: WorkspaceDocumentTab
  constrained: boolean
  isViewer: boolean
  onCreate: () => void
  onUpload: () => void
}

export function WorkspaceDocumentsEmptyState({
  tab,
  constrained,
  isViewer,
  onCreate,
  onUpload,
}: WorkspaceDocumentsEmptyStateProps) {
  if (constrained) {
    return (
      <div
        style={{
          padding: '60px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          color: '#797979',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.5 }}>
          <path
            d="M42 20H26L23.17 14.34C22.8 13.52 22 13 21.11 13H6C4.9 13 4 13.9 4 15V37C4 38.1 4.9 39 6 39H42C43.1 39 44 38.1 44 37V22C44 20.9 43.1 20 42 20Z"
            fill="#E5E7EB"
          />
        </svg>
        <p style={{ fontSize: '16px', fontWeight: 510, color: '#454545', margin: 0 }}>
          No documents match your search
        </p>
        <p style={{ fontSize: '14px', margin: 0 }}>Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '22px',
        padding: '60px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '11px',
          width: '283px',
        }}
      >
        <EmptyDocumentsIllustration />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 510,
              color: '#272727',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
            }}
          >
            No {tab === 'primary' ? 'primary' : 'supporting'} documents yet
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 510,
              color: '#999',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
            }}
          >
            Upload contracts, policies, or legal files to start building this workspace.
          </p>
        </div>
      </div>
      {!isViewer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <EmptyAction
            icon={folderLibraryElements}
            iconSize="18px"
            gap="4px"
            label="Create a Document"
            onClick={onCreate}
          />
          <EmptyAction
            icon={uploadIconEmpty}
            iconSize="14px"
            gap="8px"
            label="Upload a Document"
            onClick={onUpload}
          />
        </div>
      )}
    </div>
  )
}

function EmptyDocumentsIllustration() {
  return (
    <div style={{ position: 'relative', width: '105px', height: '85px' }}>
      <img
        src={primaryVector1}
        alt=""
        style={{
          position: 'absolute',
          left: 0,
          top: '40.95px',
          width: '105.09px',
          height: '44.05px',
        }}
      />
      <div style={{ position: 'absolute', left: '16.23px', top: 0 }}>
        <img
          src={primaryVector5}
          alt=""
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '73.38px',
            height: '31.16px',
          }}
        />
        <img
          src={primaryVector6}
          alt=""
          style={{
            position: 'absolute',
            left: '22.1px',
            top: '5.44px',
            width: '23.83px',
            height: '19.03px',
          }}
        />
        <div style={{ position: 'absolute', left: 0, top: '12.46px' }}>
          <img
            src={primaryVector2}
            alt=""
            style={{
              position: 'absolute',
              left: 0,
              top: '6.23px',
              width: '49.49px',
              height: '55.05px',
            }}
          />
          <img
            src={primaryVector3}
            alt=""
            style={{
              position: 'absolute',
              left: 0,
              top: '6.14px',
              width: '49.83px',
              height: '13.09px',
            }}
          />
          <img
            src={primaryVector4}
            alt=""
            style={{
              position: 'absolute',
              left: '49.49px',
              top: 0,
              width: '23.89px',
              height: '61.29px',
            }}
          />
          <div style={{ position: 'absolute', left: '3.21px', top: '33.2px' }}>
            <img
              src={primaryGroup1}
              alt=""
              style={{
                position: 'absolute',
                left: '36.54px',
                top: '7.53px',
                width: '6.22px',
                height: '14.36px',
              }}
            />
            <div style={{ opacity: 0.2 }}>
              <img
                src={primaryGroup2}
                alt=""
                style={{
                  position: 'absolute',
                  left: '2.22px',
                  top: 0,
                  width: '9.85px',
                  height: '5.78px',
                }}
              />
              <img
                src={primaryGroup3}
                alt=""
                style={{
                  position: 'absolute',
                  left: '7.58px',
                  top: '5.66px',
                  width: '6.41px',
                  height: '8.94px',
                }}
              />
              <img
                src={primaryGroup4}
                alt=""
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '3.81px',
                  width: '6.84px',
                  height: '8.97px',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyAction({
  icon,
  iconSize,
  gap,
  label,
  onClick,
}: {
  icon: string
  iconSize: string
  gap: string
  label: string
  onClick: () => void
}) {
  return (
    <Button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap,
        padding: '10px',
        backgroundColor: 'white',
        border: '1px solid #EDEDED',
        borderRadius: '12px',
        cursor: 'pointer',
        fontFamily: workspaceFont,
      }}
    >
      <img src={icon} alt="" style={{ width: iconSize, height: iconSize }} />
      <span
        style={{
          fontSize: '14px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.7px',
        }}
      >
        {label}
      </span>
    </Button>
  )
}
