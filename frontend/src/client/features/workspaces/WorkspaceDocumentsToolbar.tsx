import searchIcon from '../../assets/library/search-icon.svg'
import { Button, IconButton } from '../../components/ui/Button'
import { EditIcon, FileAddIcon, FilterIcon, SortIcon, TrashIcon } from './WorkspaceDetailIcons'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceDocumentsSession } from './useWorkspaceDocumentsSession'
import type { WorkspaceDocumentFilter, WorkspaceDocumentSort } from './workspaceModels'

const filterOptions: Array<{
  key: WorkspaceDocumentFilter
  label: string
  color: string
}> = [
  { key: 'pdf', label: 'PDF', color: '#DC2626' },
  { key: 'word', label: 'Word', color: '#2563EB' },
  { key: 'other', label: 'Other', color: '#6B7280' },
]

const sortOptions: Array<{ key: WorkspaceDocumentSort; label: string }> = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'name-asc', label: 'Name A-Z' },
  { key: 'name-desc', label: 'Name Z-A' },
]

interface WorkspaceDocumentsToolbarProps {
  session: WorkspaceDocumentsSession
  isViewer: boolean
}

export function WorkspaceDocumentsToolbar({ session, isViewer }: WorkspaceDocumentsToolbarProps) {
  const sortLabel = {
    newest: 'Newest',
    oldest: 'Oldest',
    'name-asc': 'Name A-Z',
    'name-desc': 'Name Z-A',
  }[session.sort]
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #EDEDED',
        padding: '9px 15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
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
            aria-label="Search workspace documents"
            value={session.searchQuery}
            onChange={(event) => session.actions.setSearchQuery(event.target.value)}
            placeholder="Search for Contract, case, Anything"
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
              outline: 'none',
              fontFamily: workspaceFont,
            }}
          />
        </div>
        <div ref={session.refs.filterContainerRef} style={{ position: 'relative' }}>
          <Button
            ref={session.refs.filterButtonRef}
            aria-haspopup="menu"
            aria-expanded={session.filterOpen}
            aria-controls={session.filterOpen ? 'workspace-filter-menu' : undefined}
            onClick={session.actions.toggleFilterMenu}
            style={menuButtonStyle}
          >
            <FilterIcon />
            <span style={menuButtonLabelStyle}>
              Filters{session.filters.length > 0 ? ` (${session.filters.length})` : ''}
            </span>
          </Button>
          {session.filterOpen && (
            <div
              ref={session.refs.filterMenuRef}
              id="workspace-filter-menu"
              role="menu"
              aria-label="Filter documents"
              style={menuStyle}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 590,
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                File Type
              </div>
              {filterOptions.map((filter) => {
                const active = session.filters.includes(filter.key)
                return (
                  <Button
                    key={filter.key}
                    role="menuitemcheckbox"
                    aria-checked={active}
                    onClick={() => session.actions.toggleFilter(filter.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: active ? '#F7F7F7' : 'transparent',
                      transition: 'background-color 0.1s ease',
                      border: 'none',
                      width: '100%',
                      fontFamily: workspaceFont,
                      textAlign: 'left',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#F7F7F7'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = active ? '#F7F7F7' : 'transparent'
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: active ? 'none' : '2px solid #D9D9D9',
                        backgroundColor: active ? '#7C3AED' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {active && (
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
                  </Button>
                )
              })}
              {session.filters.length > 0 && (
                <>
                  <div style={{ height: '1px', backgroundColor: '#EDEDED', margin: '8px 0' }} />
                  <Button
                    role="menuitem"
                    onClick={session.actions.clearFilters}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#DC2626',
                      border: 'none',
                      width: '100%',
                      backgroundColor: 'transparent',
                      fontFamily: workspaceFont,
                      textAlign: 'left',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#FEE2E2'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <div ref={session.refs.sortContainerRef} style={{ position: 'relative' }}>
          <Button
            ref={session.refs.sortButtonRef}
            aria-haspopup="menu"
            aria-expanded={session.sortOpen}
            aria-controls={session.sortOpen ? 'workspace-sort-menu' : undefined}
            onClick={session.actions.toggleSortMenu}
            style={menuButtonStyle}
          >
            <SortIcon />
            <span style={menuButtonLabelStyle}>Sort : {sortLabel}</span>
          </Button>
          {session.sortOpen && (
            <div
              ref={session.refs.sortMenuRef}
              id="workspace-sort-menu"
              role="menu"
              aria-label="Sort documents"
              style={{ ...menuStyle, minWidth: '140px' }}
            >
              {sortOptions.map((option) => (
                <Button
                  key={option.key}
                  role="menuitemradio"
                  aria-checked={session.sort === option.key}
                  onClick={() => session.actions.setSort(option.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: session.sort === option.key ? '#F7F7F7' : 'transparent',
                    transition: 'background-color 0.1s ease',
                    border: 'none',
                    width: '100%',
                    fontFamily: workspaceFont,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = '#F7F7F7'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor =
                      session.sort === option.key ? '#F7F7F7' : 'transparent'
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: session.sort === option.key ? 510 : 400,
                      color: session.sort === option.key ? '#7C3AED' : '#454545',
                    }}
                  >
                    {option.label}
                  </span>
                  {session.sort === option.key && (
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
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isViewer && (
          <Button onClick={session.actions.openAddFiles} style={menuButtonStyle}>
            <FileAddIcon />
            <span style={menuButtonLabelStyle}>Add a Document</span>
          </Button>
        )}
        <IconButton
          label="Delete selected documents"
          onClick={() => session.selectedIds.size > 0 && session.actions.requestDelete()}
          disabled={session.selectedIds.size === 0}
          style={iconButtonStyle(session.selectedIds.size > 0)}
        >
          <TrashIcon />
        </IconButton>
        <IconButton
          label="Edit selected document"
          disabled={session.selectedIds.size !== 1}
          onClick={session.actions.editSelected}
          style={iconButtonStyle(session.selectedIds.size === 1)}
        >
          <EditIcon />
        </IconButton>
      </div>
    </div>
  )
}

const menuButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '32px',
  padding: '6px 10px',
  border: '1px solid #EDEDED',
  borderRadius: '7px',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  fontFamily: workspaceFont,
}

const menuButtonLabelStyle = {
  fontSize: '14px',
  fontWeight: 510,
  color: '#454545',
  letterSpacing: '-0.7px',
}

const menuStyle = {
  position: 'absolute' as const,
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
}

function iconButtonStyle(enabled: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: '1px solid #EDEDED',
    borderRadius: '7px',
    backgroundColor: 'white',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
  }
}
