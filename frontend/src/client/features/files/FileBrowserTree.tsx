import type { RefObject } from 'react'
import folderIconSmall from '../../assets/folder-icon-small.svg'
import searchIcon from '../../assets/search-icon.svg'
import sortIcon from '../../assets/sort-icon.svg'
import type { BrowseFile } from './fileBrowserTypes'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface FileBrowserTreeProps {
  currentPath: string[]
  folders: BrowseFile[]
  searchInputRef: RefObject<HTMLInputElement | null>
  searchQuery: string
  onNavigateFolder: (folderName: string) => void
  onNavigatePath: (index: number) => void
  onNavigateRoot: () => void
  onSearchQueryChange: (query: string) => void
}

export function FileBrowserTree({
  currentPath,
  folders,
  searchInputRef,
  searchQuery,
  onNavigateFolder,
  onNavigatePath,
  onNavigateRoot,
  onSearchQueryChange,
}: FileBrowserTreeProps) {
  return (
    <>
      <div
        style={{
          borderTop: '1px solid #EDEDED',
          borderBottom: '1px solid #EDEDED',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <PathButton active={currentPath.length === 0} label="All Files" onClick={onNavigateRoot} />
        {currentPath.length === 0 &&
          folders.map((folder) => (
            <PathSegment key={folder.id}>
              <PathButton
                active={false}
                label={folder.name}
                onClick={() => onNavigateFolder(folder.name)}
              />
            </PathSegment>
          ))}
        {currentPath.map((pathItem, index) => (
          <PathSegment key={index}>
            <PathButton
              active={index === currentPath.length - 1}
              label={pathItem}
              onClick={() => onNavigatePath(index)}
            />
          </PathSegment>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '40px',
            padding: '10px',
            backgroundColor: '#F7F7F7',
            border: '1px solid #EDEDED',
            borderRadius: '13px',
          }}
        >
          <img
            src={searchIcon}
            alt=""
            style={{ width: '17px', height: '17px', transform: 'rotate(270deg)' }}
          />
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Search files"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search for Contract, case, Anything"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '16px',
              color: '#272727',
              fontFamily,
            }}
          />
        </div>
        <img src={sortIcon} alt="" style={{ width: '24px', height: '24px' }} />
      </div>
    </>
  )
}

function PathSegment({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <div style={{ width: '1px', height: '22px', backgroundColor: '#EDEDED' }} />
      {children}
    </div>
  )
}

function PathButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        cursor: 'pointer',
        flexShrink: 0,
        border: 'none',
        background: 'transparent',
        padding: 0,
        fontFamily,
      }}
    >
      <img src={folderIconSmall} alt="" style={{ width: '22px', height: '22px' }} />
      <span style={{ fontSize: '16px', color: active ? '#454545' : '#999999' }}>{label}</span>
    </button>
  )
}
