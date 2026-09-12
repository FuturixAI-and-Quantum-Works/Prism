import { useEffect, useRef, useState } from 'react'
import dotsHorizontalIcon from '../../assets/docs-compliance/dots-horizontal-icon.svg'
import plusIconBlue from '../../assets/docs-compliance/plus-icon-blue.svg'
import plusIconPurple from '../../assets/docs-compliance/plus-icon-purple.svg'
import questionIcon from '../../assets/docs-compliance/question-icon.svg'
import reviewRuleIcon from '../../assets/docs-compliance/review-rule-icon.svg'
import type { ReviewQuestion, ReviewRule } from './complianceModels'
import { complianceFontFamily, handlePopupKeyDown } from './compliancePresentation'

interface ComplianceParametersPanelProps {
  rules: ReviewRule[]
  questions: ReviewQuestion[]
  error: string | null
  onAddRule: () => void
  onAddQuestion: () => void
  onUpdateRule: (id: string, content: string) => void
  onUpdateQuestion: (id: string, content: string) => void
  onRemoveRule: (id: string) => void | Promise<void>
  onRemoveQuestion: (id: string) => void | Promise<void>
}

export function ComplianceParametersPanel({
  rules,
  questions,
  error,
  onAddRule,
  onAddQuestion,
  onUpdateRule,
  onUpdateQuestion,
  onRemoveRule,
  onRemoveQuestion,
}: ComplianceParametersPanelProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!openMenuId) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-parameter-menu]')) setOpenMenuId(null)
    }
    document.addEventListener('click', closeOnOutsideClick)
    return () => document.removeEventListener('click', closeOnOutsideClick)
  }, [openMenuId])

  if (rules.length === 0 && questions.length === 0 && !error) return null

  const closeMenu = () => {
    setOpenMenuId(null)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <section
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.9px',
          lineHeight: '21px',
          fontFamily: complianceFontFamily,
        }}
      >
        Parameters
      </p>
      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            color: '#B42318',
            fontSize: '13px',
          }}
        >
          {error}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        {rules.map((rule) => (
          <ParameterCard
            key={rule.id}
            kind="rule"
            item={rule}
            menuOpen={openMenuId === rule.id}
            onAdd={onAddRule}
            onUpdate={onUpdateRule}
            onRemove={onRemoveRule}
            onToggleMenu={(trigger) => {
              triggerRef.current = trigger
              setOpenMenuId(openMenuId === rule.id ? null : rule.id)
            }}
            onCloseMenu={closeMenu}
          />
        ))}
        {questions.map((question) => (
          <ParameterCard
            key={question.id}
            kind="question"
            item={question}
            menuOpen={openMenuId === question.id}
            onAdd={onAddQuestion}
            onUpdate={onUpdateQuestion}
            onRemove={onRemoveQuestion}
            onToggleMenu={(trigger) => {
              triggerRef.current = trigger
              setOpenMenuId(openMenuId === question.id ? null : question.id)
            }}
            onCloseMenu={closeMenu}
          />
        ))}
      </div>
    </section>
  )
}

type ParameterCardProps =
  | {
      kind: 'rule'
      item: ReviewRule
      menuOpen: boolean
      onAdd: () => void
      onUpdate: (id: string, content: string) => void
      onRemove: (id: string) => void | Promise<void>
      onToggleMenu: (trigger: HTMLButtonElement) => void
      onCloseMenu: () => void
    }
  | {
      kind: 'question'
      item: ReviewQuestion
      menuOpen: boolean
      onAdd: () => void
      onUpdate: (id: string, content: string) => void
      onRemove: (id: string) => void | Promise<void>
      onToggleMenu: (trigger: HTMLButtonElement) => void
      onCloseMenu: () => void
    }

function ParameterCard(props: ParameterCardProps) {
  const { item, menuOpen, onAdd, onUpdate, onRemove, onToggleMenu, onCloseMenu } = props
  const isRule = props.kind === 'rule'
  const title = item.rulebookTitle || (isRule ? 'Review Rule' : 'Question')
  const showMenu = !isRule || !item.preset
  const accent = isRule ? '#9124FF' : '#247BFF'

  return (
    <div
      style={{
        width: '49%',
        height: '243px',
        backgroundColor: isRule ? '#FCF6FF' : '#ECF1FA',
        border: `1px solid ${accent}`,
        borderRadius: '8px',
        boxShadow: isRule
          ? '0px 0px 0px 1px rgba(203, 92, 255, 0.25)'
          : '0px 0px 0px 1px rgba(53, 141, 255, 0.35)',
        padding: '7px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
          <span
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#FFFFFF',
              borderRadius: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={isRule ? reviewRuleIcon : questionIcon}
              alt=""
              style={{ width: '20px', height: '20px', transform: 'rotate(180deg) scaleX(-1)' }}
            />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
                fontFamily: complianceFontFamily,
              }}
            >
              {title}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 510, color: '#666666' }}>
              {item.rulebookTitle ? 'From rulebook' : isRule ? 'Custom rule' : 'Custom question'}
            </span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            aria-label={isRule ? 'Add review rule' : 'Add question'}
            onClick={onAdd}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              width: '24px',
              height: '24px',
            }}
          >
            <img
              src={isRule ? plusIconPurple : plusIconBlue}
              alt="Add"
              style={{ width: '24px', height: '24px' }}
            />
          </button>
          {showMenu && (
            <div style={{ position: 'relative' }} data-parameter-menu>
              <button
                type="button"
                aria-label={`Actions for ${item.rulebookTitle || (isRule ? 'review rule' : 'question')}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={`${isRule ? 'rule' : 'question'}-actions-${item.id}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleMenu(event.currentTarget)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  width: '24px',
                  height: '24px',
                }}
              >
                <img
                  src={dotsHorizontalIcon}
                  alt="More"
                  style={{ width: '15px', height: '4px', transform: 'rotate(90deg)' }}
                />
              </button>
              {menuOpen && (
                <div
                  id={`${isRule ? 'rule' : 'question'}-actions-${item.id}`}
                  role="menu"
                  aria-label={`Actions for ${item.rulebookTitle || (isRule ? 'review rule' : 'question')}`}
                  onKeyDown={(event) => handlePopupKeyDown(event, '[role="menuitem"]', onCloseMenu)}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EDEDED',
                    borderRadius: '8px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    minWidth: '120px',
                  }}
                >
                  <button
                    autoFocus
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void onRemove(item.id)
                      onCloseMenu()
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
                      color: '#F04438',
                      fontFamily: complianceFontFamily,
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDEDED',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <textarea
          aria-label={`${item.rulebookTitle || (isRule ? 'Review rule' : 'Question')} ${
            isRule ? 'instruction' : 'text'
          }`}
          value={item.content}
          onChange={(event) => onUpdate(item.id, event.target.value)}
          placeholder={
            isRule
              ? 'Analyze whether liability obligations are disproportionately assigned to one party and identify unlimited liability exposure.'
              : 'Does this agreement create any operational dependency or long-term vendor lock-in risks?'
          }
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '13px 9px',
            fontSize: '12px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.6px',
            lineHeight: '16px',
            fontFamily: complianceFontFamily,
            backgroundColor: 'transparent',
          }}
        />
      </div>
    </div>
  )
}
