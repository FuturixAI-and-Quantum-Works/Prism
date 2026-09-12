import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BrowseFile } from '../files/fileBrowserTypes'
import type { FilePreviewFile } from '../../components/FilePreviewModal'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  useDeleteDriveFileMutation,
  useGetDriveFilesQuery,
  useUploadDriveFileMutation,
} from '../../store/api/drive/driveFileApi'
import { useLazyGetDocumentDisplayQuery } from '../documents/api/documentContentApi'
import {
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
} from '../documents/api/documentCoreApi'
import { normalizeWorkspaceItems, selectWorkspaceItems } from './workspaceModels'
import type {
  WorkspaceDocumentFilter,
  WorkspaceDocumentSort,
  WorkspaceDocumentTab,
  WorkspaceItem,
  WorkspaceItemContextMenu,
} from './workspaceModels'

interface UseWorkspaceDocumentsSessionOptions {
  workspaceId: string
  workspaceName?: string
}

export function useWorkspaceDocumentsSession({
  workspaceId,
  workspaceName,
}: UseWorkspaceDocumentsSessionOptions) {
  const navigate = useNavigate()
  const {
    data: filesResponse,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useGetDriveFilesQuery({ workspace_id: workspaceId }, { skip: !workspaceId })
  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useGetDocumentsQuery({ workspace_id: workspaceId }, { skip: !workspaceId })
  const { data: globalDocuments = [] } = useGetDocumentsQuery()
  const [uploadFile, { isLoading: isUploading }] = useUploadDriveFileMutation()
  const [deleteDriveFile] = useDeleteDriveFileMutation()
  const [deleteDocument] = useDeleteDocumentMutation()
  const [createDocument, { isLoading: isCreating }] = useCreateDocumentMutation()
  const [getDocumentDisplay] = useLazyGetDocumentDisplayQuery()
  const [tab, setTab] = useState<WorkspaceDocumentTab>('primary')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<WorkspaceDocumentFilter[]>([])
  const [sort, setSort] = useState<WorkspaceDocumentSort>('newest')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [addFilesOpen, setAddFilesOpen] = useState(false)
  const [browseFilesOpen, setBrowseFilesOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FilePreviewFile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploadCandidate, setUploadCandidate] = useState<File | null>(null)
  const [uploadIsPrimary, setUploadIsPrimary] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [addFilesError, setAddFilesError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<WorkspaceItemContextMenu | null>(null)
  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filterContainerRef = useRef<HTMLDivElement>(null)
  const sortContainerRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const contextMenuTriggerRef = useRef<HTMLElement | null>(null)
  const rowActionTriggerRef = useRef<HTMLElement | null>(null)
  const deletePendingRef = useRef(false)
  const filterMenuRef = useMenuFocus({
    open: filterOpen,
    onClose: () => setFilterOpen(false),
    onOpen: () => {
      setFilterOpen(true)
      setSortOpen(false)
    },
    triggerRef: filterButtonRef,
  })
  const sortMenuRef = useMenuFocus({
    open: sortOpen,
    onClose: () => setSortOpen(false),
    onOpen: () => {
      setSortOpen(true)
      setFilterOpen(false)
    },
    triggerRef: sortButtonRef,
  })
  const contextMenuRef = useMenuFocus({
    open: contextMenu !== null,
    onClose: () => setContextMenu(null),
    triggerRef: contextMenuTriggerRef,
  })
  const rowActionMenuRef = useMenuFocus({
    open: rowActionId !== null,
    onClose: () => setRowActionId(null),
    triggerRef: rowActionTriggerRef,
  })

  useEffect(() => {
    const closeOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Node
      if (filterContainerRef.current && !filterContainerRef.current.contains(target)) {
        setFilterOpen(false)
      }
      if (sortContainerRef.current && !sortContainerRef.current.contains(target)) {
        setSortOpen(false)
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(target)) setContextMenu(null)
      if (
        rowActionMenuRef.current &&
        !rowActionMenuRef.current.contains(target) &&
        !rowActionTriggerRef.current?.contains(target)
      ) {
        setRowActionId(null)
      }
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [contextMenuRef, rowActionMenuRef])

  const allItems = useMemo(
    () => normalizeWorkspaceItems(filesResponse?.files ?? [], documents),
    [documents, filesResponse?.files],
  )
  const items = useMemo(
    () => selectWorkspaceItems(allItems, tab, searchQuery, filters, sort),
    [allItems, filters, searchQuery, sort, tab],
  )
  const browseFiles = useMemo(
    () =>
      globalDocuments.map((document): BrowseFile => {
        const extension = document.file_type?.toLowerCase() || ''
        const type: BrowseFile['type'] =
          extension === 'pdf'
            ? 'pdf'
            : ['doc', 'docx'].includes(extension)
              ? 'word'
              : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
                ? 'image'
                : 'other'
        return {
          id: document.id,
          name: document.filename || 'Untitled',
          type,
          date: new Date(document.created_at || '').toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          createdAt: document.created_at ? new Date(document.created_at) : undefined,
          extension: document.file_type,
        }
      }),
    [globalDocuments],
  )

  const navigationState = {
    from: 'workspaces',
    workspaceId,
    workspaceName,
  }
  const openItem = (item: WorkspaceItem) => {
    if (item.type === 'document') navigate(`/documents/${item.id}`, { state: navigationState })
    else previewItem(item)
  }
  const editItem = (item: WorkspaceItem) => {
    if (item.type === 'document') navigate(`/documents/${item.id}`, { state: navigationState })
  }
  const editPreview = (file: FilePreviewFile) => {
    if (file.sourceType === 'document') {
      navigate(`/documents/${file.id}`, { state: navigationState })
    }
  }
  const previewItem = (item: WorkspaceItem) => {
    setPreviewFile({
      sourceType: item.type === 'document' ? 'document' : 'drive',
      id: item.id,
      filename: item.name,
      fileType: item.extension,
      extension: item.extension,
      mimeType: item.mimeType,
      createdAt: item.createdAt,
    })
  }
  const toggleItem = (item: WorkspaceItem, event?: MouseEvent) => {
    event?.stopPropagation()
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
  }
  const toggleAll = () => {
    setSelectedIds((current) =>
      current.size === items.length ? new Set() : new Set(items.map((item) => item.id)),
    )
  }
  const toggleFilter = (filter: WorkspaceDocumentFilter) => {
    setFilters((current) =>
      current.includes(filter)
        ? current.filter((candidate) => candidate !== filter)
        : [...current, filter],
    )
  }
  const requestDelete = (item: WorkspaceItem | null = null) => {
    setDeleteError(null)
    setDeleteTarget(item)
    setDeleteOpen(true)
    setContextMenu(null)
    setRowActionId(null)
  }
  const confirmDelete = async () => {
    if (deletePendingRef.current) return
    const targets = deleteTarget
      ? [deleteTarget]
      : allItems.filter((item) => selectedIds.has(item.id))
    if (targets.length === 0) return

    deletePendingRef.current = true
    setDeleteError(null)
    setIsDeleting(true)
    try {
      const results = await Promise.allSettled(
        targets.map((item) =>
          item.type === 'file'
            ? deleteDriveFile(item.id).unwrap()
            : deleteDocument(item.id).unwrap(),
        ),
      )
      const failedTargets = targets.filter((_, index) => results[index].status === 'rejected')
      const firstFailure = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      )
      void refetchFiles()
      void refetchDocuments()
      if (firstFailure) {
        setSelectedIds(new Set(failedTargets.map((item) => item.id)))
        setDeleteError(
          getRequestErrorMessage(firstFailure.reason, 'Could not remove the selected items.'),
        )
        return
      }
      setSelectedIds(new Set())
      setDeleteOpen(false)
      setDeleteTarget(null)
    } finally {
      deletePendingRef.current = false
      setIsDeleting(false)
    }
  }
  const createBlank = async () => {
    if (!workspaceId) return
    setAddFilesError(null)
    try {
      const isPrimary = tab === 'primary'
      const document = await createDocument({
        filename: 'Untitled Document',
        workspace_id: workspaceId,
        is_primary: isPrimary,
      }).unwrap()
      setAddFilesOpen(false)
      navigate(`/documents/${document.id}`, { state: { ...navigationState, isPrimary } })
    } catch (requestError) {
      setAddFilesError(getRequestErrorMessage(requestError, 'Could not create a blank document.'))
    }
  }
  const selectUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !workspaceId) return
    setUploadError(null)
    setUploadCandidate(file)
    setUploadIsPrimary(tab === 'primary')
    event.target.value = ''
  }
  const confirmUpload = async () => {
    if (!uploadCandidate || !workspaceId) return
    const formData = new FormData()
    formData.append('file', uploadCandidate)
    formData.append('workspace_id', workspaceId)
    formData.append('is_primary', String(uploadIsPrimary))
    setUploadError(null)
    try {
      await uploadFile(formData).unwrap()
      setUploadCandidate(null)
    } catch (requestError) {
      setUploadError(
        getRequestErrorMessage(requestError, `Could not upload "${uploadCandidate.name}".`),
      )
    }
  }
  const importFile = async (file: BrowseFile) => {
    if (!workspaceId || isImporting) return
    setIsImporting(true)
    try {
      const blob = await getDocumentDisplay({ documentId: file.id }).unwrap()
      const mimeType =
        file.extension === 'pdf'
          ? 'application/pdf'
          : file.extension === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/octet-stream'
      const formData = new FormData()
      formData.append('file', new File([blob], file.name, { type: mimeType }))
      formData.append('workspace_id', workspaceId)
      formData.append('is_primary', String(tab === 'primary'))
      await uploadFile(formData).unwrap()
    } catch (requestError) {
      const importError = new Error(
        getRequestErrorMessage(requestError, `Could not import "${file.name}".`),
      )
      Object.defineProperty(importError, 'cause', { value: requestError })
      throw importError
    } finally {
      setIsImporting(false)
    }
  }
  const openContextMenu = (trigger: HTMLElement, x: number, y: number, item: WorkspaceItem) => {
    contextMenuTriggerRef.current = trigger
    setContextMenu({ x, y, item })
  }
  const openRowActions = (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    itemId: string,
  ) => {
    if ('key' in event) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      if (rowActionId === itemId) return
      event.preventDefault()
      event.stopPropagation()
      rowActionTriggerRef.current = event.currentTarget
      setRowActionId(itemId)
      return
    }
    event.stopPropagation()
    rowActionTriggerRef.current = event.currentTarget
    setRowActionId((current) => (current === itemId ? null : itemId))
  }
  const editSelected = () => {
    if (selectedIds.size !== 1) return
    const selected = items.find((item) => selectedIds.has(item.id))
    if (!selected) return
    if (selected.type === 'document') editItem(selected)
    else previewItem(selected)
  }

  return {
    allItems,
    items,
    browseFiles,
    isLoading: filesLoading || documentsLoading,
    isUploading,
    isCreating,
    isImporting,
    isDeleting,
    deleteError,
    uploadError,
    addFilesError,
    tab,
    searchQuery,
    filters,
    sort,
    filterOpen,
    sortOpen,
    selectedIds,
    addFilesOpen,
    browseFilesOpen,
    previewFile,
    deleteOpen,
    deleteTarget,
    deleteCount: deleteTarget ? 1 : selectedIds.size,
    uploadCandidate,
    uploadIsPrimary,
    contextMenu,
    rowActionId,
    refs: {
      fileInputRef,
      filterContainerRef,
      sortContainerRef,
      filterButtonRef,
      sortButtonRef,
      filterMenuRef,
      sortMenuRef,
      contextMenuRef,
      rowActionMenuRef,
    },
    actions: {
      setTab,
      setSearchQuery,
      toggleFilter,
      clearFilters: () => setFilters([]),
      setSort: (value: WorkspaceDocumentSort) => {
        setSort(value)
        setSortOpen(false)
      },
      toggleFilterMenu: () => {
        setFilterOpen((open) => !open)
        setSortOpen(false)
      },
      toggleSortMenu: () => {
        setSortOpen((open) => !open)
        setFilterOpen(false)
      },
      toggleItem,
      toggleAll,
      openItem,
      editItem,
      editPreview,
      editSelected,
      previewItem,
      requestDelete,
      closeDelete: () => {
        setDeleteOpen(false)
        setDeleteTarget(null)
        setDeleteError(null)
      },
      confirmDelete,
      openAddFiles: () => {
        setAddFilesError(null)
        setAddFilesOpen(true)
      },
      closeAddFiles: () => {
        setAddFilesOpen(false)
        setAddFilesError(null)
      },
      openBrowseFiles: () => {
        setAddFilesOpen(false)
        setBrowseFilesOpen(true)
      },
      closeBrowseFiles: () => setBrowseFilesOpen(false),
      triggerUpload: () => {
        setAddFilesOpen(false)
        fileInputRef.current?.click()
      },
      createBlank,
      selectUpload,
      closeUpload: () => {
        setUploadCandidate(null)
        setUploadError(null)
      },
      setUploadIsPrimary,
      confirmUpload,
      importFile,
      closePreview: () => setPreviewFile(null),
      openContextMenu,
      closeContextMenu: () => setContextMenu(null),
      openRowActions,
      closeRowActions: () => setRowActionId(null),
      createDocument: () =>
        navigate('/documents/new', {
          state: { ...navigationState, isPrimary: tab === 'primary' },
        }),
      refetch: () => {
        void refetchFiles()
        void refetchDocuments()
      },
    },
  }
}

export type WorkspaceDocumentsSession = ReturnType<typeof useWorkspaceDocumentsSession>
