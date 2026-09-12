import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  FORMAT_OPTIONS,
  TAG_COLORS,
  reviewFontFamily as fontFamily,
  type ColumnConfig,
  type ColumnFormat,
} from './reviewModel'

interface ColumnEditMenuProps {
  column: ColumnConfig
  onSave: (column: ColumnConfig) => void
  onDelete: () => void
}

export function ColumnEditMenu({ column, onSave, onDelete }: ColumnEditMenuProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(column.name)
  const [prompt, setPrompt] = useState(column.prompt)
  const [format, setFormat] = useState<ColumnFormat>(column.format)
  const [tags, setTags] = useState<string[]>(column.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      setName(column.name)
      setPrompt(column.prompt)
      setFormat(column.format)
      setTags(column.tags ?? [])
      setTagInput('')
    }
  }, [column, open])

  useLayoutEffect(() => {
    if (!open) return
    const restoreTarget = triggerRef.current
    nameInputRef.current?.focus()
    return () => {
      if (restoreTarget?.isConnected) restoreTarget.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function commitTag() {
    const tag = tagInput.trim()
    if (!tag || tags.includes(tag)) {
      setTagInput('')
      return
    }
    setTags((prev) => [...prev, tag])
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTag()
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  function closeAndFocusTrigger() {
    setOpen(false)
  }

  function handleSave() {
    onSave({
      ...column,
      name: name.trim(),
      prompt: prompt.trim(),
      format,
      tags: format === 'tag' ? tags : undefined,
    })
    closeAndFocusTrigger()
  }

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Edit ${column.name} column`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`column-editor-${column.id}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        style={{
          width: '24px',
          height: '24px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999999',
          borderRadius: '4px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          id={`column-editor-${column.id}`}
          role="dialog"
          aria-label={`Edit ${column.name} column`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              closeAndFocusTrigger()
            }
          }}
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            width: '288px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDEDED',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>Edit Column</span>
            <button
              type="button"
              aria-label="Close column editor"
              onClick={closeAndFocusTrigger}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: '#999999',
                padding: '4px',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <label
            htmlFor={`column-label-${column.id}`}
            style={{ fontSize: '12px', fontWeight: 510, color: '#454545' }}
          >
            Label
          </label>
          <input
            ref={nameInputRef}
            id={`column-label-${column.id}`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '8px 10px',
              border: '1px solid #EDEDED',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#454545',
              fontFamily,
              boxSizing: 'border-box',
            }}
          />

          <label
            htmlFor={`column-format-${column.id}`}
            style={{
              display: 'block',
              marginTop: '12px',
              fontSize: '12px',
              fontWeight: 510,
              color: '#454545',
            }}
          >
            Format
          </label>
          <select
            id={`column-format-${column.id}`}
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as ColumnFormat)
              setTags([])
              setTagInput('')
            }}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '8px 10px',
              border: '1px solid #EDEDED',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#454545',
              backgroundColor: '#FFFFFF',
              fontFamily,
              cursor: 'pointer',
            }}
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {format === 'tag' && (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  padding: '6px 8px',
                  border: '1px solid #EDEDED',
                  borderRadius: '6px',
                  minHeight: '32px',
                  alignItems: 'center',
                }}
              >
                {tags.map((tag, tagIdx) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: 500,
                      ...TAG_COLORS[tagIdx % TAG_COLORS.length],
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag} tag`}
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'inherit',
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  aria-label="Add tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={commitTag}
                  placeholder={tags.length === 0 ? 'Add tags...' : ''}
                  style={{
                    flex: 1,
                    minWidth: '50px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '10px',
                    color: '#454545',
                    fontFamily,
                    backgroundColor: 'transparent',
                  }}
                />
              </div>
            </div>
          )}

          <label
            htmlFor={`column-prompt-${column.id}`}
            style={{
              display: 'block',
              marginTop: '12px',
              fontSize: '12px',
              fontWeight: 510,
              color: '#454545',
            }}
          >
            Prompt
          </label>
          <textarea
            id={`column-prompt-${column.id}`}
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '8px 10px',
              border: '1px solid #EDEDED',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#454545',
              fontFamily,
              resize: 'none',
              lineHeight: '1.5',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                onDelete()
                closeAndFocusTrigger()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#EF4444',
                fontFamily,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !prompt.trim()}
              style={{
                padding: '6px 16px',
                border: 'none',
                backgroundColor: !name.trim() || !prompt.trim() ? '#CCCCCC' : '#272727',
                borderRadius: '999px',
                cursor: !name.trim() || !prompt.trim() ? 'default' : 'pointer',
                fontSize: '12px',
                fontWeight: 510,
                color: '#FFFFFF',
                fontFamily,
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
