import { useEffect, useRef, useState } from 'react'
import reviewSearchIcon from '../../assets/review/search-icon.svg'
import reviewNewIcon from '../../assets/review/new-icon.svg'
import type { Project } from '../../store/types'
import { reviewFontFamily as fontFamily } from './reviewModel'
import {
  handleReviewPopupFocus,
  handleReviewPopupKeyDown as handlePopupKeyDown,
} from './reviewPopupKeyboard'

const ownershipOptions = [
  { id: 'all', label: 'All Reviews' },
  { id: 'owned', label: 'My Reviews' },
  { id: 'shared', label: 'Shared with Me' },
] as const

interface ReviewListToolbarProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  projects: Project[]
  projectFilter: string
  onProjectFilterChange: (projectId: string) => void
  ownershipFilter: 'all' | 'owned' | 'shared'
  onOwnershipFilterChange: (ownership: 'all' | 'owned' | 'shared') => void
  onCreate: () => void
}

export function ReviewListToolbar({
  searchQuery,
  onSearchQueryChange: setSearchQuery,
  projects,
  projectFilter,
  onProjectFilterChange: setProjectFilter,
  ownershipFilter,
  onOwnershipFilterChange: setOwnershipFilter,
  onCreate,
}: ReviewListToolbarProps) {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const activeFilterCount = (projectFilter !== 'all' ? 1 : 0) + (ownershipFilter !== 'all' ? 1 : 0)

  useEffect(() => {
    if (!filterDropdownOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterDropdownOpen])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid #EDEDED',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="3" width="18" height="16" rx="2" stroke="#454545" strokeWidth="1.5" />
            <path d="M2 8H20" stroke="#454545" strokeWidth="1.5" />
            <path d="M8 8V19" stroke="#454545" strokeWidth="1.5" />
          </svg>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 590,
              color: '#454545',
              letterSpacing: '-0.5px',
            }}
          >
            Tabular Reviews
          </h1>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '320px',
            height: '32px',
            backgroundColor: '#F7F7F7',
            borderRadius: '8px',
            padding: '0 10px',
          }}
        >
          <img
            src={reviewSearchIcon}
            alt=""
            style={{ width: '17px', height: '17px', transform: 'scaleX(-1)' }}
          />
          <input
            data-global-search
            aria-label="Search reviews"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontFamily,
              fontSize: '14px',
              color: '#454545',
            }}
          />
        </div>

        <div ref={filterDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={filterDropdownOpen}
            aria-controls="review-filter-menu"
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              backgroundColor:
                filterDropdownOpen || activeFilterCount > 0 ? '#F7F7F7' : 'transparent',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4H14M4 8H12M6 12H10"
                stroke="#454545"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.3px',
              }}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: filterDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#454545"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {filterDropdownOpen && (
            <div
              id="review-filter-menu"
              role="menu"
              aria-label="Review filters"
              onFocus={handleReviewPopupFocus}
              onKeyDown={(event) =>
                handlePopupKeyDown(event, (reason) => {
                  setFilterDropdownOpen(false)
                  if (reason === 'escape') {
                    requestAnimationFrame(() =>
                      filterDropdownRef.current
                        ?.querySelector<HTMLButtonElement>('button')
                        ?.focus(),
                    )
                  }
                })
              }
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                minWidth: '220px',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #F3F3F3' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 590,
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Project
                </span>
              </div>
              <button
                autoFocus
                type="button"
                role="menuitemradio"
                tabIndex={0}
                aria-checked={projectFilter === 'all'}
                onClick={() => setProjectFilter('all')}
                style={{
                  width: '100%',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: projectFilter === 'all' ? '#F7F7F7' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (projectFilter !== 'all') e.currentTarget.style.backgroundColor = '#FAFAFA'
                }}
                onMouseLeave={(e) => {
                  if (projectFilter !== 'all') e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>
                  All Projects
                </span>
                {projectFilter === 'all' && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8L6.5 11L12.5 5"
                      stroke="#338CE4"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              {projects.slice(0, 5).map((project) => (
                <button
                  type="button"
                  role="menuitemradio"
                  tabIndex={-1}
                  aria-checked={projectFilter === project.id}
                  key={project.id}
                  onClick={() => setProjectFilter(project.id)}
                  style={{
                    width: '100%',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: projectFilter === project.id ? '#F7F7F7' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (projectFilter !== project.id)
                      e.currentTarget.style.backgroundColor = '#FAFAFA'
                  }}
                  onMouseLeave={(e) => {
                    if (projectFilter !== project.id)
                      e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '160px',
                    }}
                  >
                    {project.name}
                  </span>
                  {projectFilter === project.id && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3.5 8L6.5 11L12.5 5"
                        stroke="#338CE4"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}

              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #F3F3F3',
                  borderTop: '1px solid #F3F3F3',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 590,
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Ownership
                </span>
              </div>
              {ownershipOptions.map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  tabIndex={-1}
                  aria-checked={ownershipFilter === option.id}
                  key={option.id}
                  onClick={() => setOwnershipFilter(option.id)}
                  style={{
                    width: '100%',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: ownershipFilter === option.id ? '#F7F7F7' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (ownershipFilter !== option.id)
                      e.currentTarget.style.backgroundColor = '#FAFAFA'
                  }}
                  onMouseLeave={(e) => {
                    if (ownershipFilter !== option.id)
                      e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>
                    {option.label}
                  </span>
                  {ownershipFilter === option.id && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3.5 8L6.5 11L12.5 5"
                        stroke="#338CE4"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}

              {activeFilterCount > 0 && (
                <>
                  <div style={{ height: '1px', backgroundColor: '#F3F3F3', margin: '4px 0' }} />
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      setProjectFilter('all')
                      setOwnershipFilter('all')
                      setFilterDropdownOpen(false)
                      requestAnimationFrame(() =>
                        filterDropdownRef.current
                          ?.querySelector<HTMLButtonElement>('button')
                          ?.focus(),
                      )
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 510, color: '#E53935' }}>
                      Clear All Filters
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCreate()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '34px',
          padding: '0 14px',
          backgroundColor: '#272727',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '9px',
          cursor: 'pointer',
          fontFamily,
        }}
      >
        <img
          src={reviewNewIcon}
          alt=""
          style={{ width: '13px', height: '13px', filter: 'brightness(0) invert(1)' }}
        />
        New Review
      </button>
    </div>
  )
}
