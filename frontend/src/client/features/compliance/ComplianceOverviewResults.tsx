import type { ComplianceResults } from './complianceModels'
import { complianceFontFamily } from './compliancePresentation'

interface ComplianceOverviewResultsProps {
  results: ComplianceResults | null
}

export function ComplianceOverviewResults({ results }: ComplianceOverviewResultsProps) {
  const cards = [
    {
      label: 'Compliance Score',
      value:
        results?.complianceScore === null || results?.complianceScore === undefined
          ? 'Not scored'
          : `${results.complianceScore}%`,
      width: '234px',
    },
    {
      label: 'Critical Issues',
      value:
        results?.criticalIssues === undefined
          ? '—'
          : String(results.criticalIssues).padStart(2, '0'),
      width: '235px',
    },
    {
      label: 'Pending Items',
      value:
        results?.pendingItems === undefined ? '—' : String(results.pendingItems).padStart(2, '0'),
      width: '234px',
    },
    {
      label: 'Resolved Issues',
      value:
        results?.resolvedIssues === undefined
          ? '—'
          : String(results.resolvedIssues).padStart(2, '0'),
      width: '234px',
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'flex-start',
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            width: card.width,
            backgroundColor: '#F5F5F5',
            padding: '11px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflow: 'hidden',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              fontFamily: complianceFontFamily,
            }}
          >
            {card.label}
          </p>
          <div
            style={{
              height: '46px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '41px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-2.05px',
                lineHeight: '16px',
                fontFamily: complianceFontFamily,
              }}
            >
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
