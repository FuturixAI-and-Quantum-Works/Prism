import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FilePreviewFile } from '../../components/FilePreviewModal'
import { useResponsive } from '../../hooks'
import { useAuth } from '../../hooks/useAuth'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
  useUpdateDocumentMutation,
  useUploadDocumentMutation,
} from './api/documentCoreApi'
import { useLazyGetDocumentHtmlQuery, useLazyGetDocumentUrlQuery } from './api/documentContentApi'
import {
  type ProductShareRole,
  useCreateDocumentInvitationMutation,
  useGetDocumentSharesQuery,
  useRemoveDocumentShareMutation,
  useUpdateDocumentShareMutation,
} from './api/documentSharingApi'
import {
  type DocumentAction,
  type DocumentCardModel,
  type DocumentSort,
  type DocumentStatusFilter,
  isDocumentInLibraryScope,
  selectDocumentCards,
} from './documentLibraryModel'

function duplicateFilename(filename: string): string {
  const stem = filename.replace(/\.[^/.]+$/, '')
  return `${stem} copy.docx`
}

export function useDocumentsScreen(isShared: boolean) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<DocumentSort>('Newest')
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>('active')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    doc: DocumentCardModel
  } | null>(null)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentCardModel | null>(null)
  const [previewDocument, setPreviewDocument] = useState<FilePreviewFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<ProductShareRole>('viewer')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const contextMenuTriggerRef = useRef<HTMLElement | null>(null)
  const renamePendingRef = useRef(false)
  const deletePendingRef = useRef(false)
  const selectedDocumentIdRef = useRef(selectedDocument?.id)
  selectedDocumentIdRef.current = selectedDocument?.id
  const sortMenuRef = useMenuFocus({
    open: sortDropdownOpen,
    onClose: () => setSortDropdownOpen(false),
    onOpen: () => setSortDropdownOpen(true),
    triggerRef: sortButtonRef,
  })
  const contextMenuRef = useMenuFocus({
    open: contextMenu !== null,
    onClose: () => setContextMenu(null),
    triggerRef: contextMenuTriggerRef,
  })

  const { data: apiDocuments, isLoading, isError, refetch } = useGetDocumentsQuery()
  const [createDocument] = useCreateDocumentMutation()
  const [deleteDocument] = useDeleteDocumentMutation()
  const [updateDocument] = useUpdateDocumentMutation()
  const [uploadDocument] = useUploadDocumentMutation()
  const [getDocumentHtml] = useLazyGetDocumentHtmlQuery()
  const [getDocumentUrl] = useLazyGetDocumentUrlQuery()
  const [createDocumentInvitation, { isLoading: isSendingInvite }] =
    useCreateDocumentInvitationMutation()
  const [updateDocumentShare, { isLoading: isUpdatingShare }] = useUpdateDocumentShareMutation()
  const [removeDocumentShare, { isLoading: isRemovingShare }] = useRemoveDocumentShareMutation()
  const { data: documentSharesData, isFetching: documentSharesLoading } = useGetDocumentSharesQuery(
    selectedDocument?.id || '',
    { skip: !shareModalOpen || !selectedDocument },
  )

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const eventPath = event.composedPath()
      if (sortDropdownRef.current && !eventPath.includes(sortDropdownRef.current)) {
        setSortDropdownOpen(false)
      }
      if (
        !eventPath.some(
          (target) => target instanceof Element && target.hasAttribute('data-context-menu'),
        )
      ) {
        setContextMenu(null)
      }
    }
    if (sortDropdownOpen || contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu, sortDropdownOpen])

  const documents = useMemo(
    () =>
      selectDocumentCards(apiDocuments, {
        isShared,
        viewerUserId: user?.id,
        searchQuery,
        sortBy,
        statusFilter,
      }),
    [apiDocuments, isShared, searchQuery, sortBy, statusFilter, user?.id],
  )
  const sourceDocumentCount = useMemo(
    () =>
      (apiDocuments ?? []).filter((document) =>
        isDocumentInLibraryScope(document.user_id, isShared, user?.id),
      ).length,
    [apiDocuments, isShared, user?.id],
  )

  const openContextMenu = (trigger: HTMLElement, x: number, y: number, doc: DocumentCardModel) => {
    contextMenuTriggerRef.current = trigger
    setContextMenu({ x, y, doc })
  }

  const openPointerContextMenu = (event: MouseEvent<HTMLElement>, doc: DocumentCardModel) => {
    event.preventDefault()
    openContextMenu(event.currentTarget, event.clientX, event.clientY, doc)
  }

  const openKeyboardContextMenu = (event: KeyboardEvent<HTMLElement>, doc: DocumentCardModel) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    openContextMenu(event.currentTarget, rect.left, rect.bottom, doc)
  }

  const openShare = (doc: DocumentCardModel) => {
    setSelectedDocument(doc)
    setShareEmail('')
    setShareRole('viewer')
    setShareError(null)
    setShareNotice(null)
    setShareModalOpen(true)
  }

  const submitRename = async () => {
    if (!selectedDocument || !renameValue.trim() || renamePendingRef.current) return
    renamePendingRef.current = true
    setIsRenaming(true)
    setRenameError(null)
    const targetDocumentId = selectedDocument.id
    try {
      await updateDocument({ id: targetDocumentId, name: renameValue.trim() }).unwrap()
      if (selectedDocumentIdRef.current !== targetDocumentId) return
      void refetch()
      setRenameModalOpen(false)
      setSelectedDocument(null)
      setRenameValue('')
    } catch (requestError) {
      if (selectedDocumentIdRef.current === targetDocumentId) {
        setRenameError(getRequestErrorMessage(requestError, 'Could not rename the document.'))
      }
    } finally {
      renamePendingRef.current = false
      setIsRenaming(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedDocument || deletePendingRef.current) return
    deletePendingRef.current = true
    setIsDeleting(true)
    setDeleteError(null)
    const targetDocumentId = selectedDocument.id
    try {
      await deleteDocument(targetDocumentId).unwrap()
      if (selectedDocumentIdRef.current !== targetDocumentId) return
      void refetch()
      setDeleteModalOpen(false)
      setSelectedDocument(null)
    } catch (requestError) {
      if (selectedDocumentIdRef.current === targetDocumentId) {
        setDeleteError(getRequestErrorMessage(requestError, 'Could not delete the document.'))
      }
    } finally {
      deletePendingRef.current = false
      setIsDeleting(false)
    }
  }

  const submitShare = async () => {
    if (!selectedDocument || !shareEmail.trim()) return
    const email = shareEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setShareError('Enter a valid email address.')
      return
    }
    setShareError(null)
    setShareNotice(null)
    const targetDocumentId = selectedDocument.id
    try {
      const result = await createDocumentInvitation({
        documentId: targetDocumentId,
        email,
        role: shareRole,
      }).unwrap()
      if (selectedDocumentIdRef.current !== targetDocumentId) return
      if (result.delivery.status !== 'sent') {
        setShareError(
          result.delivery.error ||
            `The invitation was recorded, but email delivery was ${result.delivery.status}.`,
        )
      } else {
        setShareEmail('')
        setShareNotice('Invite sent. Access will be granted after the recipient accepts.')
      }
    } catch (error) {
      if (selectedDocumentIdRef.current === targetDocumentId) {
        setShareError(getRequestErrorMessage(error, 'Failed to send invite'))
      }
    }
  }

  const changeShareRole = async (shareId: string, role: ProductShareRole) => {
    if (!selectedDocument) return
    const targetDocumentId = selectedDocument.id
    setShareError(null)
    try {
      await updateDocumentShare({ documentId: targetDocumentId, shareId, role }).unwrap()
      if (selectedDocumentIdRef.current !== targetDocumentId) return
      setShareNotice('Collaborator role updated.')
    } catch (error) {
      if (selectedDocumentIdRef.current === targetDocumentId) {
        setShareError(getRequestErrorMessage(error, 'Could not update collaborator role'))
      }
    }
  }

  const removeShare = async (shareId: string) => {
    if (!selectedDocument) return
    const targetDocumentId = selectedDocument.id
    setShareError(null)
    try {
      await removeDocumentShare({ documentId: targetDocumentId, shareId }).unwrap()
      if (selectedDocumentIdRef.current !== targetDocumentId) return
      setShareNotice('Collaborator removed.')
    } catch (error) {
      if (selectedDocumentIdRef.current === targetDocumentId) {
        setShareError(getRequestErrorMessage(error, 'Could not remove collaborator'))
      }
    }
  }

  const runDocumentAction = (action: DocumentAction, doc: DocumentCardModel) => {
    switch (action) {
      case 'open':
        navigate(`/documents/${doc.id}`)
        return
      case 'ask':
        {
          const source = apiDocuments?.find((document) => document.id === doc.id)
          navigate('/assistant', {
            state: {
              initialMessage: `Review "${doc.title}".`,
              initialFile: {
                id: doc.id,
                name: doc.title,
                size: source?.size_bytes ?? 0,
                type: source?.file_type ?? 'application/octet-stream',
                source: { kind: 'stored-document', documentId: doc.id },
              },
            },
          })
        }
        return
      case 'rename':
        setSelectedDocument(doc)
        setRenameValue(doc.title)
        setRenameError(null)
        setRenameModalOpen(true)
        return
      case 'duplicate':
        {
          const source = apiDocuments?.find((document) => document.id === doc.id)
          if (!source) return
          const filename = duplicateFilename(source.filename)
          void getDocumentHtml({ documentId: source.id })
            .unwrap()
            .then(({ html }) =>
              createDocument({
                filename,
                content_html: html,
                project_id: source.project_id,
                workspace_id: source.workspace_id,
                folder_id: source.folder_id,
                is_primary: source.is_primary,
              }).unwrap(),
            )
            .catch((error) => {
              alert(getRequestErrorMessage(error, `Could not duplicate "${doc.title}" right now.`))
            })
        }
        return
      case 'export':
        void getDocumentUrl({ documentId: doc.id })
          .unwrap()
          .then((response) => window.open(response.url, '_blank', 'noopener,noreferrer'))
          .catch((error) => {
            alert(getRequestErrorMessage(error, `Could not export "${doc.title}" right now.`))
          })
        return
      case 'share':
        openShare(doc)
        return
      case 'delete':
        setSelectedDocument(doc)
        setDeleteError(null)
        setDeleteModalOpen(true)
    }
  }

  const uploadFromEmptyState = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.txt'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const formData = new FormData()
      formData.append('file', file)
      void uploadDocument(formData)
        .unwrap()
        .catch((error) => {
          alert(getRequestErrorMessage(error, `Could not upload "${file.name}" right now.`))
        })
    }
    input.click()
  }

  return {
    isShared,
    isMobile,
    documents,
    isLoading,
    isError,
    sourceDocumentCount,
    searchQuery,
    sortBy,
    statusFilter,
    sortDropdownOpen,
    contextMenu,
    selectedDocument,
    previewDocument,
    renameModalOpen,
    deleteModalOpen,
    shareModalOpen,
    renameValue,
    renameError,
    deleteError,
    isRenaming,
    isDeleting,
    shareEmail,
    shareRole,
    shareError,
    shareNotice,
    documentSharesData,
    documentSharesLoading,
    isSendingInvite,
    isUpdatingShare,
    isRemovingShare,
    refs: {
      sortDropdownRef,
      sortButtonRef,
      sortMenuRef,
      contextMenuRef,
    },
    actions: {
      setSearchQuery,
      setSortBy,
      setStatusFilter,
      setSortDropdownOpen,
      setContextMenu,
      setRenameModalOpen,
      setDeleteModalOpen,
      setShareModalOpen,
      setRenameValue,
      setShareEmail,
      setShareRole,
      setPreviewDocument,
      openPointerContextMenu,
      openKeyboardContextMenu,
      runDocumentAction,
      submitRename,
      confirmDelete,
      submitShare,
      changeShareRole,
      removeShare,
      retry: refetch,
      newDocument: () => navigate('/documents/new', { state: { from: 'documents' } }),
      uploadFromEmptyState,
      useTemplate: () => navigate('/templates'),
      createDocument: () => navigate('/documents/new'),
      editPreview: (file: FilePreviewFile) => navigate(`/documents/${file.id}`),
      sharePreview: (file: FilePreviewFile) => {
        const doc = documents.find((candidate) => candidate.id === file.id)
        if (doc) openShare(doc)
      },
    },
  }
}

export type DocumentsScreenSession = ReturnType<typeof useDocumentsScreen>
