import { describe, expect, it } from 'vitest'
import {
  groupDisplayedFiles,
  selectAllDisplayedFiles,
  selectDisplayedFiles,
  toPreviewFile,
  toggleSelectedFile,
} from './fileBrowserModel'
import type { BrowseFile } from './fileBrowserTypes'

const files: BrowseFile[] = [
  { id: 'folder', name: 'Matter', type: 'folder', date: 'Today' },
  { id: 'nested', name: 'Nested.pdf', type: 'pdf', date: 'Today', path: ['Matter'] },
  { id: 'root', name: 'Root.docx', type: 'word', date: 'Yesterday' },
]

describe('fileBrowserModel', () => {
  it('keeps root, nested-path, and global-search selection semantics', () => {
    expect(selectDisplayedFiles(files, [], '')).toEqual(files)
    expect(selectDisplayedFiles(files, ['Matter'], '')).toEqual([files[1]])
    expect(selectDisplayedFiles(files, ['Matter'], 'root')).toEqual([files[2]])
    expect(selectDisplayedFiles(files, ['Matter'], ' root ')).toEqual([])
  })

  it('groups the first seven displayed items as recent', () => {
    const displayed = Array.from({ length: 9 }, (_, index) => ({
      id: `${index}`,
      name: `File ${index}`,
      type: 'pdf' as const,
      date: 'Today',
    }))

    expect(groupDisplayedFiles(displayed)).toEqual({
      recent: displayed.slice(0, 7),
      yesterday: displayed.slice(7),
    })
  })

  it('applies single-select and maximum-selection policies without mutating the input', () => {
    const selected = new Set(['nested'])

    expect(toggleSelectedFile(selected, 'root', { maxSelection: 1 })).toEqual(selected)
    expect(toggleSelectedFile(selected, 'root', { singleSelectMode: true })).toEqual(
      new Set(['root']),
    )
    expect(selected).toEqual(new Set(['nested']))
    expect(selectAllDisplayedFiles(files, { maxSelection: 2 })).toEqual(
      new Set(['folder', 'nested']),
    )
    expect(selectAllDisplayedFiles(files, { singleSelectMode: true })).toBeNull()
  })

  it('maps preview metadata without changing fallback behavior', () => {
    expect(toPreviewFile(files[2], 'drive')).toEqual({
      sourceType: 'drive',
      id: 'root',
      filename: 'Root.docx',
      fileType: 'word',
      extension: undefined,
      mimeType: undefined,
      createdAt: null,
    })
  })
})
