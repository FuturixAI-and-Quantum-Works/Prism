import { WorkspaceDetailView } from './WorkspaceDetailView'
import { useWorkspaceDetailSession } from './useWorkspaceDetailSession'

export default function WorkspaceDetailPage() {
  const session = useWorkspaceDetailSession()
  return <WorkspaceDetailView session={session} />
}
