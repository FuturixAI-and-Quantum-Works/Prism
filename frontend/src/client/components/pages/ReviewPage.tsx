import { useParams } from 'react-router-dom'
import { ReviewDetailScreen } from '../../features/review/ReviewDetailScreen'
import { ReviewListScreen } from '../../features/review/ReviewListScreen'
import { WorkspaceReviewScreen } from '../../features/review/WorkspaceReviewScreen'

interface ReviewPageProps {
  workspaceId?: string
  workspaceDocuments?: {
    id: string
    name: string
    extension?: string | null
    created_at?: string | null
  }[]
  embedded?: boolean
  onClose?: () => void
}

export default function ReviewPage({
  workspaceId,
  workspaceDocuments,
  embedded = false,
  onClose,
}: ReviewPageProps) {
  const { reviewId } = useParams<{ reviewId: string }>()

  if (embedded && workspaceId) {
    return (
      <WorkspaceReviewScreen
        workspaceId={workspaceId}
        workspaceDocuments={workspaceDocuments || []}
        onClose={onClose}
      />
    )
  }

  if (reviewId) return <ReviewDetailScreen reviewId={reviewId} />
  return <ReviewListScreen />
}
