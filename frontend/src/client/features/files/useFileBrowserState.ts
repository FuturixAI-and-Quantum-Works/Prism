import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { FilePreviewFile } from '../../components/FilePreviewModal'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  groupDisplayedFiles,
  selectAllDisplayedFiles,
  selectDisplayedFiles,
  selectFolders,
  toPreviewFile,
  toggleSelectedFile,
} from './fileBrowserModel'
import type { Awaitable, BrowseFile, BrowseFilesModalProps } from './fileBrowserTypes'

type FileBrowserStateOptions = Omit<
  BrowseFilesModalProps,
  'error' | 'isOpen' | 'onImport' | 'onUploadFolder'
>

type FileBrowserAction = 'select' | 'rename' | 'delete' | null

export function useFileBrowserState({
  files,
  onClose,
  onSelectFile,
  onDeleteFiles,
  onRenameFile,
  maxSelection,
  singleSelectMode,
  previewSourceType = 'document',
}: FileBrowserStateOptions) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<FilePreviewFile | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<FileBrowserAction>(null)
  const actionPendingRef = useRef(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileKeyboardHelpId = useId()
  const folders = selectFolders(files)
  const displayedFiles = selectDisplayedFiles(files, currentPath, searchQuery)
  const groups = groupDisplayedFiles(displayedFiles)

  const navigateToFolder = (folderName: string) => {
    setCurrentPath((previous) => [...previous, folderName])
  }

  const navigateToRoot = () => {
    setCurrentPath([])
  }

  const navigateToPathIndex = (index: number) => {
    setCurrentPath((previous) => previous.slice(0, index + 1))
  }

  const toggleSelection = (fileId: string) => {
    setSelectedFiles((previous) =>
      toggleSelectedFile(previous, fileId, { maxSelection, singleSelectMode }),
    )
  }

  const selectAll = () => {
    const selection = selectAllDisplayedFiles(displayedFiles, {
      maxSelection,
      singleSelectMode,
    })
    if (selection) setSelectedFiles(selection)
  }

  const deselectAll = () => {
    setSelectedFiles(new Set())
  }

  const openPreview = (file: BrowseFile) => {
    if (file.type === 'folder') return
    setPreviewFile(toPreviewFile(file, previewSourceType))
  }

  const activateFile = (file: BrowseFile) => {
    if (file.type === 'folder') {
      navigateToFolder(file.name)
      return
    }
    toggleSelection(file.id)
  }

  const handleFileKeyDown = (event: KeyboardEvent<HTMLButtonElement>, file: BrowseFile) => {
    if (event.key !== 'Enter' || !event.shiftKey || file.type === 'folder') return
    event.preventDefault()
    openPreview(file)
  }

  const runAction = async (
    action: Exclude<FileBrowserAction, null>,
    operation: () => Awaitable<void>,
    fallbackMessage: string,
    onSuccess: () => void,
  ) => {
    if (actionPendingRef.current) return false
    actionPendingRef.current = true
    setPendingAction(action)
    setActionError(null)
    try {
      await operation()
      onSuccess()
      return true
    } catch (error) {
      setActionError(getRequestErrorMessage(error, fallbackMessage))
      return false
    } finally {
      actionPendingRef.current = false
      setPendingAction(null)
    }
  }

  const deleteSelection = async () => {
    const selectedIds = Array.from(selectedFiles)
    if (!window.confirm(`Delete ${selectedIds.length} file(s)?`)) return
    await runAction(
      'delete',
      () => onDeleteFiles(selectedIds),
      'Could not delete the selected files.',
      deselectAll,
    )
  }

  const renameSelection = async () => {
    const selectedIds = Array.from(selectedFiles)
    if (selectedIds.length !== 1) {
      window.alert('Select one file to rename')
      return
    }
    const file = files.find((candidate) => candidate.id === selectedIds[0])
    if (!file) return
    const newName = window.prompt('New name:', file.name)
    if (newName?.trim() && newName !== file.name) {
      await runAction(
        'rename',
        () => onRenameFile(selectedIds[0], newName.trim()),
        'Could not rename the selected file.',
        deselectAll,
      )
    }
  }

  const confirmSelection = async () => {
    const selectedFilesList = files.filter(
      (file) => selectedFiles.has(file.id) && file.type !== 'folder',
    )
    if (selectedFilesList.length === 0) return
    await runAction(
      'select',
      async () => {
        for (const file of selectedFilesList) await onSelectFile(file)
      },
      'Could not add the selected files.',
      () => {
        deselectAll()
        onClose()
      },
    )
  }

  const editPreview = async (item: FilePreviewFile) => {
    if (item.sourceType !== 'document') return
    const selected = files.find((candidate) => candidate.id === item.id)
    if (!selected) return
    await runAction(
      'select',
      () => onSelectFile(selected),
      'Could not open the selected file.',
      () => setPreviewFile(null),
    )
  }

  return {
    state: {
      actionError,
      currentPath,
      displayedFiles,
      fileKeyboardHelpId,
      folders,
      groups,
      previewFile,
      pendingAction,
      searchQuery,
      selectedFiles,
    },
    refs: { searchInputRef },
    actions: {
      activateFile,
      closePreview: () => setPreviewFile(null),
      confirmSelection,
      deleteSelection,
      deselectAll,
      editPreview,
      handleFileKeyDown,
      navigateToFolder,
      navigateToPathIndex,
      navigateToRoot,
      openPreview,
      renameSelection,
      selectAll,
      setSearchQuery,
    },
  }
}
