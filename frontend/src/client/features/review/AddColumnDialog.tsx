import { useEffect, useRef, useState } from 'react'
import editColumnIcon from '../../assets/edit-column-icon.svg'
import columnNameIcon from '../../assets/column-name-icon.svg'
import outputFormatIcon from '../../assets/output-format-icon.svg'
import aiInstructionIcon from '../../assets/ai-instruction-icon.svg'
import arrowDownIcon from '../../assets/arrow-down-icon.svg'
import trashIcon from '../../assets/trash-icon.svg'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import {
  FORMAT_OPTIONS,
  reviewFontFamily as fontFamily,
  type ColumnConfig,
  type ColumnFormat,
} from './reviewModel'
import {
  handleReviewPopupFocus,
  handleReviewPopupKeyDown as handlePopupKeyDown,
} from './reviewPopupKeyboard'

interface AddColumnModalProps {
  isOpen: boolean
  existingCount: number
  onClose: () => void
  onAdd: (columns: Omit<ColumnConfig, 'id' | 'width'>[]) => void
  editingColumn?: ColumnConfig | null
  onSave?: (column: ColumnConfig) => void
  onDelete?: () => void
}

interface ColumnDraft {
  name: string
  prompt: string
  format: ColumnFormat
  tags: string[]
  tagInput: string
}

const EMPTY_DRAFT: ColumnDraft = {
  name: '',
  prompt: '',
  format: 'text',
  tags: [],
  tagInput: '',
}

export function AddColumnDialog({
  isOpen,
  existingCount,
  onClose,
  onAdd,
  editingColumn,
  onSave,
  onDelete,
}: AddColumnModalProps) {
  const isEditing = !!editingColumn
  const [column, setColumn] = useState<ColumnDraft>({ ...EMPTY_DRAFT })
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false)
  const [showError, setShowError] = useState(false)
  const formatRef = useRef<HTMLDivElement>(null)
  const formatTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    if (editingColumn) {
      setColumn({
        name: editingColumn.name,
        prompt: editingColumn.prompt,
        format: editingColumn.format ?? 'text',
        tags: editingColumn.tags ?? [],
        tagInput: '',
      })
    } else {
      setColumn({ ...EMPTY_DRAFT })
    }
    setShowError(false)
  }, [isOpen, editingColumn])

  useEffect(() => {
    if (!formatDropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (formatRef.current && !formatRef.current.contains(e.target as Node)) {
        setFormatDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [formatDropdownOpen])

  if (!isOpen) return null

  function updateColumn(patch: Partial<ColumnDraft>) {
    setColumn((prev) => ({ ...prev, ...patch }))
    if (patch.prompt !== undefined) setShowError(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!column.name.trim() || !column.prompt.trim()) {
      setShowError(true)
      return
    }

    if (isEditing && onSave && editingColumn) {
      onSave({
        ...editingColumn,
        name: column.name.trim(),
        prompt: column.prompt.trim(),
        format: column.format,
        tags: column.format === 'tag' ? column.tags : undefined,
      })
    } else {
      onAdd([
        {
          index: existingCount,
          name: column.name.trim(),
          prompt: column.prompt.trim(),
          format: column.format,
          tags: column.format === 'tag' ? column.tags : undefined,
        },
      ])
    }
    onClose()
  }

  const selectedFormatLabel =
    FORMAT_OPTIONS.find((opt) => opt.value === column.format)?.label || 'Select'

  function closeFormatDropdown(restoreFocus = true) {
    setFormatDropdownOpen(false)
    if (restoreFocus) requestAnimationFrame(() => formatTriggerRef.current?.focus())
  }

  return (
    <AccessibleDialog
      open={isOpen}
      onClose={onClose}
      labelledBy="column-dialog-title"
      overlayStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.34)',
      }}
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0px 0px 40px rgba(0, 0, 0, 0.34)',
        width: '405px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '56px',
          padding: '0 20px',
          borderBottom: '1px solid #EAEAEA',
        }}
      >
        <img src={editColumnIcon} alt="" style={{ width: '18px', height: '12px' }} />
        <h2
          id="column-dialog-title"
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.8px',
            lineHeight: '21px',
            fontFamily,
          }}
        >
          {isEditing ? 'Edit Column' : 'Add Column'}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 20px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <img src={columnNameIcon} alt="" style={{ width: '18px', height: '18px' }} />
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
              Column Name
            </span>
          </div>
          <input
            aria-label="Column name"
            type="text"
            value={column.name}
            onChange={(e) => updateColumn({ name: e.target.value })}
            placeholder="Customize Columns"
            style={{
              width: '100%',
              padding: '15px',
              border: '1px solid #EDEDED',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 400,
              color: '#454545',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              fontFamily,
              boxSizing: 'border-box',
              outline: 'none',
            }}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <img src={outputFormatIcon} alt="" style={{ width: '18px', height: '18px' }} />
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
              Output Format
            </span>
          </div>
          <div ref={formatRef} style={{ position: 'relative' }}>
            <button
              ref={formatTriggerRef}
              type="button"
              aria-label="Output format"
              aria-haspopup="listbox"
              aria-expanded={formatDropdownOpen}
              aria-controls="column-format-listbox"
              onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
              style={{
                width: '100%',
                padding: '15px',
                border: '1px solid #EDEDED',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 510,
                color: column.format === 'text' && !isEditing ? '#999999' : '#454545',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                fontFamily,
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <span>{selectedFormatLabel}</span>
              <img
                src={arrowDownIcon}
                alt=""
                style={{
                  width: '24px',
                  height: '24px',
                  transform: formatDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
            {formatDropdownOpen && (
              <div
                id="column-format-listbox"
                role="listbox"
                aria-label="Output format"
                onFocus={handleReviewPopupFocus}
                onKeyDown={(event) =>
                  handlePopupKeyDown(event, (reason) => closeFormatDropdown(reason === 'escape'))
                }
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '100%',
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDEDED',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    tabIndex={column.format === opt.value ? 0 : -1}
                    aria-selected={column.format === opt.value}
                    autoFocus={column.format === opt.value}
                    onClick={() => {
                      updateColumn({ format: opt.value, tags: [], tagInput: '' })
                      closeFormatDropdown()
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: column.format === opt.value ? '#F7F7F7' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      fontFamily,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F7F7F7')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        column.format === opt.value ? '#F7F7F7' : 'transparent')
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src={aiInstructionIcon} alt="" style={{ width: '17.5px', height: '19px' }} />
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
                AI Instruction
              </span>
            </div>
          </div>
          <textarea
            aria-label="AI instruction"
            aria-invalid={showError && !column.prompt.trim()}
            aria-describedby={
              showError && !column.prompt.trim() ? 'column-instruction-error' : undefined
            }
            value={column.prompt}
            onChange={(e) => updateColumn({ prompt: e.target.value })}
            placeholder="Write the analysis prompt — describe what should be extracted from each document for this column..."
            style={{
              width: '100%',
              height: '163px',
              padding: '12px',
              border: `1px solid ${showError && !column.prompt.trim() ? '#D73B3B' : '#EDEDED'}`,
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 400,
              color: '#454545',
              letterSpacing: '-0.28px',
              lineHeight: '18px',
              fontFamily,
              boxSizing: 'border-box',
              resize: 'none',
              outline: 'none',
            }}
          />
          {showError && !column.prompt.trim() && (
            <span
              id="column-instruction-error"
              role="alert"
              style={{
                fontSize: '12px',
                fontWeight: 510,
                color: '#D73B3B',
                letterSpacing: '-0.6px',
                lineHeight: '16px',
                fontFamily,
              }}
            >
              Please add an instruction for analysis
            </span>
          )}
        </div>
      </form>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '0 20px 20px 20px',
        }}
      >
        {isEditing && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '119px',
              height: '48px',
              padding: '10px 15px',
              border: 'none',
              backgroundColor: 'transparent',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            <img src={trashIcon} alt="" style={{ width: '20px', height: '20px' }} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#D73B3B',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
              }}
            >
              Delete
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '119px',
            height: '48px',
            padding: '10px 15px',
            border: '1px solid #EDEDED',
            backgroundColor: '#F7F7F7',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            fontFamily,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '119px',
            height: '48px',
            padding: '10px',
            border: 'none',
            backgroundColor: '#272727',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 510,
            color: '#FFFFFF',
            letterSpacing: '-0.8px',
            lineHeight: '21px',
            fontFamily,
          }}
        >
          Save
        </button>
      </div>
    </AccessibleDialog>
  )
}
