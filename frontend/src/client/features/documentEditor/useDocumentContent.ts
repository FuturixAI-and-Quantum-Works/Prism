import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  useGetDocumentHtmlQuery,
  useLazyGetDocumentUrlQuery,
} from '../documents/api/documentContentApi'
import { useSaveDocumentVersionFromHtmlMutation } from '../documents/api/documentVersionsApi'
import { sanitizeEditorHtml } from '../../lib/sanitizeHtml'
import { getRequestErrorMessage } from '../../lib/requestErrors'

interface LoadedDocumentContent {
  documentId: string | null
  content: string
  persistedHtml: string
}

export function useDocumentContent(documentId: string | undefined) {
  const {
    currentData: htmlData,
    refetch: refetchHtml,
    isError: htmlError,
  } = useGetDocumentHtmlQuery({ documentId: documentId || '' }, { skip: !documentId })
  const [saveVersionFromHtml, { isLoading: isSavingVersion }] =
    useSaveDocumentVersionFromHtmlMutation()
  const [loadDocumentUrl] = useLazyGetDocumentUrlQuery()
  const [loadedContent, setLoadedContent] = useState<LoadedDocumentContent>({
    documentId: null,
    content: '',
    persistedHtml: '',
  })
  const [saveResult, setSaveResult] = useState({ documentId: '', message: '' })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewAttemptedFor, setPreviewAttemptedFor] = useState<string | null>(null)
  const documentIdRef = useRef(documentId)
  documentIdRef.current = documentId
  const previousDocumentIdRef = useRef(documentId)
  const documentGenerationRef = useRef(0)
  if (previousDocumentIdRef.current !== documentId) {
    previousDocumentIdRef.current = documentId
    documentGenerationRef.current += 1
  }

  const loadedDocumentId =
    loadedContent.documentId === (documentId ?? null) ? loadedContent.documentId : null
  const contentReady = !documentId || loadedDocumentId === documentId
  const content = contentReady ? loadedContent.content : ''
  const lastLoadedHtml = contentReady ? loadedContent.persistedHtml : ''
  const saveMessage = saveResult.documentId === documentId ? saveResult.message : ''
  const previewMatchesDocument = previewAttemptedFor === documentId

  const setContent = useCallback<Dispatch<SetStateAction<string>>>(
    (nextContent) => {
      const targetDocumentId = documentId ?? null
      setLoadedContent((current) => {
        const currentContent = current.documentId === targetDocumentId ? current.content : ''
        return {
          documentId: targetDocumentId,
          content: typeof nextContent === 'function' ? nextContent(currentContent) : nextContent,
          persistedHtml: current.documentId === targetDocumentId ? current.persistedHtml : '',
        }
      })
    },
    [documentId],
  )

  useEffect(() => {
    if (!documentId || !htmlData) return
    const safeHtml = sanitizeEditorHtml(htmlData.html)
    setLoadedContent({
      documentId,
      content: safeHtml,
      persistedHtml: safeHtml,
    })
    setPreviewUrl(null)
    setPreviewError('')
    setPreviewAttemptedFor(null)
  }, [documentId, htmlData])

  useEffect(() => {
    setLoadedContent((current) =>
      current.documentId === (documentId ?? null)
        ? current
        : { documentId: null, content: '', persistedHtml: '' },
    )
    setPreviewUrl(null)
    setPreviewError('')
    setPreviewAttemptedFor(null)
  }, [documentId])

  const loadPreviewUrl = useCallback(
    async (force = false) => {
      if (!documentId || (previewLoading && previewAttemptedFor === documentId)) return
      if (!force && previewAttemptedFor === documentId) return

      const targetDocumentId = documentId
      const targetGeneration = documentGenerationRef.current
      setPreviewLoading(true)
      setPreviewError('')
      setPreviewAttemptedFor(targetDocumentId)
      try {
        const result = await loadDocumentUrl({ documentId: targetDocumentId }).unwrap()
        if (
          documentIdRef.current !== targetDocumentId ||
          documentGenerationRef.current !== targetGeneration
        ) {
          return
        }
        if (result.url) {
          setPreviewUrl(result.url)
        } else {
          setPreviewError('No preview URL was returned for this document.')
        }
      } catch (error) {
        if (
          documentIdRef.current !== targetDocumentId ||
          documentGenerationRef.current !== targetGeneration
        ) {
          return
        }
        setPreviewUrl(null)
        setPreviewError(getRequestErrorMessage(error, 'Failed to load the document preview.'))
      } finally {
        if (
          documentIdRef.current === targetDocumentId &&
          documentGenerationRef.current === targetGeneration
        ) {
          setPreviewLoading(false)
        }
      }
    },
    [documentId, loadDocumentUrl, previewAttemptedFor, previewLoading],
  )

  useEffect(() => {
    if (!htmlError || !documentId || previewMatchesDocument) return
    void loadPreviewUrl()
  }, [documentId, htmlError, loadPreviewUrl, previewMatchesDocument])

  const autosave = async (afterSave: () => Promise<unknown>) => {
    if (!documentId || loadedDocumentId !== documentId || !content.trim()) return
    if (lastLoadedHtml && content === lastLoadedHtml) return

    const targetDocumentId = documentId
    const targetGeneration = documentGenerationRef.current
    const savedContent = content
    await saveVersionFromHtml({
      documentId: targetDocumentId,
      html: savedContent,
      displayName: 'Autosave before placeholder fill',
    }).unwrap()
    if (
      documentIdRef.current !== targetDocumentId ||
      documentGenerationRef.current !== targetGeneration
    ) {
      return
    }
    setLoadedContent((current) =>
      current.documentId === targetDocumentId
        ? { ...current, persistedHtml: savedContent }
        : current,
    )
    await afterSave()
  }

  const saveVersion = async () => {
    if (!documentId || loadedDocumentId !== documentId || !content.trim() || isSavingVersion) {
      return false
    }

    const targetDocumentId = documentId
    const targetGeneration = documentGenerationRef.current
    const savedContent = content
    setSaveResult({ documentId: targetDocumentId, message: '' })
    try {
      const saved = await saveVersionFromHtml({
        documentId: targetDocumentId,
        html: savedContent,
        displayName: `Manual save ${new Date().toLocaleString()}`,
      }).unwrap()
      if (
        documentIdRef.current !== targetDocumentId ||
        documentGenerationRef.current !== targetGeneration
      ) {
        return false
      }
      setSaveResult({
        documentId: targetDocumentId,
        message: `Saved version ${saved.version_number}.`,
      })
      setLoadedContent((current) =>
        current.documentId === targetDocumentId
          ? { ...current, persistedHtml: savedContent }
          : current,
      )
      await refetchHtml()
      return true
    } catch {
      if (
        documentIdRef.current === targetDocumentId &&
        documentGenerationRef.current === targetGeneration
      ) {
        setSaveResult({
          documentId: targetDocumentId,
          message: 'Could not save a version. Please try again.',
        })
      }
      return false
    }
  }

  return {
    autosave,
    content,
    contentReady,
    htmlData,
    htmlError,
    isSavingVersion,
    lastLoadedHtml,
    loadedDocumentId,
    loadPreviewUrl,
    previewAttemptedFor,
    previewError: previewMatchesDocument ? previewError : '',
    previewLoading: previewMatchesDocument && previewLoading,
    previewUrl: previewMatchesDocument ? previewUrl : null,
    refetchHtml,
    saveMessage,
    saveVersion,
    setContent,
  }
}
