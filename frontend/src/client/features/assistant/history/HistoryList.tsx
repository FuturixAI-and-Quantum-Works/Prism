import { useEffect, useRef, useState } from 'react'
import searchIcon from '../../../assets/models/search-icon.svg'
import { Button, IconButton } from '../../../components/ui/Button'
import type { AssistantHistoryItem } from './historyModel'
import { formatHistoryDate } from './historyPresentation'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface HistoryListProps {
  items: AssistantHistoryItem[]
  isLoading: boolean
  searchQuery: string
  onOpen: (chatId: string) => void
  onDelete: (item: AssistantHistoryItem) => Promise<void>
}

export function HistoryList({ items, isLoading, searchQuery, onOpen, onDelete }: HistoryListProps) {
  const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(event.target as Node)) {
        setRowMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!rowMenuOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setRowMenuOpen(null)
      document.getElementById(`history-actions-${rowMenuOpen}`)?.focus()
    }

    document.addEventListener('keydown', handleEscape)
    rowMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => document.removeEventListener('keydown', handleEscape)
  }, [rowMenuOpen])

  const handleMenuKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    item: AssistantHistoryItem,
  ) => {
    const menuItem = event.currentTarget.querySelector<HTMLButtonElement>('[role="menuitem"]')
    if (event.key === 'Escape') {
      event.preventDefault()
      setRowMenuOpen(null)
      document.getElementById(`history-actions-${item.sessionId}`)?.focus()
      return
    }
    if (event.key === 'Tab') {
      setRowMenuOpen(null)
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      menuItem?.focus()
    }
  }

  return (
    <div
      aria-busy={isLoading}
      style={{
        flex: 1,
        overflow: 'auto',
      }}
    >
      <div style={{ width: '100%' }}>
        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-label="Loading conversation history"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 24px',
                  backgroundColor: index % 2 === 1 ? '#FFFFFF' : '#FAFAFA',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div
                  style={{
                    width: '100px',
                    height: '28px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '8px',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: '16px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <div
                  style={{
                    width: '80px',
                    height: '14px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: '#999999',
            }}
          >
            <img
              src={searchIcon}
              alt="Search"
              style={{ width: '32px', height: '32px', opacity: 0.5 }}
            />
            <p
              style={{
                fontSize: '16px',
                fontWeight: 500,
                marginTop: '16px',
                marginBottom: '8px',
                color: '#454545',
              }}
            >
              {searchQuery ? 'No matching conversations' : 'No chat history yet'}
            </p>
            <p style={{ fontSize: '14px', color: '#999999', margin: 0 }}>
              {searchQuery ? 'Try a different search term' : 'Start a conversation to see it here'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item, index) => (
              <div
                key={item.sessionId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 24px',
                  backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                  borderBottom: '1px solid #F3F4F6',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = '#F5F5F5'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor =
                    index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                }}
              >
                <Button
                  aria-label={`Open conversation ${item.title}`}
                  onClick={() => onOpen(item.activeChatId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flex: 1,
                    minWidth: 0,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#272727',
                      margin: 0,
                      letterSpacing: '-0.42px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 400,
                      color: '#999999',
                      flexShrink: 0,
                      minWidth: '100px',
                      textAlign: 'right',
                    }}
                  >
                    {formatHistoryDate(item.date)}
                  </span>
                </Button>

                <div
                  ref={rowMenuOpen === item.sessionId ? rowMenuRef : null}
                  style={{ position: 'relative' }}
                >
                  <IconButton
                    id={`history-actions-${item.sessionId}`}
                    label={`More actions for ${item.title}`}
                    aria-haspopup="menu"
                    aria-expanded={rowMenuOpen === item.sessionId}
                    aria-controls={
                      rowMenuOpen === item.sessionId
                        ? `history-actions-menu-${item.sessionId}`
                        : undefined
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      setRowMenuOpen(rowMenuOpen === item.sessionId ? null : item.sessionId)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#E5E5E5'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
                      <circle cx="2" cy="2" r="1.5" fill="#6B7280" />
                      <circle cx="8" cy="2" r="1.5" fill="#6B7280" />
                      <circle cx="14" cy="2" r="1.5" fill="#6B7280" />
                    </svg>
                  </IconButton>

                  {rowMenuOpen === item.sessionId && (
                    <div
                      id={`history-actions-menu-${item.sessionId}`}
                      role="menu"
                      aria-labelledby={`history-actions-${item.sessionId}`}
                      onKeyDown={(event) => handleMenuKeyDown(event, item)}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #EDEDED',
                        borderRadius: '8px',
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                        minWidth: '140px',
                        zIndex: 100,
                        overflow: 'hidden',
                      }}
                    >
                      <Button
                        role="menuitem"
                        onClick={async (event) => {
                          event.stopPropagation()
                          setRowMenuOpen(null)
                          await onDelete(item)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 510,
                          color: '#DC2626',
                          fontFamily,
                          textAlign: 'left',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = '#FEF2F2'
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 4H14"
                            stroke="#DC2626"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4"
                            stroke="#DC2626"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4"
                            stroke="#DC2626"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M6.66667 7.33333V11.3333"
                            stroke="#DC2626"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9.33333 7.33333V11.3333"
                            stroke="#DC2626"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
