import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import {
  useDeleteTabularReviewMutation,
  useGetTabularReviewsQuery,
  useUpdateTabularReviewMutation,
  type TabularReview,
} from '../../store/api/tabularReviewApi'
import { useGetProjectsQuery } from '../projects/projectsApi'
import { useGetWorkflowsQuery } from '../../store/api/workflowsApi'
import { CreateReviewDialog } from './CreateReviewDialog'
import { ReviewListToolbar } from './ReviewListToolbar'
import {
  handleReviewPopupFocus,
  handleReviewPopupKeyDown as handlePopupKeyDown,
} from './reviewPopupKeyboard'
import {
  formatDate,
  projectLabel,
  reviewFontFamily as fontFamily,
  reviewTitle,
} from './reviewModel'

export function ReviewListScreen() {
  const navigate = useNavigate()
  const { data: reviews = [], isLoading, isError, refetch } = useGetTabularReviewsQuery()
  const { data: projects = [] } = useGetProjectsQuery()
  const { data: workflows = [] } = useGetWorkflowsQuery({ type: 'tabular' })
  const [deleteReview] = useDeleteTabularReviewMutation()
  const [updateReview] = useUpdateTabularReviewMutation()
  const [searchQuery, setSearchQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'shared'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [renameReview, setRenameReview] = useState<TabularReview | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    review: TabularReview
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const contextMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const renameTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('[data-context-menu]')) setContextMenu(null)
    }
    if (contextMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  function openContextMenu(x: number, y: number, review: TabularReview) {
    setContextMenu({ x, y, review })
    requestAnimationFrame(() => {
      contextMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    })
  }

  function handleContextMenu(e: ReactMouseEvent<HTMLDivElement>, review: TabularReview) {
    e.preventDefault()
    contextMenuTriggerRef.current = e.currentTarget.querySelector('button')
    openContextMenu(e.clientX, e.clientY, review)
  }

  const filteredReviews = reviews.filter((review) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query || reviewTitle(review).toLowerCase().includes(query)
    const matchesProject = projectFilter === 'all' || review.projectId === projectFilter
    const matchesOwnership =
      ownershipFilter === 'all' ||
      (ownershipFilter === 'owned' && review.is_owner !== false) ||
      (ownershipFilter === 'shared' && review.is_owner === false)
    return matchesSearch && matchesProject && matchesOwnership
  })

  const handleDelete = async (review: TabularReview) => {
    if (!window.confirm(`Delete "${reviewTitle(review)}"?`)) return
    await deleteReview(review.id).unwrap()
    refetch()
  }

  const closeRenameDialog = () => {
    setRenameReview(null)
    requestAnimationFrame(() => renameTriggerRef.current?.focus())
  }

  const handleRename = async () => {
    if (!renameReview || !renameValue.trim()) return
    await updateReview({ reviewId: renameReview.id, title: renameValue.trim() }).unwrap()
    closeRenameDialog()
    setRenameValue('')
    refetch()
  }

  return (
    <Layout activePage="review">
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          fontFamily,
          overflow: 'hidden',
        }}
      >
        <ReviewListToolbar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          projects={projects}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          ownershipFilter={ownershipFilter}
          onOwnershipFilterChange={setOwnershipFilter}
          onCreate={() => setCreateOpen(true)}
        />
        <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f5' }}>
          {isLoading ? (
            <div role="status" aria-live="polite" style={{ padding: '24px', color: '#797979' }}>
              Loading reviews...
            </div>
          ) : isError ? (
            <div role="alert" style={{ padding: '24px', color: '#C83A2D' }}>
              Could not load tabular reviews.
            </div>
          ) : filteredReviews.length === 0 ? (
            <div
              style={{
                height: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '12px',
                color: '#797979',
              }}
            >
              <div style={{ fontSize: '17px', fontWeight: 510, color: '#454545' }}>
                No tabular reviews yet
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  border: 'none',
                  borderRadius: '9px',
                  backgroundColor: '#272727',
                  color: '#FFFFFF',
                  fontFamily,
                  cursor: 'pointer',
                }}
              >
                Create review
              </button>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #EDEDED',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  onContextMenu={(e) => handleContextMenu(e, review)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 180px 110px 120px 170px',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderBottom: '1px solid #F1F1F1',
                    cursor: 'context-menu',
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={contextMenu?.review.id === review.id}
                    aria-controls="review-context-menu"
                    onKeyDown={(event) => {
                      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                        event.preventDefault()
                        contextMenuTriggerRef.current = event.currentTarget
                        const rect = event.currentTarget.getBoundingClientRect()
                        openContextMenu(rect.right, rect.bottom, review)
                      }
                    }}
                    onClick={() => navigate(`/review/${review.id}`)}
                    style={{
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      fontFamily,
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 590, color: '#272727' }}>
                      {reviewTitle(review)}
                    </div>
                    <div style={{ marginTop: '3px', fontSize: '12px', color: '#797979' }}>
                      {review.is_owner === false ? 'Shared with you' : 'Owned by you'}
                    </div>
                  </button>
                  <div style={{ fontSize: '13px', color: '#454545' }}>
                    {projectLabel(projects, review.projectId)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#797979' }}>
                    {review.document_count ?? 0} docs
                  </div>
                  <div style={{ fontSize: '13px', color: '#797979' }}>
                    {review.updatedAt ? formatDate(new Date(review.updatedAt)) : ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/review/${review.id}`)}
                      style={{
                        height: '30px',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 10px',
                        backgroundColor: '#F7F7F7',
                        cursor: 'pointer',
                        fontFamily,
                      }}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        renameTriggerRef.current = event.currentTarget
                        setRenameReview(review)
                        setRenameValue(reviewTitle(review))
                      }}
                      style={{
                        height: '30px',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 10px',
                        backgroundColor: '#F7F7F7',
                        cursor: 'pointer',
                        fontFamily,
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(review)}
                      style={{
                        height: '30px',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 10px',
                        backgroundColor: '#FDECEC',
                        color: '#E53935',
                        cursor: 'pointer',
                        fontFamily,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateReviewDialog
        open={createOpen}
        workflows={workflows}
        projects={projects}
        onClose={() => setCreateOpen(false)}
      />

      {renameReview && (
        <AccessibleDialog
          open={Boolean(renameReview)}
          onClose={closeRenameDialog}
          labelledBy="rename-review-title"
          overlayStyle={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          contentStyle={{
            width: '380px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}
        >
          <h2
            id="rename-review-title"
            style={{ margin: '0 0 14px', fontSize: '18px', color: '#272727' }}
          >
            Rename review
          </h2>
          <input
            aria-label="Review name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              height: '40px',
              boxSizing: 'border-box',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              padding: '0 10px',
              fontFamily,
            }}
          />
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}
          >
            <button
              type="button"
              onClick={closeRenameDialog}
              style={{
                height: '36px',
                border: 'none',
                borderRadius: '8px',
                padding: '0 14px',
                backgroundColor: '#F7F7F7',
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRename}
              style={{
                height: '36px',
                border: 'none',
                borderRadius: '8px',
                padding: '0 14px',
                backgroundColor: '#272727',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Save
            </button>
          </div>
        </AccessibleDialog>
      )}

      {contextMenu && (
        <div
          id="review-context-menu"
          ref={contextMenuRef}
          data-context-menu
          role="menu"
          aria-label={`Actions for ${reviewTitle(contextMenu.review)}`}
          onFocus={handleReviewPopupFocus}
          onKeyDown={(event) =>
            handlePopupKeyDown(event, (reason) => {
              setContextMenu(null)
              if (reason === 'escape') {
                requestAnimationFrame(() => contextMenuTriggerRef.current?.focus())
              }
            })
          }
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDEDED',
            borderRadius: '8px',
            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            minWidth: '160px',
            overflow: 'hidden',
            fontFamily,
          }}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              navigate(`/review/${contextMenu.review.id}`)
              setContextMenu(null)
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              fontFamily,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8H14M14 8L9 3M14 8L9 13"
                stroke="#454545"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Open
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              renameTriggerRef.current = contextMenuTriggerRef.current
              contextMenuTriggerRef.current?.focus()
              setRenameReview(contextMenu.review)
              setRenameValue(reviewTitle(contextMenu.review))
              setContextMenu(null)
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              fontFamily,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z"
                stroke="#454545"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              void handleDelete(contextMenu.review)
              setContextMenu(null)
              requestAnimationFrame(() => contextMenuTriggerRef.current?.focus())
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: 510,
              color: '#E53935',
              fontFamily,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z"
                stroke="#E53935"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </Layout>
  )
}
