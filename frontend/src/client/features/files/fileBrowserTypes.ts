import type { FilePreviewSourceType } from '../../components/FilePreviewModal'

export type Awaitable<T> = T | Promise<T>

export interface BrowseFile {
  id: string
  name: string
  type: 'folder' | 'pdf' | 'word' | 'image' | 'other'
  date: string
  path?: string[]
  createdAt?: Date
  extension?: string | null
  mimeType?: string | null
}

export interface BrowseFilesModalProps {
  isOpen: boolean
  files: BrowseFile[]
  onClose: () => void
  onImport: () => void
  onUploadFolder?: () => void
  error?: string | null
  onSelectFile: (file: BrowseFile) => Awaitable<void>
  onDeleteFiles: (fileIds: string[]) => Awaitable<void>
  onRenameFile: (fileId: string, newName: string) => Awaitable<void>
  maxSelection?: number
  singleSelectMode?: boolean
  previewSourceType?: FilePreviewSourceType
}
