import { useCallback, useEffect, useState } from 'react'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  useCreateTabularReviewMutation,
  useGetTabularReviewsQuery,
  useUpdateTabularReviewMutation,
} from '../../store/api/tabularReviewApi'
import { EmbeddedReviewDetailScreen } from './EmbeddedReviewDetailScreen'
import { COLUMN_PRESETS } from './reviewModel'

export function WorkspaceReviewScreen({
  workspaceId,
  workspaceDocuments,
  onClose,
}: {
  workspaceId: string
  workspaceDocuments: {
    id: string
    name: string
    extension?: string | null
    created_at?: string | null
  }[]
  onClose?: () => void
}) {
  const [createReview, { isLoading: isCreatingReview }] = useCreateTabularReviewMutation()
  const [updateReview, { isLoading: isSyncingDocuments }] = useUpdateTabularReviewMutation()
  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')
  const [syncError, setSyncError] = useState('')
  const { data: existingReviews = [], refetch: refetchReviews } = useGetTabularReviewsQuery()

  const workspaceReview = existingReviews.find((r) => r.title?.includes(`workspace-${workspaceId}`))
  const [hasSyncedDocs, setHasSyncedDocs] = useState(false)

  const syncWorkspaceDocuments = useCallback(async () => {
    if (!workspaceReview || workspaceDocuments.length === 0) return
    setSyncError('')
    try {
      await updateReview({
        reviewId: workspaceReview.id,
        document_ids: workspaceDocuments.map((document) => document.id),
      }).unwrap()
      setHasSyncedDocs(true)
      await refetchReviews()
    } catch (error) {
      setSyncError(getRequestErrorMessage(error, 'Could not sync the workspace documents.'))
    }
  }, [refetchReviews, updateReview, workspaceDocuments, workspaceReview])

  useEffect(() => {
    if (workspaceReview && workspaceDocuments.length > 0 && !hasSyncedDocs) {
      setCurrentReviewId(workspaceReview.id)
      void syncWorkspaceDocuments()
    } else if (workspaceReview && !hasSyncedDocs) {
      setCurrentReviewId(workspaceReview.id)
      setHasSyncedDocs(true)
    }
  }, [hasSyncedDocs, syncWorkspaceDocuments, workspaceDocuments.length, workspaceReview])

  const handleCreateReview = async () => {
    setCreateError('')
    try {
      const result = await createReview({
        title: `Workspace Review (workspace-${workspaceId})`,
        document_ids: workspaceDocuments.map((document) => document.id),
        columns_config: COLUMN_PRESETS.slice(0, 3).map((preset, index) => ({
          index,
          name: preset.name,
          prompt: preset.prompt,
          format: preset.format,
        })),
      }).unwrap()
      setCurrentReviewId(result.id)
    } catch (error) {
      setCreateError(getRequestErrorMessage(error, 'Could not create the review.'))
    }
  }

  if (currentReviewId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderBottom: '1px solid #EDEDED',
            backgroundColor: '#FFFFFF',
          }}
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#F7F7F7',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="#454545"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>Close</span>
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 510, color: '#454545' }}>
            Tabular Review
          </h2>
        </div>
        {syncError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 18px',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              fontSize: '13px',
            }}
          >
            <span>{syncError}</span>
            <button
              type="button"
              onClick={() => void syncWorkspaceDocuments()}
              disabled={isSyncingDocuments}
            >
              {isSyncingDocuments ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <EmbeddedReviewDetailScreen reviewId={currentReviewId} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        backgroundColor: '#F5F5F5',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid #EDEDED',
          backgroundColor: '#FFFFFF',
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#F7F7F7',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="#454545"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>Close</span>
          </button>
        )}
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 510, color: '#454545' }}>
          Tabular Review
        </h2>
        <div />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ backgroundColor: '#EDEDED', borderRadius: '50%', padding: '24px' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="#454545" strokeWidth="2" />
              <line x1="4" y1="16" x2="44" y2="16" stroke="#454545" strokeWidth="2" />
              <line x1="16" y1="16" x2="16" y2="40" stroke="#454545" strokeWidth="2" />
              <line x1="32" y1="16" x2="32" y2="40" stroke="#454545" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 510, color: '#272727' }}>
              Start Tabular Review
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#797979', maxWidth: '300px' }}>
              Analyze {workspaceDocuments.length} document
              {workspaceDocuments.length !== 1 ? 's' : ''} from this workspace in a structured table
              format
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCreateReview()}
            disabled={workspaceDocuments.length === 0 || isCreatingReview}
            style={{
              padding: '12px 32px',
              backgroundColor:
                workspaceDocuments.length === 0 || isCreatingReview ? '#CCCCCC' : '#272727',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 510,
              cursor:
                workspaceDocuments.length === 0 || isCreatingReview ? 'not-allowed' : 'pointer',
            }}
          >
            {isCreatingReview ? 'Creating...' : 'Create Review'}
          </button>
          {createError && (
            <p role="alert" style={{ margin: 0, color: '#B91C1C', fontSize: '13px' }}>
              {createError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
