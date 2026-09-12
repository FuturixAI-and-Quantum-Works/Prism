import { useEffect, useRef, useState } from 'react'
import dangerBoldIcon from '../../assets/docs-compliance/danger-bold-icon.svg'
import starInsightsIcon from '../../assets/docs-compliance/star-insights-icon.svg'
import type { RuleResult } from './complianceModels'
import {
  complianceFontFamily,
  handlePopupKeyDown,
  type PopupCloseReason,
} from './compliancePresentation'

interface ComplianceRiskResultsProps {
  results: RuleResult[]
  insights: string[]
  isRunning: boolean
}

interface ResultMenu {
  resultId: string
  x: number
  y: number
  trigger: HTMLButtonElement | null
}

export function ComplianceRiskResults({
  results,
  insights,
  isRunning,
}: ComplianceRiskResultsProps) {
  const [menu, setMenu] = useState<ResultMenu | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null)
    }
    document.addEventListener('click', closeOnOutsideClick)
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    })
    return () => document.removeEventListener('click', closeOnOutsideClick)
  }, [menu])

  const openMenu = (resultId: string, x: number, y: number, trigger: HTMLButtonElement | null) =>
    setMenu({ resultId, x, y, trigger })

  const closeMenu = (restoreFocus = true) => {
    const trigger = menu?.trigger
    setMenu(null)
    if (restoreFocus) requestAnimationFrame(() => trigger?.focus())
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: '1px solid #EDEDED',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={dangerBoldIcon} alt="" style={{ width: '20px', height: '20px' }} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 590,
                color: '#171717',
                letterSpacing: '-0.7px',
                fontFamily: complianceFontFamily,
              }}
            >
              RISK
            </span>
          </div>
        </div>

        {results.length > 0 ? (
          results.map((result) => (
            <div
              key={result.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 0',
                borderBottom: '1px solid #EDEDED',
                backgroundColor: result.status === 'compliant' ? '#F0FDF4' : 'transparent',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    result.status === 'compliant'
                      ? '#22C55E'
                      : result.status === 'non_compliant'
                        ? '#EF4444'
                        : result.status === 'partial'
                          ? '#F59E0B'
                          : '#9CA3AF',
                  marginRight: '12px',
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#454545',
                  letterSpacing: '-0.7px',
                  lineHeight: '20px',
                  fontFamily: complianceFontFamily,
                  flex: 1,
                  paddingRight: '16px',
                  textDecoration: result.status === 'compliant' ? 'line-through' : 'none',
                  opacity: result.status === 'compliant' ? 0.6 : 1,
                }}
              >
                {result.summary ||
                  'May create excessive legal and operational exposure in the event of contractual disputes or damages.'}
              </p>
              <button
                type="button"
                aria-label={`Actions for ${result.summary || 'risk item'}`}
                aria-haspopup="menu"
                aria-expanded={menu?.resultId === result.id}
                aria-controls="risk-result-context-menu"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  openMenu(result.id, rect.right, rect.bottom, event.currentTarget)
                }}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="#999999"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: '#999999',
              fontSize: '14px',
              fontFamily: complianceFontFamily,
            }}
          >
            {isRunning
              ? 'Analyzing risks...'
              : 'No risk items found. Run the compliance check to generate results.'}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '16px 0 12px',
            borderBottom: '1px solid #EDEDED',
            marginTop: '8px',
          }}
        >
          <img src={starInsightsIcon} alt="" style={{ width: '14px', height: '14px' }} />
          <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>AI insights</span>
        </div>
        <div style={{ padding: '16px 0' }}>
          {insights.length > 0 ? (
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {insights.map((insight, index) => (
                <li
                  key={index}
                  style={{
                    fontSize: '14px',
                    color: '#454545',
                    letterSpacing: '-0.7px',
                    lineHeight: '22px',
                    fontFamily: complianceFontFamily,
                  }}
                >
                  {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: '14px', color: '#999999' }}>
              {isRunning
                ? 'Generating insights...'
                : 'No AI insights available. Run the compliance check to generate insights.'}
            </p>
          )}
        </div>
      </div>

      {menu && (
        <ResultActionMenu
          menu={menu}
          menuRef={menuRef}
          result={results.find((result) => result.id === menu.resultId)}
          onClose={closeMenu}
        />
      )}
    </>
  )
}

function ResultActionMenu({
  menu,
  menuRef,
  result,
  onClose,
}: {
  menu: ResultMenu
  menuRef: React.RefObject<HTMLDivElement | null>
  result: RuleResult | undefined
  onClose: (restoreFocus?: boolean) => void
}) {
  if (!result) return null

  return (
    <div
      id="risk-result-context-menu"
      ref={menuRef}
      data-context-menu
      role="menu"
      aria-label="Risk result actions"
      onKeyDown={(event) =>
        handlePopupKeyDown(event, '[role="menuitem"]', (reason: PopupCloseReason) =>
          onClose(reason === 'escape'),
        )
      }
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        backgroundColor: '#FFFFFF',
        border: '1px solid #EDEDED',
        borderRadius: '8px',
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
        zIndex: 1000,
        minWidth: '180px',
        overflow: 'hidden',
        fontFamily: complianceFontFamily,
      }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          void navigator.clipboard.writeText(result.summary)
          onClose()
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
          fontFamily: complianceFontFamily,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = '#F5F5F5'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="#454545" strokeWidth="1.5" />
          <path
            d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5"
            stroke="#454545"
            strokeWidth="1.5"
          />
        </svg>
        Copy text
      </button>
    </div>
  )
}
