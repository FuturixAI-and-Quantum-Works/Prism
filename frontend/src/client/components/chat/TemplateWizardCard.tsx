import { useState, useMemo } from 'react'
import { useCreateDocumentFromTemplateMutation } from '../../features/templates/templatesApi'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export interface WizardField {
  id: string
  label: string
  type?: string
  required: boolean
  options?: string[]
  placeholder?: string
}

interface TemplateWizardCommonProps {
  templateName: string
  fields: WizardField[]
  onCancel: () => void
}

interface TemplateDocumentWizardProps extends TemplateWizardCommonProps {
  mode: 'template'
  templateId: string
  onDocumentCreated: (documentId: string, filename: string) => void
}

interface GeneratedDocumentWizardProps extends TemplateWizardCommonProps {
  mode: 'generated'
  onGenerate: (documentType: string, values: Record<string, string>) => void
}

type TemplateWizardProps = TemplateDocumentWizardProps | GeneratedDocumentWizardProps

export default function TemplateWizardCard(props: TemplateWizardProps) {
  const { templateName, fields, onCancel } = props
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [customInputMode, setCustomInputMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createDocument] = useCreateDocumentFromTemplateMutation()

  const currentField = fields[currentIndex]
  const totalFields = fields.length
  const progress = `${currentIndex + 1}/${totalFields}`

  const isLastField = currentIndex === totalFields - 1

  const canSkip = currentField && !currentField.required

  const requiredFieldsMissing = useMemo(() => {
    return fields.filter((f) => f.required && !fieldValues[f.id]?.trim()).map((f) => f.label)
  }, [fields, fieldValues])

  const handleSelectOption = (value: string) => {
    setFieldValues((prev) => ({ ...prev, [currentField.id]: value }))
    setCustomInputMode(false)
    setCustomValue('')

    if (isLastField) {
      const updatedValues = { ...fieldValues, [currentField.id]: value }
      const stillMissing = fields.filter((f) => f.required && !updatedValues[f.id]?.trim())
      if (stillMissing.length === 0) {
        handleCreateDocument(updatedValues)
      } else {
        const firstMissingIndex = fields.findIndex(
          (f) => f.required && !updatedValues[f.id]?.trim(),
        )
        setCurrentIndex(firstMissingIndex)
      }
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleCustomSubmit = () => {
    if (!customValue.trim()) return
    handleSelectOption(customValue.trim())
  }

  const handleSkip = () => {
    if (!canSkip) return
    setFieldValues((prev) => ({ ...prev, [currentField.id]: '' }))
    setCustomInputMode(false)
    setCustomValue('')

    if (isLastField) {
      const updatedValues = { ...fieldValues, [currentField.id]: '' }
      const stillMissing = fields.filter((f) => f.required && !updatedValues[f.id]?.trim())
      if (stillMissing.length === 0) {
        handleCreateDocument(updatedValues)
      } else {
        const firstMissingIndex = fields.findIndex(
          (f) => f.required && !updatedValues[f.id]?.trim(),
        )
        setCurrentIndex(firstMissingIndex)
      }
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleGoBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setCustomInputMode(false)
      setCustomValue('')
    }
  }

  const handleCreateDocument = async (values: Record<string, string>) => {
    setIsCreating(true)
    setError(null)

    try {
      if (props.mode === 'template') {
        const result = await createDocument({
          id: props.templateId,
          data: {
            name: templateName,
            filename: `${templateName}.docx`,
            values,
          },
        }).unwrap()

        setIsComplete(true)
        props.onDocumentCreated(result.id, result.filename || `${templateName}.docx`)
      } else {
        props.onGenerate(templateName, values)
        setIsComplete(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document')
      setIsCreating(false)
    }
  }

  if (isComplete) {
    return (
      <div
        style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12L10 17L20 7"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 510,
              color: '#166534',
              letterSpacing: '-0.3px',
            }}
          >
            {props.mode === 'template'
              ? `${templateName} created successfully`
              : `Generating ${templateName}...`}
          </p>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: '#15803D',
            }}
          >
            {props.mode === 'template'
              ? 'Your document is ready to view'
              : 'The document will appear in the chat shortly'}
          </p>
        </div>
      </div>
    )
  }

  if (!currentField) {
    return (
      <div
        style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          padding: '16px 20px',
          fontFamily,
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#DC2626' }}>
          Unable to display wizard: No fields available for {templateName || 'document'}
        </p>
        <button
          onClick={onCancel}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            backgroundColor: '#F3F4F6',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#6B7280',
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    )
  }

  const questionText = `What is the ${currentField.label.toLowerCase()}?`

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        overflow: 'hidden',
        fontFamily,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 510,
              color: '#111827',
              letterSpacing: '-0.3px',
              lineHeight: '20px',
            }}
          >
            {questionText}
          </p>
          {currentField.type === 'date' && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              e.g. 1 January 2025
            </p>
          )}
        </div>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#9CA3AF',
            letterSpacing: '-0.2px',
            flexShrink: 0,
            marginLeft: '12px',
          }}
        >
          {progress}
        </span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {!customInputMode && currentField.options && currentField.options.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentField.options.map((option, idx) => (
              <button
                key={option}
                onClick={() => handleSelectOption(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: fieldValues[currentField.id] === option ? '#F0F9FF' : '#F9FAFB',
                  border:
                    fieldValues[currentField.id] === option
                      ? '1px solid #3B82F6'
                      : '1px solid #E5E7EB',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily,
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 450,
                    color: '#374151',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {option}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#9CA3AF',
                  }}
                >
                  {idx + 1}
                </span>
              </button>
            ))}
            <button
              onClick={() => setCustomInputMode(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily,
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 450,
                  color: '#6B7280',
                  letterSpacing: '-0.2px',
                }}
              >
                Type something else...
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#9CA3AF',
                }}
              >
                {(currentField.options?.length || 0) + 1}
              </span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type={
                currentField.type === 'date'
                  ? 'date'
                  : currentField.type === 'number'
                    ? 'number'
                    : 'text'
              }
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder={currentField.placeholder || `Enter ${currentField.label.toLowerCase()}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSubmit()
                } else if (e.key === 'Escape' && currentField.options?.length) {
                  setCustomInputMode(false)
                  setCustomValue('')
                }
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 400,
                color: '#111827',
                outline: 'none',
                fontFamily,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              {currentField.options?.length ? (
                <button
                  onClick={() => {
                    setCustomInputMode(false)
                    setCustomValue('')
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#F3F4F6',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#6B7280',
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Back to options
                </button>
              ) : null}
              <button
                onClick={handleCustomSubmit}
                disabled={!customValue.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: customValue.trim() ? '#3B82F6' : '#E5E7EB',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: customValue.trim() ? '#FFFFFF' : '#9CA3AF',
                  cursor: customValue.trim() ? 'pointer' : 'not-allowed',
                  fontFamily,
                }}
              >
                {isLastField && requiredFieldsMissing.length <= 1 ? 'Create Document' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #F3F4F6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentIndex > 0 && (
            <button
              onClick={handleGoBack}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#6B7280',
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Back
            </button>
          )}
          {canSkip && (
            <button
              onClick={handleSkip}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#6B7280',
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Skip
            </button>
          )}
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '13px',
            fontWeight: 500,
            color: '#9CA3AF',
            cursor: 'pointer',
            fontFamily,
          }}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            borderTop: '1px solid #FECACA',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#DC2626',
            }}
          >
            {error}
          </p>
        </div>
      )}

      {isCreating && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#6B7280',
            }}
          >
            Creating document...
          </p>
        </div>
      )}
    </div>
  )
}
