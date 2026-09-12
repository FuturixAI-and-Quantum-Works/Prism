import type { KeyboardEvent } from 'react'
import commentMoreIcon from '../../assets/comments/more-icon.svg'
import commentDotSeparator from '../../assets/comments/dot-separator.svg'
import commentDocTextIcon from '../../assets/comments/document-text-icon.svg'
import commentSendButton from '../../assets/comments/send-button.svg'
import commentDeviceMessageIcon from '../../assets/comments/device-message-icon.svg'
import type { DocumentCommentsModel } from './useDocumentComments'

interface CommentsPanelProps {
  active: boolean
  canComment: boolean
  canResolve: boolean
  documentId: string | undefined
  model: DocumentCommentsModel
}

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export function CommentsPanel({
  active,
  canComment,
  canResolve,
  documentId,
  model,
}: CommentsPanelProps) {
  const {
    add: handleAddComment,
    comments,
    error: commentError,
    isCreating: isCreatingComment,
    isError: commentsError,
    isLoading: commentsLoading,
    setText: setCommentText,
    text: commentText,
    toggleResolved: handleToggleCommentResolved,
  } = model
  const handleCommentKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void handleAddComment()
  }

  return (
    <>
      {active && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="doc-editor-panel" style={{ flex: 1, overflowY: 'auto' }}>
            {commentsLoading ? (
              <div style={{ padding: '20px', fontSize: '14px', color: '#797979' }}>
                Loading comments...
              </div>
            ) : commentsError ? (
              <div style={{ padding: '20px', fontSize: '14px', color: '#C83A2D' }}>
                Could not load comments.
              </div>
            ) : comments.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '40px 20px',
                  height: '100%',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '51px',
                    height: '51px',
                    borderRadius: '28px',
                    backgroundColor: '#EDEDED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px',
                  }}
                >
                  <img
                    src={commentDeviceMessageIcon}
                    alt=""
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
                <p
                  style={{
                    fontSize: '18px',
                    fontWeight: 510,
                    color: '#272727',
                    letterSpacing: '-0.9px',
                    lineHeight: '21px',
                    margin: 0,
                    textAlign: 'center',
                    fontFamily,
                  }}
                >
                  No comments yet
                </p>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#999999',
                    letterSpacing: '-0.7px',
                    lineHeight: '16px',
                    margin: 0,
                    textAlign: 'center',
                    width: '307px',
                    fontFamily,
                  }}
                >
                  Start a conversation by adding feedback, requesting changes, or collaborating with
                  your team directly on the document.
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '15px 20px',
                    borderBottom: '1px solid #EDEDED',
                    borderLeft:
                      comment.kind === 'rejection' ? '3px solid #C83A2D' : '3px solid transparent',
                    backgroundColor: comment.kind === 'rejection' ? '#FFF7F6' : '#FFFFFF',
                    opacity: comment.resolved ? 0.72 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div
                        style={{
                          width: '25px',
                          height: '25px',
                          borderRadius: '50%',
                          backgroundColor: comment.avatarColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 510,
                            color: '#FFFFFF',
                            letterSpacing: '-0.45px',
                          }}
                        >
                          {comment.initials}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 510,
                          color: '#454545',
                          letterSpacing: '-0.7px',
                        }}
                      >
                        {comment.author}
                      </span>
                      <img
                        src={commentDotSeparator}
                        alt=""
                        style={{ width: '4px', height: '4px' }}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 510,
                          color: '#999999',
                          letterSpacing: '-0.6px',
                        }}
                      >
                        {comment.time}
                      </span>
                      {comment.kind === 'rejection' && (
                        <>
                          <img
                            src={commentDotSeparator}
                            alt=""
                            style={{ width: '4px', height: '4px' }}
                          />
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 650,
                              color: '#C83A2D',
                              letterSpacing: '-0.6px',
                            }}
                          >
                            {comment.label || 'Rejected'}
                          </span>
                        </>
                      )}
                      {comment.resolved && (
                        <>
                          <img
                            src={commentDotSeparator}
                            alt=""
                            style={{ width: '4px', height: '4px' }}
                          />
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 510,
                              color: '#2F7D32',
                              letterSpacing: '-0.6px',
                            }}
                          >
                            Resolved
                          </span>
                        </>
                      )}
                      {comment.replyTo && (
                        <>
                          <img
                            src={commentDotSeparator}
                            alt=""
                            style={{ width: '4px', height: '4px' }}
                          />
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 510,
                              color: '#797979',
                              letterSpacing: '-0.6px',
                            }}
                          >
                            {comment.replyTo.mention}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 510,
                              color: '#A6A6A6',
                              letterSpacing: '-0.6px',
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {comment.replyTo.preview}
                          </span>
                        </>
                      )}
                    </div>
                    {canResolve && (
                      <button
                        onClick={() => handleToggleCommentResolved(comment)}
                        title={comment.resolved ? 'Reopen comment' : 'Resolve comment'}
                        style={{
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={commentMoreIcon}
                          alt=""
                          style={{ width: '24px', height: '24px' }}
                        />
                      </button>
                    )}
                  </div>

                  {comment.clauseRef && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 9px',
                          backgroundColor: comment.kind === 'rejection' ? '#FDE2DE' : '#EDEDED',
                          borderRadius: '12px',
                        }}
                      >
                        <img
                          src={commentDocTextIcon}
                          alt=""
                          style={{ width: '12px', height: '12px' }}
                        />
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 510,
                            color: '#454545',
                            letterSpacing: '-0.5px',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {comment.clauseRef}
                        </span>
                      </div>
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#454545',
                      letterSpacing: '-0.28px',
                      lineHeight: '18px',
                      margin: 0,
                    }}
                  >
                    {comment.mention && (
                      <span style={{ color: '#272727', fontWeight: 600 }}>{comment.mention}</span>
                    )}
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px',
              margin: '11px',
              backgroundColor: '#FFFFFF',
              borderRadius: '62px',
              boxShadow: '0px 1px 15.2px rgba(0, 0, 0, 0.25)',
            }}
          >
            <input
              type="text"
              aria-label="Comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleCommentKeyDown}
              disabled={!documentId || isCreatingComment || !canComment}
              placeholder={
                canComment ? 'Add a comment on this section...' : 'Your role can view comments only'
              }
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                fontWeight: 400,
                color: '#454545',
                backgroundColor: 'transparent',
                fontFamily,
                letterSpacing: '-0.28px',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                aria-label={isCreatingComment ? 'Adding comment' : 'Add comment'}
                aria-busy={isCreatingComment}
                disabled={!documentId || !commentText.trim() || isCreatingComment || !canComment}
                onClick={() => void handleAddComment()}
                style={{
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  border: 'none',
                  borderRadius: '50%',
                  background: 'transparent',
                  cursor:
                    documentId && commentText.trim() && !isCreatingComment && canComment
                      ? 'pointer'
                      : 'not-allowed',
                  opacity:
                    documentId && commentText.trim() && !isCreatingComment && canComment ? 1 : 0.5,
                }}
              >
                <img
                  src={commentSendButton}
                  alt=""
                  style={{ display: 'block', width: '40px', height: '40px' }}
                />
              </button>
            </div>
          </div>
          {commentError && (
            <div style={{ padding: '0 20px 12px', fontSize: '12px', color: '#C83A2D' }}>
              {commentError}
            </div>
          )}
        </div>
      )}
    </>
  )
}
