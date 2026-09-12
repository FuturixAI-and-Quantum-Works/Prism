import { Button } from '../../components/ui/Button'
import arrowDownIcon from '../../assets/template-preview/arrow-down.svg'
import calendarFieldIcon from '../../assets/template-preview/calendar.svg'
import tickCircleIcon from '../../assets/template-preview/tick-circle.svg'
import type { TemplateField } from '../templates/templatesApi'
import type {
  TemplateFieldSection,
  TemplateFieldValues,
  TemplateSectionExpansion,
} from './templatePreviewModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface FieldInputProps {
  fieldKey: string
  label: string
  type: TemplateField['type'] | 'select'
  placeholder?: string
  options?: string[]
  required: boolean
  value: string
  onChange: (key: string, value: string) => void
}

function getTextInputType(type: FieldInputProps['type']): 'email' | 'number' | 'tel' | 'text' {
  if (type === 'email' || type === 'number') return type
  return type === 'phone' ? 'tel' : 'text'
}

function FieldInput({
  fieldKey,
  label,
  type,
  placeholder,
  options,
  required,
  value,
  onChange,
}: FieldInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <label
        htmlFor={`template-field-${fieldKey}`}
        style={{
          fontSize: '14px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.7px',
          lineHeight: '16px',
          fontFamily,
        }}
      >
        {label}
      </label>
      {type === 'select' ? (
        <select
          id={`template-field-${fieldKey}`}
          value={value}
          required={required}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          style={{
            backgroundColor: '#F7F7F7',
            borderRadius: '8px',
            padding: '14px 13px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 510,
            color: value ? '#454545' : '#999999',
            outline: 'none',
            fontFamily,
          }}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {(options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : type === 'date' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F7F7F7',
            borderRadius: '8px',
            padding: '14px 13px',
          }}
        >
          <input
            id={`template-field-${fieldKey}`}
            type="date"
            required={required}
            value={value}
            onChange={(event) => onChange(fieldKey, event.target.value)}
            placeholder={placeholder || 'Select date'}
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: 510,
              color: value ? '#454545' : '#999999',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              outline: 'none',
              fontFamily,
            }}
          />
          <img src={calendarFieldIcon} alt="" style={{ width: '24px', height: '24px' }} />
        </div>
      ) : type === 'textarea' ? (
        <textarea
          id={`template-field-${fieldKey}`}
          required={required}
          value={value}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          style={{
            backgroundColor: '#F7F7F7',
            borderRadius: '8px',
            padding: '14px 13px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 510,
            color: value ? '#454545' : '#999999',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            outline: 'none',
            fontFamily,
            minHeight: '80px',
            resize: 'vertical',
          }}
        />
      ) : (
        <input
          id={`template-field-${fieldKey}`}
          type={getTextInputType(type)}
          required={required}
          value={value}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          style={{
            backgroundColor: '#F7F7F7',
            borderRadius: '8px',
            padding: '14px 13px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 510,
            color: value ? '#454545' : '#999999',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            outline: 'none',
            fontFamily,
          }}
        />
      )}
    </div>
  )
}

export function TemplateActions({
  sections,
  values,
  expandedSections,
  isCreating,
  onInputChange,
  onToggleSection,
  onCreateDocument,
}: {
  sections: TemplateFieldSection[]
  values: TemplateFieldValues
  expandedSections: TemplateSectionExpansion
  isCreating: boolean
  onInputChange: (key: string, value: string) => void
  onToggleSection: (sectionName: string) => void
  onCreateDocument: () => void
}) {
  return (
    <div
      style={{
        width: '350px',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #EDEDED',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50px',
          borderBottom: '1px solid #EDEDED',
          padding: '0 10px',
          flexShrink: 0,
        }}
      >
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
          Input Fields
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sections.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            <p>No input fields defined for this template.</p>
          </div>
        ) : (
          sections.map((section) => {
            const isExpanded = expandedSections[section.name] ?? false
            const allFilled = section.fields.every((field) => values[field.key]?.trim())
            const sectionContentId = `template-section-${encodeURIComponent(section.name)}`

            return (
              <div key={section.name} style={{ borderBottom: '1px solid #EDEDED' }}>
                <Button
                  aria-expanded={isExpanded}
                  aria-controls={sectionContentId}
                  onClick={() => onToggleSection(section.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 18px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    border: 'none',
                    width: '100%',
                    fontFamily,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={tickCircleIcon}
                      alt=""
                      style={{ width: '20px', height: '20px', opacity: allFilled ? 1 : 0.3 }}
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
                      {section.name}
                    </span>
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
                </Button>

                {isExpanded && (
                  <div
                    id={sectionContentId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      padding: '16px 12px',
                    }}
                  >
                    {section.fields.map((field) => (
                      <FieldInput
                        key={field.key}
                        fieldKey={field.key}
                        label={field.label}
                        type={field.type}
                        placeholder={field.placeholder}
                        options={field.options}
                        required={field.required}
                        value={values[field.key] || ''}
                        onChange={onInputChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #EDEDED', flexShrink: 0 }}>
        <Button
          onClick={onCreateDocument}
          disabled={isCreating}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px',
            width: '100%',
            backgroundColor: isCreating ? '#666666' : '#272727',
            border: 'none',
            borderRadius: '8px',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            fontFamily,
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: '#FFFFFF',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
            }}
          >
            {isCreating ? 'Creating...' : 'Create Document'}
          </span>
        </Button>
      </div>
    </div>
  )
}
