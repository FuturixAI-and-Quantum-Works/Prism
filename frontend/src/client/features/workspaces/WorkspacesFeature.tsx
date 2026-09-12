import CreateWorkspaceModal from './CreateWorkspaceModal'
import { WorkspaceListContent } from './WorkspaceListContent'
import { WorkspaceListContextMenu } from './WorkspaceListContextMenu'
import { WorkspaceListDialogs } from './WorkspaceListDialogs'
import { WorkspaceListToolbar } from './WorkspaceListToolbar'
import { useWorkspaceListSession } from './useWorkspaceListSession'
import { workspaceFont, type WorkspaceListFilter } from './workspaceModels'

export interface WorkspacesFeatureProps {
  filter?: WorkspaceListFilter
}

export default function WorkspacesFeature({ filter = 'all' }: WorkspacesFeatureProps) {
  const session = useWorkspaceListSession(filter)

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: workspaceFont,
      }}
    >
      <WorkspaceListToolbar session={session} />
      <WorkspaceListContent session={session} />
      <WorkspaceListDialogs session={session} />
      <CreateWorkspaceModal
        open={session.createWorkspaceModalOpen}
        onClose={() => session.setCreateWorkspaceModalOpen(false)}
      />
      <WorkspaceListContextMenu session={session} />
    </div>
  )
}
