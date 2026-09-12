import { useId, useState } from 'react'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export interface InsightItem {
  title: string
  category: string
  description: string
  severity?: 'high' | 'medium' | 'low'
  recommendation?: string
}

interface InsightDropdownProps {
  insight: InsightItem
  onFixClauses?: () => void
  onAskPrism?: () => void
  defaultExpanded?: boolean
}

function WarningIcon({ color = '#CF5D5D' }: { color?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 18.333C14.6024 18.333 18.3333 14.6021 18.3333 9.99967C18.3333 5.39729 14.6024 1.66634 10 1.66634C5.39763 1.66634 1.66667 5.39729 1.66667 9.99967C1.66667 14.6021 5.39763 18.333 10 18.333Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 6.66634V10.833"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 13.333H10.0083"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="#999999"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function InsightDropdown({
  insight,
  onFixClauses,
  onAskPrism,
  defaultExpanded = false,
}: InsightDropdownProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const headingId = useId()
  const contentId = useId()

  const iconColor =
    insight.severity === 'high' ? '#CF5D5D' : insight.severity === 'medium' ? '#D97706' : '#3B82F6'

  return (
    <div
      style={{
        borderRadius: '8px',
        border: '1px solid #EDEDED',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
    >
      <button
        id={headingId}
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          cursor: 'pointer',
          backgroundColor: expanded ? '#FAFAFA' : '#fff',
          transition: 'background-color 0.15s ease',
          border: 'none',
          width: '100%',
          textAlign: 'left',
          fontFamily,
        }}
      >
        <WarningIcon color={iconColor} />

        <span
          style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: 500,
            color: '#454545',
            fontFamily,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {insight.title}
        </span>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#999999',
            backgroundColor: '#F7F7F7',
            padding: '4px 10px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
        >
          {insight.category}
        </span>

        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={headingId}
          style={{
            padding: '0 16px 16px 48px',
            backgroundColor: '#fff',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              lineHeight: '20px',
              color: '#CF5D5D',
              margin: '0 0 16px 0',
              fontFamily,
            }}
          >
            {insight.description}
          </p>

          {insight.recommendation && (
            <p
              style={{
                fontSize: '12px',
                lineHeight: '18px',
                color: '#6B7280',
                margin: '0 0 16px 0',
                fontStyle: 'italic',
                fontFamily,
              }}
            >
              Recommendation: {insight.recommendation}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {onFixClauses && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onFixClauses()
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#454545',
                  backgroundColor: '#F7F7F7',
                  border: '1px solid #EDEDED',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFEFEF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F7F7F7'
                }}
              >
                Fix the clauses
              </button>
            )}

            {onAskPrism && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAskPrism()
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#fff',
                  backgroundColor: '#272727',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3a3a3a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#272727'
                }}
              >
                Ask prism
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
