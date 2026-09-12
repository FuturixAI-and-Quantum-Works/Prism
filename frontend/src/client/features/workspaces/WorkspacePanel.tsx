import AnalysisPanel from '../analysis/AnalysisPanelFeature'
import { ComplianceReviewFeature } from '../compliance/ComplianceReviewFeature'
import ReviewPage from '../../components/pages/ReviewPage'
import RulebookPanel from '../../components/pages/RulebookPanel'
import { ActivityTypeIcon } from './WorkspaceDetailIcons'
import { formatActivityAction } from './workspaceModels'
import { WorkspaceDocumentsView } from './WorkspaceDocumentsView'
import type { WorkspaceDetailSession } from './useWorkspaceDetailSession'

interface WorkspacePanelProps {
  session: WorkspaceDetailSession
}

export function WorkspacePanel({ session }: WorkspacePanelProps) {
  const close = session.actions.closePanel
  if (session.sidebarTab === 'documents') {
    return (
      <WorkspaceDocumentsView
        session={session.documents}
        members={session.members.members}
        isViewer={session.isViewer}
        onOpenAssistant={session.ai.open}
      />
    )
  }
  if (session.sidebarTab === 'rulebook') {
    return <RulebookPanel workspaceId={session.workspaceId} embedded onClose={close} />
  }
  if (session.sidebarTab === 'analysis') {
    return (
      <AnalysisPanel
        workspaceId={session.workspaceId}
        embedded
        onClose={close}
        analysisData={session.analysis.data}
        isLoading={session.analysis.isLoading}
        error={session.analysis.error}
        onRequestAnalysis={session.analysis.run}
      />
    )
  }
  if (session.sidebarTab === 'compliance') {
    return (
      <ComplianceReviewFeature
        workspaceId={session.workspaceId}
        selectedDocuments={session.documents.allItems
          .filter((item) => session.documents.selectedIds.has(item.id))
          .map((item) => ({
            id: item.id,
            name: item.name,
            extension: item.extension,
            type: item.type,
          }))}
        embedded
        onClose={close}
        selectedRulebookId={session.selectedRulebookId}
      />
    )
  }
  if (session.sidebarTab === 'tabular') {
    return (
      <ReviewPage
        workspaceId={session.workspaceId}
        workspaceDocuments={session.documents.allItems
          .filter((item) => session.documents.selectedIds.has(item.id))
          .map((item) => ({
            id: item.id,
            name: item.name,
            extension: item.extension,
            created_at: item.createdAt,
          }))}
        embedded
        onClose={close}
      />
    )
  }
  return <WorkspaceActivity activity={session.activity} />
}

function WorkspaceActivity({ activity }: { activity: WorkspaceDetailSession['activity'] }) {
  return (
    <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 510, color: '#272727' }}>
        Activity
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activity.slice(0, 20).map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #EDEDED',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ActivityTypeIcon action={entry.action} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 510, color: '#454545' }}>
                {formatActivityAction(entry.action)}
              </p>
              <p style={{ margin: '4px 0 0', color: '#999', fontSize: '12px' }}>
                {entry.user_name || entry.user_email || 'System'} -{' '}
                {new Date(entry.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {activity.length === 0 && (
          <p style={{ color: '#999', fontSize: '14px' }}>No activity yet</p>
        )}
      </div>
    </div>
  )
}
