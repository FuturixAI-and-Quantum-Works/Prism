import type { FilePreviewFile, FilePreviewSourceType } from '../../components/FilePreviewModal'
import type { BrowseFile } from './fileBrowserTypes'

export interface FileBrowserGroups {
  recent: BrowseFile[]
  yesterday: BrowseFile[]
}

interface SelectionPolicy {
  maxSelection?: number
  singleSelectMode?: boolean
}

export function selectFolders(files: BrowseFile[]): BrowseFile[] {
  return files.filter((file) => file.type === 'folder')
}

export function selectDisplayedFiles(
  files: BrowseFile[],
  currentPath: string[],
  searchQuery: string,
): BrowseFile[] {
  if (searchQuery.trim().length > 0) {
    const normalizedQuery = searchQuery.toLowerCase()
    return files.filter((file) => file.name.toLowerCase().includes(normalizedQuery))
  }
  if (currentPath.length === 0) return files
  const normalizedPath = currentPath.join('/')
  return files.filter((file) => file.path?.join('/') === normalizedPath)
}

export function groupDisplayedFiles(files: BrowseFile[]): FileBrowserGroups {
  return {
    recent: files.slice(0, 7),
    yesterday: files.slice(7),
  }
}

export function toggleSelectedFile(
  selectedFiles: ReadonlySet<string>,
  fileId: string,
  policy: SelectionPolicy,
): Set<string> {
  const nextSelection = new Set(selectedFiles)
  if (nextSelection.has(fileId)) {
    nextSelection.delete(fileId)
    return nextSelection
  }
  if (policy.singleSelectMode) {
    nextSelection.clear()
    nextSelection.add(fileId)
    return nextSelection
  }
  if (policy.maxSelection && selectedFiles.size >= policy.maxSelection) return nextSelection
  nextSelection.add(fileId)
  return nextSelection
}

export function selectAllDisplayedFiles(
  displayedFiles: BrowseFile[],
  policy: SelectionPolicy,
): Set<string> | null {
  if (policy.singleSelectMode) return null
  const filesToSelect = policy.maxSelection
    ? displayedFiles.slice(0, policy.maxSelection)
    : displayedFiles
  return new Set(filesToSelect.map((file) => file.id))
}

export function toPreviewFile(
  file: BrowseFile,
  sourceType: FilePreviewSourceType,
): FilePreviewFile {
  return {
    sourceType,
    id: file.id,
    filename: file.name,
    fileType: file.extension || file.type,
    extension: file.extension,
    mimeType: file.mimeType,
    createdAt: file.createdAt ? file.createdAt.toISOString() : null,
  }
}
