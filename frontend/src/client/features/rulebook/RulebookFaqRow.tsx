import {
  rulebookFormatLabel,
  rulebookFormatOptions,
  rulebookSeverityColor,
  rulebookSeverityOptions,
} from './rulebookModel'
import { RulebookSelect } from './RulebookFields'
import { miniRulebookButtonStyle, rulebookInputStyle, rulebookLabelStyle } from './rulebookStyles'
import type { RulebookEditorSession } from './useRulebookEditor'

type RulebookFaq = RulebookEditorSession['draftFaqs'][number]

export function RulebookFaqRow({
  faq,
  index,
  total,
  view,
  readOnly,
  onChange,
  onMove,
  onRemove,
}: {
  faq: RulebookFaq
  index: number
  total: number
  view: 'checklist' | 'columns'
  readOnly: boolean
  onChange: (patch: Partial<RulebookFaq>) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const badgeStyle = rulebookSeverityColor(faq.severity)
  const fieldIdPrefix = `rulebook-faq-${faq.id}`

  return (
    <div
      style={{
        border: '1px solid #EDEDED',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr auto',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderBottom: '1px solid #F3F3F3',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '7px',
            backgroundColor: '#F7F7F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#797979',
            fontSize: '12px',
          }}
        >
          {index + 1}
        </div>
        <div style={{ minWidth: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 590,
              color: '#272727',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {faq.column_name || `Check ${index + 1}`}
          </div>
          <span
            style={{
              ...badgeStyle,
              borderRadius: '999px',
              padding: '2px 8px',
              fontSize: '11px',
            }}
          >
            {rulebookSeverityOptions.find((option) => option.value === faq.severity)?.label}
          </span>
          <span
            style={{
              backgroundColor: '#F3F3F3',
              color: '#686868',
              borderRadius: '999px',
              padding: '2px 8px',
              fontSize: '11px',
            }}
          >
            {rulebookFormatLabel(faq.format)}
          </span>
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              aria-label={`Move ${faq.column_name || `check ${index + 1}`} up`}
              onClick={() => onMove(-1)}
              disabled={index === 0}
              style={miniRulebookButtonStyle(index === 0)}
            >
              Up
            </button>
            <button
              type="button"
              aria-label={`Move ${faq.column_name || `check ${index + 1}`} down`}
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              style={miniRulebookButtonStyle(index === total - 1)}
            >
              Down
            </button>
            <button
              type="button"
              aria-label={`Remove ${faq.column_name || `check ${index + 1}`}`}
              onClick={onRemove}
              style={{
                ...miniRulebookButtonStyle(false),
                color: '#E53935',
                backgroundColor: '#FDECEC',
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {view === 'checklist' ? (
        <div
          style={{
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 160px 130px',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={`${fieldIdPrefix}-question`} style={rulebookLabelStyle}>
              Question
            </label>
            <textarea
              id={`${fieldIdPrefix}-question`}
              disabled={readOnly}
              value={faq.question}
              onChange={(event) => onChange({ question: event.target.value })}
              style={{
                ...rulebookInputStyle,
                height: '66px',
                padding: '8px 10px',
                resize: 'vertical',
                lineHeight: 1.35,
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={`${fieldIdPrefix}-category`} style={rulebookLabelStyle}>
              Category
            </label>
            <input
              id={`${fieldIdPrefix}-category`}
              disabled={readOnly}
              value={faq.category}
              onChange={(event) => onChange({ category: event.target.value })}
              style={rulebookInputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={rulebookLabelStyle}>Severity</div>
            <RulebookSelect
              label={`${faq.column_name || `Check ${index + 1}`} severity`}
              value={faq.severity}
              options={rulebookSeverityOptions}
              onChange={(value) => onChange({ severity: value })}
              disabled={readOnly}
            />
          </div>
          <div
            style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            <label htmlFor={`${fieldIdPrefix}-rationale`} style={rulebookLabelStyle}>
              Rationale
            </label>
            <input
              id={`${fieldIdPrefix}-rationale`}
              disabled={readOnly}
              value={faq.rationale ?? ''}
              onChange={(event) => onChange({ rationale: event.target.value })}
              style={rulebookInputStyle}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: '220px 140px 1fr',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={`${fieldIdPrefix}-column-name`} style={rulebookLabelStyle}>
              Column name
            </label>
            <input
              id={`${fieldIdPrefix}-column-name`}
              disabled={readOnly}
              value={faq.column_name}
              onChange={(event) => onChange({ column_name: event.target.value })}
              style={rulebookInputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={rulebookLabelStyle}>Format</div>
            <RulebookSelect
              label={`${faq.column_name || `Check ${index + 1}`} format`}
              value={faq.format}
              options={rulebookFormatOptions}
              onChange={(value) => onChange({ format: value })}
              disabled={readOnly}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={`${fieldIdPrefix}-instruction`} style={rulebookLabelStyle}>
              AI instruction
            </label>
            <textarea
              id={`${fieldIdPrefix}-instruction`}
              disabled={readOnly}
              value={faq.prompt}
              onChange={(event) => onChange({ prompt: event.target.value })}
              style={{
                ...rulebookInputStyle,
                height: '74px',
                padding: '8px 10px',
                resize: 'vertical',
                lineHeight: 1.35,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
