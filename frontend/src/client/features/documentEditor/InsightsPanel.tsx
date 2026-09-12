import { useId, useState } from 'react'
import type { DocumentRisk } from '../documents/documentsApi'
import InsightDropdown from '../../components/InsightDropdown'
import insightsStackTop from '../../assets/insights/stack-top.svg'
import insightsStackMiddle from '../../assets/insights/stack-middle.svg'
import insightsStackBottom from '../../assets/insights/stack-bottom.svg'
import insightsLightbulbIcon from '../../assets/insights/lightbulb-icon.svg'
import historyArrowDownIcon from '../../assets/history/arrow-down-icon.svg'
import type { DocumentInsightsModel } from './useDocumentInsights'

interface InsightsPanelProps {
  active: boolean
  documentId: string | undefined
  model: DocumentInsightsModel
  onAskPrism: (prompt: string) => void
  onFixRisk: (risk: DocumentRisk) => void
}

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export function InsightsPanel({
  active,
  documentId,
  model,
  onAskPrism,
  onFixRisk,
}: InsightsPanelProps) {
  const sectionIdPrefix = useId()
  const [mainDocInsightExpanded, setMainDocInsightExpanded] = useState(true)
  const [contextInsightsExpanded, setContextInsightsExpanded] = useState<Record<string, boolean>>(
    {},
  )
  const { data: insightsData, error: insightsError, isLoading: isLoadingInsights } = model

  return (
    <>
      {active && (
        <section
          aria-label="Document insights"
          aria-busy={isLoadingInsights}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {isLoadingInsights && (
            <div
              role="status"
              aria-live="polite"
              style={{
                flex: 1,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '90px',
                  height: '76px',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                    width: '70px',
                  }}
                >
                  <img src={insightsStackTop} alt="" style={{ width: '70px', height: '24.7px' }} />
                  <img
                    src={insightsStackMiddle}
                    alt=""
                    style={{
                      width: '65.7px',
                      height: '13.95px',
                      transform: 'scaleY(-1) rotate(180deg)',
                    }}
                  />
                  <img
                    src={insightsStackBottom}
                    alt=""
                    style={{ width: '65.7px', height: '13.95px' }}
                  />
                </div>
                <img
                  src={insightsLightbulbIcon}
                  alt=""
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '21px',
                    height: '23px',
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#272727',
                  letterSpacing: '-0.8px',
                  margin: 0,
                  fontFamily,
                }}
              >
                Generating insights...
              </p>
              <p style={{ fontSize: '14px', color: '#999999', margin: 0, fontFamily }}>
                Analyzing your documents
              </p>
            </div>
          )}

          {insightsError && !isLoadingInsights && (
            <div
              role="alert"
              style={{
                flex: 1,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#C83A2D',
                  margin: 0,
                  fontFamily,
                }}
              >
                Failed to generate insights
              </p>
              <button
                type="button"
                onClick={() => {
                  if (documentId) void model.refresh()
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#272727',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 510,
                  cursor: 'pointer',
                  fontFamily,
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!isLoadingInsights && !insightsError && insightsData && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {insightsData.mainDocument && (
                <div
                  style={{
                    marginBottom: '12px',
                    borderRadius: '10px',
                    border: '1px solid #EDEDED',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    id={`${sectionIdPrefix}-main-trigger`}
                    type="button"
                    aria-expanded={mainDocInsightExpanded}
                    aria-controls={`${sectionIdPrefix}-main-content`}
                    onClick={() => setMainDocInsightExpanded(!mainDocInsightExpanded)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#FAFAFA',
                      cursor: 'pointer',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily,
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#F36A33',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 510,
                          color: '#454545',
                          letterSpacing: '-0.7px',
                          fontFamily,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {insightsData.mainDocument.filename}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#999',
                          backgroundColor: '#EDEDED',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          flexShrink: 0,
                        }}
                      >
                        Current
                      </span>
                    </span>
                    <img
                      src={historyArrowDownIcon}
                      alt=""
                      style={{
                        width: '20px',
                        height: '20px',
                        transform: mainDocInsightExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                  {mainDocInsightExpanded && (
                    <div
                      id={`${sectionIdPrefix}-main-content`}
                      role="region"
                      aria-labelledby={`${sectionIdPrefix}-main-trigger`}
                      style={{ padding: '12px 16px', backgroundColor: '#fff' }}
                    >
                      <div style={{ marginBottom: '16px' }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#999',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px',
                            fontFamily,
                          }}
                        >
                          Summary
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                          {insightsData.mainDocument.summary.map((point, idx) => (
                            <li
                              key={idx}
                              style={{
                                fontSize: '13px',
                                color: '#454545',
                                lineHeight: '20px',
                                marginBottom: '8px',
                                fontFamily,
                              }}
                            >
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {insightsData.mainDocument.risks &&
                        insightsData.mainDocument.risks.length > 0 && (
                          <div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#999',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '10px',
                                fontFamily,
                              }}
                            >
                              Risk Analysis
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              {insightsData.mainDocument.risks.map((risk, idx) => (
                                <InsightDropdown
                                  key={idx}
                                  insight={{
                                    title: risk.title,
                                    category:
                                      risk.severity.charAt(0).toUpperCase() +
                                      risk.severity.slice(1),
                                    description: risk.description,
                                    severity: risk.severity,
                                    recommendation: risk.recommendation,
                                  }}
                                  onFixClauses={() => onFixRisk(risk)}
                                  onAskPrism={() => {
                                    onAskPrism(
                                      `Help me understand and address this risk: "${risk.title}" - ${risk.description}`,
                                    )
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {insightsData.contextFiles.map((contextFile, contextIndex) => {
                const isExpanded = contextInsightsExpanded[contextFile.id] ?? false
                const triggerId = `${sectionIdPrefix}-context-${contextIndex}-trigger`
                const contentId = `${sectionIdPrefix}-context-${contextIndex}-content`
                return (
                  <div
                    key={contextFile.id}
                    style={{
                      marginBottom: '12px',
                      borderRadius: '10px',
                      border: '1px solid #EDEDED',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      id={triggerId}
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={contentId}
                      onClick={() =>
                        setContextInsightsExpanded((prev) => ({
                          ...prev,
                          [contextFile.id]: !prev[contextFile.id],
                        }))
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        backgroundColor: '#FAFAFA',
                        cursor: 'pointer',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        fontFamily,
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#0094FA',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 510,
                            color: '#454545',
                            letterSpacing: '-0.7px',
                            fontFamily,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {contextFile.filename}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#999',
                            backgroundColor: '#EDEDED',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        >
                          Context
                        </span>
                      </span>
                      <img
                        src={historyArrowDownIcon}
                        alt=""
                        style={{
                          width: '20px',
                          height: '20px',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>
                    {isExpanded && (
                      <div
                        id={contentId}
                        role="region"
                        aria-labelledby={triggerId}
                        style={{ padding: '12px 16px', backgroundColor: '#fff' }}
                      >
                        <div style={{ marginBottom: '16px' }}>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#999',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '8px',
                              fontFamily,
                            }}
                          >
                            Summary
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: '20px',
                              listStyleType: 'disc',
                            }}
                          >
                            {contextFile.summary.map((point, idx) => (
                              <li
                                key={idx}
                                style={{
                                  fontSize: '13px',
                                  color: '#454545',
                                  lineHeight: '20px',
                                  marginBottom: '8px',
                                  fontFamily,
                                }}
                              >
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {contextFile.risks && contextFile.risks.length > 0 && (
                          <div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#999',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '10px',
                                fontFamily,
                              }}
                            >
                              Risk Analysis
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              {contextFile.risks.map((risk, idx) => (
                                <InsightDropdown
                                  key={idx}
                                  insight={{
                                    title: risk.title,
                                    category:
                                      risk.severity.charAt(0).toUpperCase() +
                                      risk.severity.slice(1),
                                    description: risk.description,
                                    severity: risk.severity,
                                    recommendation: risk.recommendation,
                                  }}
                                  onAskPrism={() => {
                                    onAskPrism(
                                      `Help me understand and address this risk from "${contextFile.filename}": "${risk.title}" - ${risk.description}`,
                                    )
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {insightsData.contextFiles.length === 0 && insightsData.mainDocument && (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#999', margin: 0, fontFamily }}>
                    Add context files in the Files panel to see more insights.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isLoadingInsights && !insightsError && !insightsData?.mainDocument && (
            <div
              role="status"
              style={{
                flex: 1,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '90px',
                  height: '76px',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                    width: '70px',
                  }}
                >
                  <img src={insightsStackTop} alt="" style={{ width: '70px', height: '24.7px' }} />
                  <img
                    src={insightsStackMiddle}
                    alt=""
                    style={{
                      width: '65.7px',
                      height: '13.95px',
                      transform: 'scaleY(-1) rotate(180deg)',
                    }}
                  />
                  <img
                    src={insightsStackBottom}
                    alt=""
                    style={{ width: '65.7px', height: '13.95px' }}
                  />
                </div>
                <img
                  src={insightsLightbulbIcon}
                  alt=""
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '21px',
                    height: '23px',
                  }}
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
                No insights available yet
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
                Open a document to generate AI insights and summaries.
              </p>
            </div>
          )}
        </section>
      )}
    </>
  )
}
