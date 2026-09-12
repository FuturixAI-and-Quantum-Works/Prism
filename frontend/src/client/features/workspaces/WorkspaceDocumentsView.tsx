import { Tabs } from '../../components/ui/Tabs'
import { WorkspaceDocumentTabs } from './WorkspaceDocumentTabs'
import { WorkspaceDocumentsTable } from './WorkspaceDocumentsTable'
import { WorkspaceDocumentsToolbar } from './WorkspaceDocumentsToolbar'
import type { WorkspaceDocumentsSession } from './useWorkspaceDocumentsSession'
import type { WorkspaceMemberView } from './workspaceModels'

interface WorkspaceDocumentsViewProps {
  session: WorkspaceDocumentsSession
  members: WorkspaceMemberView[]
  isViewer: boolean
  onOpenAssistant: () => void
}

export function WorkspaceDocumentsView({
  session,
  members,
  isViewer,
  onOpenAssistant,
}: WorkspaceDocumentsViewProps) {
  return (
    <Tabs
      value={session.tab}
      onValueChange={(value) => session.actions.setTab(value as typeof session.tab)}
    >
      <WorkspaceDocumentTabs activeTab={session.tab} onOpenAssistant={onOpenAssistant} />
      <div
        id="workspace-documents-panel"
        role="tabpanel"
        aria-label={`${session.tab === 'primary' ? 'Primary' : 'Supporting'} documents`}
        style={{ display: 'contents' }}
      >
        <WorkspaceDocumentsToolbar session={session} isViewer={isViewer} />
        <WorkspaceDocumentsTable session={session} members={members} isViewer={isViewer} />
      </div>
    </Tabs>
  )
}
