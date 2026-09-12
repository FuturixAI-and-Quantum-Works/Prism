import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, apiUrl } from '../../lib/apiTransport'
import { getRequestErrorMessage } from '../../lib/requestErrors'

export type DocumentExportFormat = 'pdf' | 'docx'

export function requestDocumentExport(
  documentId: string,
  html: string,
  format: DocumentExportFormat,
) {
  return apiFetch(apiUrl(`/documents/${documentId}/export`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html, format }),
  })
}

function downloadDocumentBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(anchor)
}

interface UseDocumentExportOptions {
  documentId: string | undefined
  documentName: string
  html: string
}

async function exportError(response: Response, format: DocumentExportFormat) {
  const body = await response.text().catch(() => '')
  let detail = body.trim()
  try {
    const parsed = JSON.parse(body) as { detail?: unknown }
    if (typeof parsed.detail === 'string') detail = parsed.detail
  } catch {
    detail = body.trim()
  }
  return new Error(detail || `Could not export the document as ${format.toUpperCase()}.`)
}

export function useDocumentExport({ documentId, documentName, html }: UseDocumentExportOptions) {
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const exportPendingRef = useRef(false)
  const documentIdRef = useRef(documentId)
  documentIdRef.current = documentId

  useEffect(() => {
    setError(null)
  }, [documentId])

  const runExport = useCallback(
    async (format: DocumentExportFormat) => {
      if (!documentId || !html) {
        setError('Document content is not ready to export.')
        return false
      }
      if (exportPendingRef.current) return false

      const targetDocumentId = documentId
      exportPendingRef.current = true
      setError(null)
      setIsExporting(true)
      try {
        const response = await requestDocumentExport(documentId, html, format)
        if (documentIdRef.current !== targetDocumentId) return false
        if (!response.ok) throw await exportError(response, format)
        downloadDocumentBlob(await response.blob(), `${documentName}.${format}`)
        return true
      } catch (requestError) {
        if (documentIdRef.current === targetDocumentId) {
          setError(
            getRequestErrorMessage(
              requestError,
              `Could not export the document as ${format.toUpperCase()}.`,
            ),
          )
        }
        return false
      } finally {
        exportPendingRef.current = false
        setIsExporting(false)
      }
    },
    [documentId, documentName, html],
  )

  return {
    error,
    exportDocx: () => runExport('docx'),
    exportPdf: () => runExport('pdf'),
    isExporting,
  }
}
