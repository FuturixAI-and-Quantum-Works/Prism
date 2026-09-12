import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { rulebookFontFamily, type RulebookWorkflow } from './rulebookModel'
import { DocumentChecklist } from './RulebookFields'
import {
  primaryRulebookActionStyle,
  rulebookInputStyle,
  rulebookLabelStyle,
  secondaryRulebookActionStyle,
} from './rulebookStyles'
import { useCreateRulebookReview } from './useCreateRulebookReview'

export function CreateRulebookReviewDialog({
  workflow,
  onClose,
  onCreated,
}: {
  workflow: RulebookWorkflow
  onClose: () => void
  onCreated: (reviewId: string) => void
}) {
  const session = useCreateRulebookReview({ workflow, onClose, onCreated })

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      labelledBy="create-review-dialog-title"
      overlayStyle={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      contentStyle={{
        width: '560px',
        maxHeight: '82vh',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 18px 44px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: rulebookFontFamily,
      }}
    >
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #EDEDED' }}>
        <h2
          id="create-review-dialog-title"
          style={{ margin: 0, fontSize: '18px', color: '#272727' }}
        >
          Create review
        </h2>
        <div style={{ marginTop: '4px', color: '#797979', fontSize: '12px' }}>{workflow.title}</div>
      </div>
      <div
        style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflow: 'auto',
        }}
      >
        <label htmlFor="create-review-title" style={rulebookLabelStyle}>
          Review title
        </label>
        <input
          id="create-review-title"
          value={session.title}
          onChange={(event) => session.actions.setTitle(event.target.value)}
          style={rulebookInputStyle}
        />
        <div style={rulebookLabelStyle}>Documents</div>
        <DocumentChecklist
          documents={session.documents}
          selectedIds={session.selectedDocIds}
          onChange={session.actions.setSelectedDocIds}
          loading={session.docsLoading}
        />
        {session.error && (
          <div role="alert" style={{ color: '#C83A2D', fontSize: '12px' }}>
            {session.error}
          </div>
        )}
      </div>
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid #EDEDED',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}
      >
        <button type="button" onClick={onClose} style={secondaryRulebookActionStyle(false)}>
          Cancel
        </button>
        <button
          type="button"
          aria-busy={session.isCreating}
          onClick={() => void session.actions.create()}
          disabled={session.selectedDocIds.length === 0 || session.isCreating}
          style={primaryRulebookActionStyle(
            session.selectedDocIds.length === 0 || session.isCreating,
          )}
        >
          {session.isCreating ? 'Creating...' : 'Create review'}
        </button>
      </div>
    </AccessibleDialog>
  )
}
