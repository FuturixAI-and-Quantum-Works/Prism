import courseIcon from '../../assets/analysis/course-icon.svg'
import warningIcon from '../../assets/analysis/warning-icon.svg'
import clockIcon from '../../assets/analysis/clock-icon.svg'
import highRiskIcon from '../../assets/analysis/high-risk-icon.png'
import riskFilledIcon from '../../assets/analysis/risk-filled-icon.svg'
import riskOutlineIcon from '../../assets/analysis/risk-outline-icon.svg'
import arrowDownIcon from '../../assets/analysis/arrow-down-icon.svg'
import {
  formatHighRiskCount,
  type AnalysisResultState,
  type AnalysisRisk,
  type AnalysisTab,
} from './analysisModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const loadingMessages: Record<AnalysisTab, string> = {
  summaries: 'Analyzing documents...',
  risks: 'Analyzing risks...',
  'clause-analysis': 'Analyzing clauses...',
}

const emptyAnalysisContent: Record<
  Exclude<AnalysisTab, 'risks'>,
  { description: string; icon: string; title: string }
> = {
  summaries: {
    description: 'Click the button below to analyze your documents and generate summaries.',
    icon: courseIcon,
    title: 'No summaries yet',
  },
  'clause-analysis': {
    description: 'Click the button below to analyze key clauses in your documents.',
    icon: clockIcon,
    title: 'No clause analysis yet',
  },
}

interface AnalysisPresentationProps {
  state: AnalysisResultState
  expandedRisk: string | null
  onToggleRisk: (riskId: string) => void
  onRequestAnalysis?: () => void
}

export function AnalysisPresentation({
  state,
  expandedRisk,
  onToggleRisk,
  onRequestAnalysis,
}: AnalysisPresentationProps) {
  switch (state.kind) {
    case 'loading':
      return <LoadingResult tab={state.tab} />
    case 'error':
      return <ErrorResult message={state.message} onRequestAnalysis={onRequestAnalysis} />
    case 'unrequested':
      return <UnrequestedResult onRequestAnalysis={onRequestAnalysis} />
    case 'analyzed-empty':
      return <AnalyzedEmptyResult tab={state.tab} onRequestAnalysis={onRequestAnalysis} />
    case 'risks':
      return (
        <RiskResults
          risks={state.risks}
          highRiskCount={state.highRiskCount}
          expandedRisk={expandedRisk}
          onToggleRisk={onToggleRisk}
        />
      )
    case 'summaries':
      return (
        <div style={{ padding: '16px' }}>
          {state.summaries.map((summary) => (
            <div
              key={summary.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #EDEDED',
                padding: '16px',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#272727',
                  fontFamily,
                }}
              >
                {summary.documentName}
              </h3>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  color: '#454545',
                  fontFamily,
                  lineHeight: '1.5',
                }}
              >
                {summary.purpose}
              </p>
              {summary.mainPoints.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {summary.mainPoints.map((point, idx) => (
                    <li
                      key={idx}
                      style={{
                        fontSize: '14px',
                        color: '#666',
                        fontFamily,
                        marginBottom: '4px',
                      }}
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )
    case 'clauses':
      return (
        <div style={{ padding: '16px' }}>
          {state.clauses.map((clause) => (
            <div
              key={clause.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #EDEDED',
                padding: '16px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 510,
                    color: '#272727',
                    fontFamily,
                  }}
                >
                  {clause.title}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 510,
                    color: '#666',
                    backgroundColor: '#F7F7F7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily,
                  }}
                >
                  {clause.type}
                </span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#999', fontFamily }}>
                From: {clause.documentName}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#454545',
                  fontFamily,
                  lineHeight: '1.5',
                }}
              >
                {clause.content}
              </p>
            </div>
          ))}
        </div>
      )
  }

  const unhandledState: never = state
  return unhandledState
}

function LoadingResult({ tab }: { tab: AnalysisTab }) {
  return (
    <div role="status" aria-live="polite" style={{ padding: '40px', textAlign: 'center' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#F36A33',
            animation: 'bounce 1.4s ease-in-out infinite',
          }}
        />
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#F36A33',
            animation: 'bounce 1.4s ease-in-out 0.2s infinite',
          }}
        />
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#F36A33',
            animation: 'bounce 1.4s ease-in-out 0.4s infinite',
          }}
        />
      </div>
      <p style={{ fontFamily, fontSize: '16px', color: '#454545' }}>{loadingMessages[tab]}</p>
    </div>
  )
}

function ErrorResult({
  message,
  onRequestAnalysis,
}: {
  message: string
  onRequestAnalysis?: () => void
}) {
  return (
    <div role="alert" style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ marginBottom: '16px' }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#DC2626"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p
        style={{
          fontFamily,
          fontSize: '16px',
          fontWeight: 510,
          color: '#DC2626',
          margin: '0 0 8px',
        }}
      >
        Analysis failed
      </p>
      <p style={{ fontFamily, fontSize: '14px', color: '#666', margin: '0 0 20px' }}>{message}</p>
      {onRequestAnalysis && (
        <button
          type="button"
          onClick={onRequestAnalysis}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F36A33',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 510,
            cursor: 'pointer',
            fontFamily,
          }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}

function UnrequestedResult({ onRequestAnalysis }: { onRequestAnalysis?: () => void }) {
  return (
    <div role="status" aria-live="polite" style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ marginBottom: '16px' }}>
        <img src={warningIcon} alt="" style={{ width: '48px', height: '48px', opacity: 0.5 }} />
      </div>
      <p
        style={{
          fontFamily,
          fontSize: '16px',
          fontWeight: 510,
          color: '#454545',
          margin: '0 0 8px',
        }}
      >
        No risks analyzed yet
      </p>
      <p style={{ fontFamily, fontSize: '14px', color: '#999', margin: '0 0 20px' }}>
        Click the button below to analyze your documents for potential risks.
      </p>
      {onRequestAnalysis && (
        <button
          type="button"
          onClick={onRequestAnalysis}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F36A33',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 510,
            cursor: 'pointer',
            fontFamily,
          }}
        >
          Generate Analysis
        </button>
      )}
    </div>
  )
}

function AnalyzedEmptyResult({
  tab,
  onRequestAnalysis,
}: {
  tab: AnalysisTab
  onRequestAnalysis?: () => void
}) {
  if (tab === 'risks') {
    return (
      <div role="status" aria-live="polite" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l2 2 4-4" />
          </svg>
        </div>
        <p
          style={{
            fontFamily,
            fontSize: '16px',
            fontWeight: 510,
            color: '#22C55E',
            margin: '0 0 8px',
          }}
        >
          No risks identified
        </p>
        <p style={{ fontFamily, fontSize: '14px', color: '#666', margin: 0 }}>
          The analysis did not identify any significant risks in your documents.
        </p>
      </div>
    )
  }

  const content = emptyAnalysisContent[tab]
  return (
    <div role="status" aria-live="polite" style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ marginBottom: '16px' }}>
        <img src={content.icon} alt="" style={{ width: '48px', height: '48px', opacity: 0.5 }} />
      </div>
      <p
        style={{
          fontFamily,
          fontSize: '16px',
          fontWeight: 510,
          color: '#454545',
          margin: '0 0 8px',
        }}
      >
        {content.title}
      </p>
      <p style={{ fontFamily, fontSize: '14px', color: '#999', margin: '0 0 20px' }}>
        {content.description}
      </p>
      {onRequestAnalysis && (
        <button
          type="button"
          onClick={onRequestAnalysis}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F36A33',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 510,
            cursor: 'pointer',
            fontFamily,
          }}
        >
          Generate Analysis
        </button>
      )}
    </div>
  )
}

function RiskResults({
  risks,
  highRiskCount,
  expandedRisk,
  onToggleRisk,
}: {
  risks: AnalysisRisk[]
  highRiskCount: number
  expandedRisk: string | null
  onToggleRisk: (riskId: string) => void
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px',
          backgroundColor: 'white',
          borderBottom: '1px solid #EDEDED',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <img src={highRiskIcon} alt="" style={{ width: '23px', height: '23px' }} />
          <span
            style={{
              fontSize: '18px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.9px',
              lineHeight: '21px',
              fontFamily,
            }}
          >
            High Risk ({formatHighRiskCount(highRiskCount)})
          </span>
        </div>
      </div>

      {risks.map((risk) => (
        <RiskDisclosureCard
          key={risk.id}
          risk={risk}
          isExpanded={expandedRisk === risk.id}
          onToggle={onToggleRisk}
        />
      ))}
    </>
  )
}

function RiskDisclosureCard({
  risk,
  isExpanded,
  onToggle,
}: {
  risk: AnalysisRisk
  isExpanded: boolean
  onToggle: (riskId: string) => void
}) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderBottom: '0.5px solid #EDEDED',
        padding: '20px',
      }}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={`analysis-risk-${risk.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          width: '100%',
          padding: 0,
          border: 'none',
          backgroundColor: 'transparent',
          textAlign: 'left',
        }}
        onClick={() => onToggle(risk.id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              width: '187px',
            }}
          >
            <img
              src={risk.severity === 'high' ? riskFilledIcon : riskOutlineIcon}
              alt=""
              style={{ width: '19px', height: '19px' }}
            />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                fontFamily,
              }}
            >
              {risk.title}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '24px',
              padding: '4px 10px',
              backgroundColor: '#F7F7F7',
              borderRadius: '26px',
              minWidth: '88px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 510,
                color: '#999999',
                letterSpacing: '-0.6px',
                lineHeight: '16px',
                fontFamily,
              }}
            >
              {risk.category}
            </span>
          </div>
        </div>
        <img
          src={arrowDownIcon}
          alt=""
          style={{
            width: '24px',
            height: '24px',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {isExpanded && risk.description && (
        <div id={`analysis-risk-${risk.id}`} style={{ marginTop: '9px' }}>
          <p
            style={{
              fontSize: '16px',
              fontWeight: 400,
              color: '#454545',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              fontFamily,
              margin: 0,
            }}
          >
            {risk.description}
          </p>
        </div>
      )}
    </div>
  )
}
