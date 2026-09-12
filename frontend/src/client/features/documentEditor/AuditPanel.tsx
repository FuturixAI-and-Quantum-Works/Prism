import { useId } from 'react'
import workflowIcon from '../../assets/document-editor/workflow.svg'
import auditArrowTurnIcon from '../../assets/audit/arrow-turn-icon.svg'
import { getAvatarColor, getInitials, formatRelativeTime } from './commentsModel'
import { formatActivityAction, getActivityDetail } from './editorUtilities'
import type { DocumentAuditModel } from './useDocumentAudit'

interface AuditPanelProps {
  active: boolean
  model: DocumentAuditModel
}

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export function AuditPanel({ active, model }: AuditPanelProps) {
  const panelTitleId = useId()
  const detailIdPrefix = useId()
  const {
    activity: documentActivity,
    isError: activityError,
    isLoading: activityLoading,
    selected: selectedActivity,
    select: setSelectedActivity,
  } = model

  return (
    <>
      {active && (
        <section
          aria-labelledby={panelTitleId}
          className="doc-editor-panel"
          style={{
            flex: 1,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
          }}
        >
          <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={workflowIcon} alt="" style={{ width: '24px', height: '24px' }} />
            <h2
              id={panelTitleId}
              style={{ fontSize: '18px', fontWeight: 510, color: '#454545', margin: 0 }}
            >
              Audit Trails
            </h2>
          </header>

          {activityLoading ? (
            <div role="status" style={{ fontSize: '14px', color: '#797979' }}>
              Loading audit history...
            </div>
          ) : activityError ? (
            <div role="alert" style={{ fontSize: '14px', color: '#C83A2D' }}>
              Could not load audit history.
            </div>
          ) : documentActivity.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
                padding: '40px 20px',
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
                <img src={auditArrowTurnIcon} alt="" style={{ width: '28px', height: '28px' }} />
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
                No Trails yet
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
            <ul aria-label="Document activity" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {documentActivity.map((activity) => {
                const actor = activity.user_name || activity.user_email || 'System'
                const detail = getActivityDetail(activity.details)
                const isSelected = selectedActivity?.id === activity.id
                const triggerId = `${detailIdPrefix}-trigger-${activity.id}`
                const detailId = `${detailIdPrefix}-detail-${activity.id}`
                const hasEditDetails =
                  activity.edit_details &&
                  (activity.edit_details.deleted_text || activity.edit_details.inserted_text)

                return (
                  <li
                    key={activity.id}
                    style={{
                      borderBottom: '1px solid #EDEDED',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#F5F5F5' : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <button
                      id={triggerId}
                      type="button"
                      aria-expanded={isSelected}
                      aria-controls={detailId}
                      onClick={() => setSelectedActivity(isSelected ? null : activity)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '13px 12px',
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: getAvatarColor(activity.user_id || actor),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '10px',
                          fontWeight: 590,
                          color: '#FFFFFF',
                        }}
                      >
                        {getInitials(activity.user_name, activity.user_email)}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 590,
                              color: '#454545',
                              letterSpacing: '-0.4px',
                            }}
                          >
                            {formatActivityAction(activity.action)}
                          </span>
                          {activity.favorability && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '999px',
                                backgroundColor:
                                  activity.favorability === 'favorable'
                                    ? '#EAF6EC'
                                    : activity.favorability === 'unfavorable'
                                      ? '#FDECEA'
                                      : '#F7F7F7',
                                color:
                                  activity.favorability === 'favorable'
                                    ? '#2F7D32'
                                    : activity.favorability === 'unfavorable'
                                      ? '#C83A2D'
                                      : '#666666',
                              }}
                            >
                              {activity.favorability === 'favorable'
                                ? 'Favorable'
                                : activity.favorability === 'unfavorable'
                                  ? 'Unfavorable'
                                  : 'Neutral'}
                            </span>
                          )}
                          <span style={{ fontSize: '12px', color: '#999999' }}>
                            {formatRelativeTime(activity.created_at)}
                          </span>
                        </span>
                        <span style={{ fontSize: '13px', color: '#666666', lineHeight: '18px' }}>
                          {actor}
                          {detail ? ` - ${detail}` : ''}
                        </span>
                      </span>
                    </button>

                    {isSelected && (
                      <div
                        id={detailId}
                        role="region"
                        aria-labelledby={triggerId}
                        style={{
                          margin: '0 12px 13px 50px',
                          padding: '12px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #EDEDED',
                        }}
                      >
                        {activity.favorability_explanation && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666666',
                              marginBottom: hasEditDetails ? '12px' : '0',
                              fontStyle: 'italic',
                            }}
                          >
                            {activity.favorability_explanation}
                          </div>
                        )}

                        {hasEditDetails && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            {activity.edit_details?.deleted_text && (
                              <div
                                style={{
                                  padding: '8px 10px',
                                  backgroundColor: '#FDECEA',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  color: '#C83A2D',
                                  textDecoration: 'line-through',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {activity.edit_details.deleted_text}
                              </div>
                            )}
                            {activity.edit_details?.inserted_text && (
                              <div
                                style={{
                                  padding: '8px 10px',
                                  backgroundColor: '#EAF6EC',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  color: '#2F7D32',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {activity.edit_details.inserted_text}
                              </div>
                            )}
                            {activity.edit_details?.reason && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#666666',
                                  marginTop: '4px',
                                }}
                              >
                                <strong>Reason:</strong> {activity.edit_details.reason}
                              </div>
                            )}
                          </div>
                        )}

                        {!hasEditDetails && !activity.favorability_explanation && (
                          <div style={{ fontSize: '12px', color: '#999999' }}>
                            No additional details available for this activity.
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
