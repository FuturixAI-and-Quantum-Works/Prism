import { useEffect, useRef, useState } from 'react'
import directboxSendIcon from '../../assets/compliance/directbox-send.svg'
import filterSearchIcon from '../../assets/compliance/filter-search-icon.svg'
import searchIcon from '../../assets/compliance/search-02.svg'
import sortIcon from '../../assets/compliance/sort-icon.svg'
import { complianceSortLabels, type ComplianceSortOption } from './reviewListModel'
import { complianceFontFamily, handlePopupKeyDown } from './compliancePresentation'

interface ComplianceListToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeFilters: string[]
  onToggleFilter: (filter: string) => void
  onClearFilters: () => void
  sortOption: ComplianceSortOption
  onSortChange: (sort: ComplianceSortOption) => void
  onUpload: () => void
  onOpenProjectPicker: () => void
}

const filters = [
  { key: 'high', label: 'High Risk', color: '#EF4444' },
  { key: 'medium', label: 'Medium Risk', color: '#F59E0B' },
  { key: 'low', label: 'Low Risk', color: '#22C55E' },
]

const sortOptions: Array<{ key: ComplianceSortOption; label: string }> = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'name-asc', label: 'Name A-Z' },
  { key: 'name-desc', label: 'Name Z-A' },
  { key: 'score-high', label: 'Score High-Low' },
  { key: 'score-low', label: 'Score Low-High' },
]

export function ComplianceListToolbar({
  searchQuery,
  onSearchChange,
  activeFilters,
  onToggleFilter,
  onClearFilters,
  sortOption,
  onSortChange,
  onUpload,
  onOpenProjectPicker,
}: ComplianceListToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false)
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  useEffect(() => {
    if (!filterOpen) return
    requestAnimationFrame(() => {
      filterRef.current?.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')?.focus()
    })
  }, [filterOpen])

  useEffect(() => {
    if (!sortOpen) return
    requestAnimationFrame(() => {
      sortRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
    })
  }, [sortOpen])

  const closeFilter = () => {
    setFilterOpen(false)
    requestAnimationFrame(() =>
      filterRef.current?.querySelector<HTMLButtonElement>('button')?.focus(),
    )
  }
  const closeSort = () => {
    setSortOpen(false)
    requestAnimationFrame(() =>
      sortRef.current?.querySelector<HTMLButtonElement>('button')?.focus(),
    )
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
        padding: '0 18px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EDEDED',
      }}
    >
      <div style={{ width: '342px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.9px',
            lineHeight: '21px',
            fontFamily: complianceFontFamily,
          }}
        >
          Compliance Review
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '334px',
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
            aria-label="Search compliance reviews"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search for Contract,case,Anything "
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              outline: 'none',
              fontFamily: complianceFontFamily,
              letterSpacing: '-0.7px',
            }}
          />
        </div>

        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={filterOpen}
            aria-controls="compliance-filter-menu"
            onClick={() => {
              setFilterOpen(!filterOpen)
              setSortOpen(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 10px',
              backgroundColor: filterOpen || activeFilters.length ? '#F0F0F0' : 'transparent',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              fontFamily: complianceFontFamily,
              transition: 'background-color 0.15s ease',
            }}
          >
            <img src={filterSearchIcon} alt="" style={{ width: '16px', height: '16px' }} />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
              }}
            >
              Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}
            </span>
          </button>
          {filterOpen && (
            <div
              id="compliance-filter-menu"
              role="menu"
              aria-label="Filter compliance reviews"
              onKeyDown={(event) =>
                handlePopupKeyDown(
                  event,
                  '[role="menuitemcheckbox"], [role="menuitem"]',
                  closeFilter,
                )
              }
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                border: '1px solid #EDEDED',
                padding: '8px 0',
                minWidth: '160px',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 590,
                  color: '#999999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Risk Status
              </div>
              {filters.map((filter) => {
                const checked = activeFilters.includes(filter.key)
                return (
                  <button
                    key={filter.key}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() => onToggleFilter(filter.key)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      border: 'none',
                      fontFamily: complianceFontFamily,
                      textAlign: 'left',
                      backgroundColor: checked ? '#F7F7F7' : 'transparent',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#F7F7F7'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = checked
                        ? '#F7F7F7'
                        : 'transparent'
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: checked ? 'none' : '2px solid #D9D9D9',
                        backgroundColor: checked ? '#7C3AED' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span style={{ fontSize: '14px', color: '#454545' }}>{filter.label}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: filter.color,
                      }}
                    />
                  </button>
                )
              })}
              {activeFilters.length > 0 && (
                <>
                  <div style={{ height: '1px', backgroundColor: '#EDEDED', margin: '8px 0' }} />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onClearFilters}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#DC2626',
                      border: 'none',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      fontFamily: complianceFontFamily,
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#FEE2E2'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-controls="compliance-sort-listbox"
            onClick={() => {
              setSortOpen(!sortOpen)
              setFilterOpen(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 10px',
              backgroundColor: sortOpen ? '#F0F0F0' : 'transparent',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              fontFamily: complianceFontFamily,
              transition: 'background-color 0.15s ease',
            }}
          >
            <img src={sortIcon} alt="" style={{ width: '16px', height: '16px' }} />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
              }}
            >
              Sort: <span style={{ fontWeight: 510 }}>{complianceSortLabels[sortOption]}</span>
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                marginLeft: '2px',
                transform: sortOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
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
          {sortOpen && (
            <div
              id="compliance-sort-listbox"
              role="listbox"
              aria-label="Sort compliance reviews"
              onKeyDown={(event) => handlePopupKeyDown(event, '[role="option"]', closeSort)}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                border: '1px solid #EDEDED',
                padding: '8px 0',
                minWidth: '160px',
                zIndex: 100,
              }}
            >
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="option"
                  aria-selected={sortOption === option.key}
                  onClick={() => {
                    onSortChange(option.key)
                    closeSort()
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: complianceFontFamily,
                    textAlign: 'left',
                    backgroundColor: sortOption === option.key ? '#F7F7F7' : 'transparent',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = '#F7F7F7'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor =
                      sortOption === option.key ? '#F7F7F7' : 'transparent'
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: sortOption === option.key ? 510 : 400,
                      color: sortOption === option.key ? '#7C3AED' : '#454545',
                    }}
                  >
                    {option.label}
                  </span>
                  {sortOption === option.key && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ marginLeft: 'auto' }}
                    >
                      <path
                        d="M2.5 7L5.5 10L11.5 4"
                        stroke="#7C3AED"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          width: '418px',
          justifyContent: 'flex-end',
        }}
      >
        <ToolbarButton
          icon={directboxSendIcon}
          label="Upload Document"
          onClick={onUpload}
          spacious
        />
        <ToolbarButton label="From Project" onClick={onOpenProjectPicker} folder spacious />
      </div>
    </header>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  folder = false,
  spacious = false,
}: {
  icon?: string
  label: string
  onClick: () => void
  folder?: boolean
  spacious?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacious ? '8px' : '4px',
        height: '32px',
        padding: '8px 14px',
        backgroundColor: '#FFFFFF',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontFamily: complianceFontFamily,
      }}
    >
      {folder ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M14 4H8.5L7.5 2.5C7.3 2.2 6.9 2 6.5 2H2C1.4 2 1 2.4 1 3V13C1 13.6 1.4 14 2 14H14C14.6 14 15 13.6 15 13V5C15 4.4 14.6 4 14 4Z"
            stroke="#454545"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <img src={icon} alt="" style={{ width: '16px', height: '16px' }} />
      )}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.7px',
          lineHeight: '16px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  )
}
