import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  FLAG_STYLES,
  reviewFontFamily as fontFamily,
  type ColumnConfig,
  type ReviewDocument,
  type TabularCell,
} from './reviewModel'

interface ReviewCellProps {
  cell: TabularCell
  column: ColumnConfig
  onExpand: () => void
}

export function ReviewCell({ cell, column: _column, onExpand }: ReviewCellProps) {
  const [inlineExpanded, setInlineExpanded] = useState(false)
  const [popupPosition, setPopupPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!inlineExpanded) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setInlineExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inlineExpanded])

  useEffect(() => {
    if (inlineExpanded && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPopupPosition({ top: rect.top, left: rect.left, width: Math.max(rect.width, 250) })
    }
  }, [inlineExpanded])

  useEffect(() => {
    if (inlineExpanded && popupPosition) detailsRef.current?.focus()
  }, [inlineExpanded, popupPosition])

  if (cell.status === 'generating') {
    return (
      <div
        role="status"
        aria-label="Generating cell result"
        style={{ height: '40px', padding: '0 8px', display: 'flex', alignItems: 'center' }}
      >
        <div
          style={{
            height: '16px',
            width: '100%',
            borderRadius: '4px',
            backgroundColor: '#F3F4F6',
            animation: 'pulse 2s infinite',
          }}
        />
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          .markdown-content p { margin: 0 0 0.5em 0; }
          .markdown-content p:last-child { margin-bottom: 0; }
          .markdown-content ul, .markdown-content ol { margin: 0.5em 0; padding-left: 1.5em; }
          .markdown-content li { margin: 0.25em 0; }
          .markdown-content strong { font-weight: 600; }
          .markdown-content code { background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.9em; }
        `}</style>
      </div>
    )
  }

  if (cell.status === 'error') {
    return (
      <div
        role="alert"
        aria-label={cell.content?.reasoning || 'Could not extract this cell'}
        title={cell.content?.reasoning || 'Could not extract this cell'}
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FCA5A5',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    )
  }

  if (!cell.content?.summary) {
    return <div style={{ height: '40px' }} />
  }

  const summary = cell.content.summary
  const firstLine = summary.split('\n').find((l) => l.trim()) ?? summary
  const collapsedDisplay = firstLine
    .replace(/^[-*•]\s+/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()

  function closeInlineDetails() {
    setInlineExpanded(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Show ${_column.name} result details`}
        aria-haspopup="dialog"
        aria-expanded={inlineExpanded}
        aria-controls={`cell-details-${cell.id}`}
        onClick={() => setInlineExpanded(!inlineExpanded)}
        style={{
          width: '100%',
          height: '40px',
          padding: '0 8px',
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          textAlign: 'left',
          fontFamily,
          fontSize: '12px',
          color: '#374151',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        {cell.content.flag && (
          <span
            style={{
              position: 'absolute',
              right: '6px',
              top: '6px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: FLAG_STYLES[cell.content.flag],
            }}
            title={cell.content.flag}
          />
        )}
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
            paddingRight: cell.content.flag ? '12px' : 0,
          }}
        >
          {collapsedDisplay}
        </span>
      </button>

      {inlineExpanded && popupPosition && (
        <div
          ref={detailsRef}
          id={`cell-details-${cell.id}`}
          role="dialog"
          aria-label={`${_column.name} result details`}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              closeInlineDetails()
            }
          }}
          style={{
            position: 'fixed',
            left: popupPosition.left,
            top: popupPosition.top,
            zIndex: 9999,
            width: popupPosition.width,
            padding: '8px',
            minWidth: '250px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div
            style={{
              position: 'relative',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#374151',
              lineHeight: '1.6',
            }}
          >
            {cell.content.flag && (
              <span
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: FLAG_STYLES[cell.content.flag],
                }}
                title={cell.content.flag}
              />
            )}
            <div className="markdown-content" style={{ fontSize: '12px', lineHeight: '1.5' }}>
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </div>
          <div
            style={{
              padding: '6px 8px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setInlineExpanded(false)
                onExpand()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#9CA3AF',
                fontFamily,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              See details
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ReviewResultPanelProps {
  cell: TabularCell
  document: ReviewDocument
  column: ColumnConfig
  columns: ColumnConfig[]
  onClose: () => void
  onNavigate: (columnIndex: number) => void
  onRegenerate?: () => void
}

export function ReviewResultPanel({
  cell,
  document: doc,
  column,
  columns,
  onClose,
  onNavigate,
  onRegenerate,
}: ReviewResultPanelProps) {
  const sortedColumns = [...columns].sort((a, b) => a.index - b.index)
  const currentPos = sortedColumns.findIndex((c) => c.index === column.index)
  const prevColumn = currentPos > 0 ? sortedColumns[currentPos - 1] : null
  const nextColumn = currentPos < sortedColumns.length - 1 ? sortedColumns[currentPos + 1] : null

  return (
    <div
      role="complementary"
      aria-label={`${column.name} result details`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '360px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderLeft: '1px solid #E5E7EB',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            aria-label={`Previous column${prevColumn ? `: ${prevColumn.name}` : ''}`}
            onClick={() => prevColumn && onNavigate(prevColumn.index)}
            disabled={!prevColumn}
            style={{
              padding: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: prevColumn ? 'pointer' : 'default',
              color: prevColumn ? '#6B7280' : '#D1D5DB',
              borderRadius: '4px',
            }}
            title={prevColumn?.name}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace' }}>
            {currentPos + 1} / {sortedColumns.length}
          </span>
          <button
            type="button"
            aria-label={`Next column${nextColumn ? `: ${nextColumn.name}` : ''}`}
            onClick={() => nextColumn && onNavigate(nextColumn.index)}
            disabled={!nextColumn}
            style={{
              padding: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: nextColumn ? 'pointer' : 'default',
              color: nextColumn ? '#6B7280' : '#D1D5DB',
              borderRadius: '4px',
            }}
            title={nextColumn?.name}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onRegenerate && (
            <button
              type="button"
              aria-label="Regenerate cell result"
              onClick={onRegenerate}
              style={{
                padding: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: '#9CA3AF',
                borderRadius: '6px',
              }}
              title="Regenerate"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          )}
          <button
            type="button"
            aria-label="Close result details"
            onClick={onClose}
            style={{
              padding: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#9CA3AF',
              borderRadius: '6px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
          {column.name}
        </h2>
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '20px' }}>{doc.name}</p>

        {cell.content?.flag && (
          <div style={{ marginBottom: '24px' }}>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Flag
            </h4>
            <span
              style={{
                display: 'inline-flex',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: FLAG_STYLES[cell.content.flag],
              }}
            >
              {cell.content.flag.charAt(0).toUpperCase() + cell.content.flag.slice(1)}
            </span>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Results
          </h4>
          <div
            className="markdown-content"
            style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.7' }}
          >
            <ReactMarkdown>{cell.content?.summary || '—'}</ReactMarkdown>
          </div>
        </div>

        {cell.content?.reasoning && (
          <div>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Reasoning
            </h4>
            <div
              className="markdown-content"
              style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.7' }}
            >
              <ReactMarkdown>{cell.content.reasoning}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
