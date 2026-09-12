import { useEffect, useRef, useState } from 'react'
import clockIcon from '../../../assets/conversation/clock-icon.svg'
import searchIcon from '../../../assets/models/search-icon.svg'
import newPlusIcon from '../../../assets/library/new-plus-icon.svg'
import sortIcon from '../../../assets/library/sort-icon.svg'
import { Button } from '../../../components/ui/Button'
import type { HistorySort } from './historyModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'
const sortOptions: HistorySort[] = ['Newest', 'Oldest', 'A-Z', 'Z-A']

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  height: '32px',
  padding: '7px 24px',
  backgroundColor: '#FFF',
  border: 'none',
  borderRadius: '7px',
  cursor: 'pointer',
  fontFamily,
}

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M10 12L6 8L10 4"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface HistoryToolbarProps {
  searchQuery: string
  sortBy: HistorySort
  onSearchQueryChange: (value: string) => void
  onSortChange: (value: HistorySort) => void
  onBack: () => void
  onNewChat: () => void
}

export function HistoryToolbar({
  searchQuery,
  sortBy,
  onSearchQueryChange,
  onSortChange,
  onBack,
  onNewChat,
}: HistoryToolbarProps) {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!sortDropdownOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setSortDropdownOpen(false)
      document.getElementById('history-sort-trigger')?.focus()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sortDropdownOpen])

  useEffect(() => {
    if (sortDropdownOpen) {
      sortDropdownRef.current
        ?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')
        ?.focus()
    }
  }, [sortDropdownOpen])

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, closeMenu: () => void) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    )
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return
    }
    if (event.key === 'Tab') {
      closeMenu()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || items.length === 0) {
      return
    }

    event.preventDefault()
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length
    items[nextIndex]?.focus()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid #EDEDED',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button onClick={onBack} style={btnStyle}>
          <BackArrowIcon />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={clockIcon} alt="" style={{ width: '16px', height: '16px' }} />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#454545',
                marginLeft: '8px',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                fontFamily,
              }}
            >
              History
            </span>
          </div>
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '434px',
          height: '32px',
          backgroundColor: '#F7F7F7',
          borderRadius: '8px',
          padding: '0 10px',
        }}
      >
        <img
          src={searchIcon}
          alt=""
          style={{ width: '17px', height: '17px', transform: 'scaleX(-1)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          aria-label="Search conversation history"
          placeholder="Search for previous chats, Anything"
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            outline: 'none',
            fontFamily,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Button onClick={onNewChat} style={btnStyle}>
          <img src={newPlusIcon} alt="" style={{ width: '13px', height: '13px' }} />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
            }}
          >
            New Chat
          </span>
        </Button>

        <div ref={sortDropdownRef} style={{ position: 'relative' }}>
          <Button
            id="history-sort-trigger"
            aria-haspopup="menu"
            aria-expanded={sortDropdownOpen}
            aria-controls="history-sort-menu"
            onClick={() => {
              setSortDropdownOpen(!sortDropdownOpen)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '6px 12px',
              backgroundColor: sortDropdownOpen ? '#F7F7F7' : 'transparent',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            <img src={sortIcon} alt="" style={{ width: '16px', height: '16px' }} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
              }}
            >
              Sort: {sortBy}
            </span>
          </Button>

          {sortDropdownOpen && (
            <div
              id="history-sort-menu"
              role="menu"
              aria-labelledby="history-sort-trigger"
              onKeyDown={(event) =>
                handleMenuKeyDown(event, () => {
                  setSortDropdownOpen(false)
                  document.getElementById('history-sort-trigger')?.focus()
                })
              }
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                minWidth: '120px',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              {sortOptions.map((option) => (
                <Button
                  role="menuitemradio"
                  aria-checked={sortBy === option}
                  key={option}
                  onClick={() => {
                    onSortChange(option)
                    setSortDropdownOpen(false)
                    document.getElementById('history-sort-trigger')?.focus()
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    backgroundColor: sortBy === option ? '#F7F7F7' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#454545',
                    fontFamily,
                    textAlign: 'left',
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
