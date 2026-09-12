import searchIcon from '../../assets/library/search-icon.svg'
import sortIcon from '../../assets/library/sort-icon.svg'
import newPlusIcon from '../../assets/library/new-plus-icon.svg'
import { Button } from '../../components/ui/Button'
import { Tab, TabList, Tabs } from '../../components/ui/Tabs'
import { documentFontFamily, type DocumentSort } from './documentLibraryModel'
import type { DocumentsScreenSession } from './useDocumentsScreen'

const documentSortOptions: DocumentSort[] = ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A']

export function DocumentsToolbar({ session }: { session: DocumentsScreenSession }) {
  const {
    isShared,
    statusFilter,
    searchQuery,
    sortDropdownOpen,
    sortBy,
    refs: { sortDropdownRef, sortButtonRef, sortMenuRef },
    actions: { setStatusFilter, setSearchQuery, setSortDropdownOpen, setSortBy, newDocument },
  } = session
  const fontFamily = documentFontFamily

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 590,
            color: '#454545',
            letterSpacing: '-0.24px',
            lineHeight: '32px',
            fontFamily,
            whiteSpace: 'nowrap',
          }}
        >
          {isShared ? 'Shared Documents' : 'Documents'}
        </h1>

        <Tabs
          value={statusFilter}
          onValueChange={(value) => {
            if (value === 'active' || value === 'done') setStatusFilter(value)
          }}
        >
          <TabList
            aria-label="Document status"
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F5F5F5',
              borderRadius: '8px',
              padding: '3px',
            }}
          >
            {(['active', 'done'] as const).map((value) => (
              <Tab
                key={value}
                value={value}
                controls="documents-results"
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 510,
                  color: statusFilter === value ? '#272727' : '#797979',
                  backgroundColor: statusFilter === value ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  letterSpacing: '-0.65px',
                  fontFamily,
                  boxShadow: statusFilter === value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {value === 'active' ? 'Active' : 'Done'}
              </Tab>
            ))}
          </TabList>
        </Tabs>

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
              aria-label={isShared ? 'Search shared documents' : 'Search documents'}
              data-global-search
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={isShared ? 'Search shared documents...' : 'Search documents...'}
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

          <div ref={sortDropdownRef} style={{ position: 'relative' }}>
            <Button
              ref={sortButtonRef}
              aria-label={`Sort : ${sortBy}`}
              aria-expanded={sortDropdownOpen}
              aria-haspopup="menu"
              aria-controls={sortDropdownOpen ? 'documents-sort-menu' : undefined}
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '6px 10px',
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
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                  lineHeight: '21px',
                }}
              >
                Sort : {sortBy}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                style={{
                  transform: sortDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
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
            </Button>

            {sortDropdownOpen && (
              <div
                ref={sortMenuRef}
                id="documents-sort-menu"
                role="menu"
                aria-label="Sort documents"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDEDED',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  minWidth: '160px',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                {documentSortOptions.map((option) => (
                  <Button
                    key={option}
                    role="menuitemradio"
                    aria-checked={sortBy === option}
                    onClick={() => {
                      setSortBy(option)
                      setSortDropdownOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: sortBy === option ? '#F7F7F7' : 'transparent',
                      transition: 'background-color 0.15s',
                      border: 'none',
                      width: '100%',
                      fontFamily,
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 510,
                        color: '#454545',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      {option}
                    </span>
                    {sortBy === option && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3.5 8L6.5 11L12.5 5"
                          stroke="#338CE4"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isShared && (
        <Button
          onClick={newDocument}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '32px',
            padding: '7px 24px',
            backgroundColor: '#F7F7F7',
            border: 'none',
            borderRadius: '7px',
            cursor: 'pointer',
            fontFamily,
          }}
        >
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
            New
          </span>
        </Button>
      )}
    </div>
  )
}
