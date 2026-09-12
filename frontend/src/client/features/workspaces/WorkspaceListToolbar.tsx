import searchIcon from '../../assets/library/search-icon.svg'
import sortIcon from '../../assets/library/sort-icon.svg'
import newPlusIcon from '../../assets/library/new-plus-icon.svg'
import { Button } from '../../components/ui/Button'
import type { WorkspaceListSession } from './useWorkspaceListSession'
import { workspaceFont, type WorkspaceListSort } from './workspaceModels'

const sortOptions: WorkspaceListSort[] = ['Newest', 'Oldest', 'Name A-Z', 'Name Z-A']

export function WorkspaceListToolbar({ session }: { session: WorkspaceListSession }) {
  const {
    filter,
    searchQuery,
    setCreateWorkspaceModalOpen,
    setSearchQuery,
    setSortBy,
    setSortDropdownOpen,
    sortButtonRef,
    sortBy,
    sortDropdownOpen,
    sortDropdownRef,
    sortMenuRef,
  } = session

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
            aria-label="Search projects"
            data-global-search
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
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
              fontFamily: workspaceFont,
            }}
          />
        </div>

        <div ref={sortDropdownRef} style={{ position: 'relative' }}>
          <Button
            ref={sortButtonRef}
            aria-expanded={sortDropdownOpen}
            aria-haspopup="menu"
            aria-controls={sortDropdownOpen ? 'workspace-sort-menu' : undefined}
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
              fontFamily: workspaceFont,
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
              id="workspace-sort-menu"
              role="menu"
              aria-label="Sort workspaces"
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
              {sortOptions.map((option) => (
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
                    fontFamily: workspaceFont,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(event) => {
                    if (sortBy !== option) event.currentTarget.style.backgroundColor = '#FAFAFA'
                  }}
                  onMouseLeave={(event) => {
                    if (sortBy !== option) event.currentTarget.style.backgroundColor = 'transparent'
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
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filter !== 'shared' && (
        <Button
          onClick={() => setCreateWorkspaceModalOpen(true)}
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
            fontFamily: workspaceFont,
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
