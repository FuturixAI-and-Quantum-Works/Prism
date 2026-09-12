import Layout from '../../components/Layout'
import { CreateRulebookReviewDialog } from './CreateRulebookReviewDialog'
import { RulebookContextMenu } from './RulebookContextMenu'
import { RulebookEditorDialog } from './RulebookEditorDialog'
import { RulebookList } from './RulebookList'
import { rulebookFontFamily } from './rulebookModel'
import { useRulebookListSession } from './useRulebookListSession'

export default function RulebookFeature() {
  const session = useRulebookListSession()

  return (
    <Layout activePage="rulebook">
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          fontFamily: rulebookFontFamily,
          overflow: 'hidden',
        }}
      >
        <RulebookList session={session} />
        <RulebookEditorDialog
          state={session.rulebookModal}
          onClose={() => session.actions.setRulebookModal(null)}
          onCreatedReview={session.actions.openCreatedReview}
        />
        {session.reviewWorkflow && (
          <CreateRulebookReviewDialog
            workflow={session.reviewWorkflow}
            onClose={() => session.actions.setReviewWorkflow(null)}
            onCreated={session.actions.openCreatedReview}
          />
        )}
        <RulebookContextMenu session={session} />
      </div>
    </Layout>
  )
}
