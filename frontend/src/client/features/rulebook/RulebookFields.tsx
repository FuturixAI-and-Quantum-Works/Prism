import { useEffect, useId, useRef, useState } from 'react'
import type { Document } from '../../store/types'
import { rulebookFontFamily } from './rulebookModel'
import { rulebookInputStyle } from './rulebookStyles'

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RulebookSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  label,
  placeholder = 'Select...',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
  label: string
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()
  const selectedOption = options.find((option) => option.value === value)
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus())
  }, [activeIndex, isOpen])

  const closeAndFocusTrigger = () => {
    setIsOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const selectOption = (option: { value: T; label: string }) => {
    onChange(option.value)
    closeAndFocusTrigger()
  }

  const focusOption = (index: number) => {
    const nextIndex = (index + options.length) % options.length
    setActiveIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          if (!isOpen) setActiveIndex(selectedIndex)
          setIsOpen(!isOpen)
        }}
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          if (options.length === 0) return
          event.preventDefault()
          const nextIndex =
            event.key === 'End'
              ? options.length - 1
              : event.key === 'ArrowUp'
                ? (selectedIndex - 1 + options.length) % options.length
                : event.key === 'ArrowDown'
                  ? (selectedIndex + 1) % options.length
                  : 0
          setActiveIndex(nextIndex)
          setIsOpen(true)
        }}
        aria-label={`${label}: ${selectedOption?.label || placeholder}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        style={{
          ...rulebookInputStyle,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E8E8',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: '200px',
            overflow: 'auto',
          }}
        >
          {options.map((option, index) => (
            <button
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => selectOption(option)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  focusOption(activeIndex + 1)
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  focusOption(activeIndex - 1)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  focusOption(0)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  focusOption(options.length - 1)
                } else if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  selectOption(option)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  closeAndFocusTrigger()
                } else if (event.key === 'Tab') {
                  setIsOpen(false)
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                fontSize: '14px',
                color: option.value === value ? '#272727' : '#454545',
                backgroundColor: option.value === value ? '#F7F7F7' : 'transparent',
                cursor: 'pointer',
                fontFamily: rulebookFontFamily,
                textAlign: 'left',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#F7F7F7'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                  option.value === value ? '#F7F7F7' : 'transparent'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function DocumentChecklist({
  documents,
  selectedIds,
  onChange,
  loading,
  compact,
  label = 'Documents',
}: {
  documents: Document[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  loading: boolean
  compact?: boolean
  label?: string
}) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <div
      role="group"
      aria-label={label}
      style={{
        border: '1px solid #EDEDED',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div style={{ maxHeight: compact ? '160px' : '320px', overflow: 'auto' }}>
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            style={{ padding: '14px', fontSize: '13px', color: '#797979' }}
          >
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div role="status" style={{ padding: '14px', fontSize: '13px', color: '#797979' }}>
            No documents available.
          </div>
        ) : (
          documents.map((document) => (
            <label
              key={document.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: compact ? '9px 10px' : '11px 12px',
                borderBottom: '1px solid #F3F3F3',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(document.id)}
                onChange={() => toggle(document.id)}
              />
              <span
                style={{
                  fontSize: '13px',
                  color: '#454545',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {document.filename}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}
