import type {
  ClauseValidation,
  ComplianceActivity,
  ComplianceRecommendation,
} from './complianceModels'
import { complianceFontFamily } from './compliancePresentation'

export function ClauseValidationResults({ clauses }: { clauses: ClauseValidation[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ResultHeading title="Clause Validation" count={`${clauses.length} clauses analyzed`} />
      {clauses.length === 0 ? (
        <EmptyResult>
          No clause validations available. Run compliance check to analyze clauses.
        </EmptyResult>
      ) : (
        clauses.map((clause) => (
          <div
            key={clause.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px',
              backgroundColor:
                clause.status === 'valid'
                  ? '#F0FDF4'
                  : clause.status === 'warning'
                    ? '#FFFBEB'
                    : '#FEF2F2',
              borderRadius: '8px',
              border: `1px solid ${
                clause.status === 'valid'
                  ? '#BBF7D0'
                  : clause.status === 'warning'
                    ? '#FDE68A'
                    : '#FECACA'
              }`,
            }}
          >
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor:
                  clause.status === 'valid'
                    ? '#22C55E'
                    : clause.status === 'warning'
                      ? '#F59E0B'
                      : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ClauseStatusIcon status={clause.status} />
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: '0 0 4px',
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#272727',
                  fontFamily: complianceFontFamily,
                }}
              >
                {clause.clause}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#797979',
                  fontFamily: complianceFontFamily,
                  lineHeight: '18px',
                }}
              >
                {clause.details}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ClauseStatusIcon({ status }: { status: ClauseValidation['status'] }) {
  if (status === 'valid') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M3 7L6 10L11 4"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (status === 'warning') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 4V7M7 10H7.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 4L10 10M10 4L4 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function RecommendationResults({
  recommendations,
}: {
  recommendations: ComplianceRecommendation[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ResultHeading title="Recommendations" count={`${recommendations.length} suggestions`} />
      {recommendations.length === 0 ? (
        <EmptyResult>
          No recommendations available. Run compliance check to get suggestions.
        </EmptyResult>
      ) : (
        recommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            style={{
              padding: '16px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #EDEDED',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
            >
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 590,
                  backgroundColor:
                    recommendation.priority === 'high'
                      ? '#FEE2E2'
                      : recommendation.priority === 'medium'
                        ? '#FEF3C7'
                        : '#DCFCE7',
                  color:
                    recommendation.priority === 'high'
                      ? '#DC2626'
                      : recommendation.priority === 'medium'
                        ? '#D97706'
                        : '#16A34A',
                  fontFamily: complianceFontFamily,
                }}
              >
                {recommendation.priority.toUpperCase()}
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 590,
                  color: '#272727',
                  fontFamily: complianceFontFamily,
                }}
              >
                {recommendation.title}
              </p>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#454545',
                fontFamily: complianceFontFamily,
                lineHeight: '20px',
              }}
            >
              {recommendation.description}
            </p>
          </div>
        ))
      )}
    </div>
  )
}

export function ActivityResults({ activity }: { activity: ComplianceActivity[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <ResultHeading title="Activity Log" count={`${activity.length} events`} />
      {activity.length === 0 ? (
        <EmptyResult>
          No activity recorded yet. Activity will appear here after running compliance checks.
        </EmptyResult>
      ) : (
        activity.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 0',
              borderBottom: '1px solid #F3F3F3',
            }}
          >
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#F0EBFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 4V8L10.5 9.5M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
                  stroke="#7C3AED"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#272727',
                  fontFamily: complianceFontFamily,
                }}
              >
                {entry.action}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: '#797979',
                  fontFamily: complianceFontFamily,
                }}
              >
                {entry.user} • {entry.timestamp}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ResultHeading({ title, count }: { title: string; count: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 590,
          color: '#171717',
          fontFamily: complianceFontFamily,
        }}
      >
        {title}
      </p>
      <span style={{ fontSize: '13px', color: '#797979', fontFamily: complianceFontFamily }}>
        {count}
      </span>
    </div>
  )
}

function EmptyResult({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#999999',
        fontSize: '14px',
        fontFamily: complianceFontFamily,
      }}
    >
      {children}
    </div>
  )
}
