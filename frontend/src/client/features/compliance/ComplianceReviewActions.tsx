import { useEffect, useRef } from 'react'
import continueAnalysisIcon from '../../assets/compliance/continue-analysis-icon.svg'
import packageOpenIcon from '../../assets/compliance/package-open-icon.svg'
import trashIcon from '../../assets/compliance/trash-icon.svg'
import {
  complianceFontFamily,
  handlePopupKeyDown,
  type PopupCloseReason,
} from './compliancePresentation'
import type { ComplianceListAction } from './reviewListModel'

interface ComplianceReviewActionsProps {
  action: ComplianceListAction | null
  onClose: () => void
  onOpenReview: ComplianceListActionHandler
  onDelete: ComplianceListActionHandler
}

type ComplianceListActionHandler = (action: ComplianceListAction) => void | Promise<void>

export function ComplianceReviewActions({
  action,
  onClose,
  onOpenReview,
  onDelete,
}: ComplianceReviewActionsProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!action) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
        requestAnimationFrame(() => action.trigger?.focus())
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    })
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [action, onClose])

  if (!action) return null

  const closeAndRestoreFocus = () => {
    onClose()
    requestAnimationFrame(() => action.trigger?.focus())
  }
  const closeFromKeyboard = (reason: PopupCloseReason) => {
    onClose()
    if (reason === 'escape') requestAnimationFrame(() => action.trigger?.focus())
  }
  const invoke = async (handler: ComplianceListActionHandler) => {
    await handler(action)
    closeAndRestoreFocus()
  }

  const items = [
    {
      icon: packageOpenIcon,
      label: 'Open Review',
      rotate: action.kind === 'context' ? 180 : undefined,
      run: () => invoke(onOpenReview),
    },
    {
      icon: continueAnalysisIcon,
      label: 'Continue Analysis',
      rotate: -90,
      run: () => invoke(onOpenReview),
    },
    { icon: trashIcon, label: 'Delete', run: () => invoke(onDelete), destructive: true },
  ]

  return (
    <div
      id={action.kind === 'menu' ? 'compliance-row-action-menu' : 'compliance-context-menu'}
      ref={menuRef}
      data-context-menu={action.kind === 'context' ? true : undefined}
      role="menu"
      aria-label={`Actions for ${action.document.name}`}
      onKeyDown={(event) => handlePopupKeyDown(event, '[role="menuitem"]', closeFromKeyboard)}
      style={{
        position: 'fixed',
        top: action.position.top,
        left: action.position.left,
        backgroundColor: '#FFFFFF',
        border: '1px solid #F7F7F7',
        borderRadius: '8px',
        boxShadow: '0px 0px 15.3px 0px rgba(0, 0, 0, 0.12)',
        padding: '4px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        overflow: 'hidden',
        minWidth: '160px',
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={item.run}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '40px',
            padding: '8px',
            backgroundColor: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            fontFamily: complianceFontFamily,
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = item.destructive ? '#FEF2F2' : '#F7F7F7'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = '#FFFFFF'
          }}
        >
          <img
            src={item.icon}
            alt=""
            style={{
              width: '16px',
              height: '16px',
              transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined,
            }}
          />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: item.destructive ? '#E53935' : '#454545',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}
