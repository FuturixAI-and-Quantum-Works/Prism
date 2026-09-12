import folderLibraryIcon from '../../assets/folder-library-icon.svg'
import projectsEmptyBookmarkIcon from '../../assets/projects-empty-bookmark-icon.svg'
import projectsEmptyFolderIcon from '../../assets/projects-empty-folder-icon.svg'
import { Button } from '../../components/ui/Button'
import { WorkspaceCard } from './WorkspaceCard'
import type { WorkspaceListSession } from './useWorkspaceListSession'
import { workspaceFont } from './workspaceModels'

export function WorkspaceListContent({ session }: { session: WorkspaceListSession }) {
  const {
    displayedWorkspaces,
    filter,
    handleContextMenu,
    handleContextMenuKeyDown,
    handleWorkspaceAction,
    isLoading,
    isMobile,
    openWorkspace,
    setCreateWorkspaceModalOpen,
  } = session

  return (
    <div
      style={{
        flex: 1,
        padding: '24px',
        overflow: 'auto',
        background: '#F5F5F5',
      }}
    >
      {isLoading ? (
        <div style={{ color: '#797979' }}>Loading workspaces...</div>
      ) : displayedWorkspaces.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <div style={{ position: 'relative', width: '80px', height: '62.82px' }}>
            <img
              src={projectsEmptyFolderIcon}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
            <img
              src={projectsEmptyBookmarkIcon}
              alt=""
              style={{
                position: 'absolute',
                width: '13.74px',
                height: '17.18px',
                left: '55.95px',
                top: '19.63px',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 590,
                color: '#272727',
                lineHeight: '32px',
                letterSpacing: '-0.24px',
                fontFamily: workspaceFont,
              }}
            >
              No projects yet
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 400,
                color: '#454545',
                lineHeight: '21px',
                letterSpacing: '-0.9px',
                width: '419px',
                fontFamily: workspaceFont,
              }}
            >
              Create a project to organize documents, compliance reviews, workflows, approvals, and
              collaboration in one structured project.
            </p>
          </div>
          {filter !== 'shared' && (
            <Button
              onClick={() => setCreateWorkspaceModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: workspaceFont,
              }}
            >
              <img src={folderLibraryIcon} alt="" style={{ width: '18px', height: '18px' }} />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#454545',
                  lineHeight: '16px',
                  letterSpacing: '-0.7px',
                }}
              >
                Create a Project
              </span>
            </Button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fill, minmax(239px, 1fr))',
            gap: isMobile ? '12px' : '16px',
          }}
        >
          {displayedWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={() => openWorkspace(workspace)}
              onContextMenu={(event) => handleContextMenu(event, workspace)}
              onContextMenuKeyDown={(event) => handleContextMenuKeyDown(event, workspace)}
              onAction={(action) => handleWorkspaceAction(action, workspace)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
