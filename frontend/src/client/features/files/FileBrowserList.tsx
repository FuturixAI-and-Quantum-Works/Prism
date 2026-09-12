import type { KeyboardEvent } from 'react'
import folderFileIcon from '../../assets/folder-file-icon.svg'
import pdfFileIcon from '../../assets/pdf-file-icon.svg'
import tickCircleIcon from '../../assets/tick-circle-icon.svg'
import wordFileIcon from '../../assets/word-file-icon.svg'
import type { FileBrowserGroups } from './fileBrowserModel'
import type { BrowseFile } from './fileBrowserTypes'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface FileInteractionProps {
  fileKeyboardHelpId: string
  selectedFiles: ReadonlySet<string>
  onActivate: (file: BrowseFile) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, file: BrowseFile) => void
  onPreview: (file: BrowseFile) => void
}

interface FileBrowserListProps extends FileInteractionProps {
  groups: FileBrowserGroups
}

export function FileBrowserList({
  fileKeyboardHelpId,
  groups,
  selectedFiles,
  onActivate,
  onKeyDown,
  onPreview,
}: FileBrowserListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
      <span
        id={fileKeyboardHelpId}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Press Enter or Space to select a file. Press Shift+Enter to preview it.
      </span>
      <FileGroup
        label="Recent"
        files={groups.recent}
        fileKeyboardHelpId={fileKeyboardHelpId}
        selectedFiles={selectedFiles}
        onActivate={onActivate}
        onKeyDown={onKeyDown}
        onPreview={onPreview}
      />
      <FileGroup
        label="Yesterday"
        files={groups.yesterday}
        fileKeyboardHelpId={fileKeyboardHelpId}
        selectedFiles={selectedFiles}
        onActivate={onActivate}
        onKeyDown={onKeyDown}
        onPreview={onPreview}
        padded
      />
    </div>
  )
}

function FileGroup({
  label,
  files,
  fileKeyboardHelpId,
  selectedFiles,
  onActivate,
  onKeyDown,
  onPreview,
  padded = false,
}: FileInteractionProps & {
  label: string
  files: BrowseFile[]
  padded?: boolean
}) {
  if (files.length === 0) return null
  return (
    <div>
      <div style={{ padding: padded ? '8px 20px' : '0 20px 8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 510, color: '#999999' }}>{label}</span>
      </div>
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          fileKeyboardHelpId={fileKeyboardHelpId}
          selected={selectedFiles.has(file.id)}
          onActivate={onActivate}
          onKeyDown={onKeyDown}
          onPreview={onPreview}
        />
      ))}
    </div>
  )
}

function FileRow({
  file,
  fileKeyboardHelpId,
  selected,
  onActivate,
  onKeyDown,
  onPreview,
}: {
  file: BrowseFile
  fileKeyboardHelpId: string
  selected: boolean
  onActivate: (file: BrowseFile) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, file: BrowseFile) => void
  onPreview: (file: BrowseFile) => void
}) {
  return (
    <button
      type="button"
      aria-label={`${file.name}, ${file.type === 'folder' ? 'folder' : 'file'}`}
      aria-pressed={file.type === 'folder' ? undefined : selected}
      aria-describedby={file.type === 'folder' ? undefined : fileKeyboardHelpId}
      aria-keyshortcuts={file.type === 'folder' ? undefined : 'Shift+Enter'}
      onClick={() => onActivate(file)}
      onKeyDown={(event) => onKeyDown(event, file)}
      onDoubleClick={() => onPreview(file)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        cursor: 'pointer',
        backgroundColor: selected ? '#E8F4FD' : 'transparent',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        fontFamily,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={getFileIcon(file.type)}
          alt=""
          style={{
            width: file.type === 'folder' ? '40px' : '42px',
            height: file.type === 'folder' ? '40px' : '42px',
          }}
        />
        <div>
          <span style={{ fontSize: '16px', color: '#454545', display: 'block' }}>{file.name}</span>
          <span style={{ fontSize: '12px', fontWeight: 510, color: '#999999' }}>{file.date}</span>
        </div>
      </div>
      {selected && file.type !== 'folder' && (
        <img src={tickCircleIcon} alt="" style={{ width: '24px', height: '24px' }} />
      )}
    </button>
  )
}

function getFileIcon(type: BrowseFile['type']) {
  switch (type) {
    case 'folder':
      return folderFileIcon
    case 'word':
      return wordFileIcon
    case 'pdf':
    case 'image':
    case 'other':
      return pdfFileIcon
  }
}
