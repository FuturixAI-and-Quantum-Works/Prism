import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  useGetDocumentPreviewSummaryQuery,
  useLazyGetDocumentUrlQuery,
} from '../features/documents/documentsApi'
import {
  useGetDriveFilePreviewSummaryQuery,
  useLazyGetDriveFileUrlQuery,
} from '../store/api/drive/driveFileApi'
import { apiFetch } from '../lib/apiTransport'
import { AccessibleDialog } from './ui/AccessibleDialog'

const fontFamily = 'SF Pro, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export type FilePreviewSourceType = 'document' | 'drive'

export interface FilePreviewFile {
  sourceType: FilePreviewSourceType
  id: string
  filename: string
  fileType?: string | null
  extension?: string | null
  mimeType?: string | null
  createdAt?: string | null
  description?: string | null
}

interface FilePreviewModalProps {
  actionError?: string | null
  file: FilePreviewFile | null
  onClose: () => void
  onEdit?: (file: FilePreviewFile) => void | Promise<void>
  onShare?: (file: FilePreviewFile) => void
}

function normalizeExtension(file: FilePreviewFile): string {
  const explicit = file.extension || file.fileType
  if (explicit) return explicit.replace(/^\./, '').toLowerCase()
  const match = file.filename.match(/\.([^.]+)$/)
  return match?.[1]?.toLowerCase() ?? ''
}

function formatDate(value?: string | null): string {
  if (!value) return 'Uploaded file'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Uploaded file'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fileKind(file: FilePreviewFile): 'pdf' | 'markdown' | 'office' | 'unsupported' {
  const ext = normalizeExtension(file)
  const mime = file.mimeType?.toLowerCase() ?? ''
  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf'
  if (ext === 'md' || ext === 'markdown' || mime.includes('markdown')) return 'markdown'
  if (
    ['doc', 'docx', 'xls', 'xlsx'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('spreadsheet')
  ) {
    return 'office'
  }
  return 'unsupported'
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={!onClick}
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        border: '1px solid #E4E4E4',
        background: onClick ? '#FFFFFF' : '#F5F5F5',
        color: onClick ? '#272727' : '#A0A0A0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'not-allowed',
        boxShadow: onClick ? '0 8px 18px rgba(0, 0, 0, 0.08)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4 20 4.4-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.4 16 4 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.8 6.6 2.6 2.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a3 3 0 1 0-2.8-4M6 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 12.3l6.8 3.4M15.4 8.3 8.6 11.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function FilePreviewModal({
  actionError,
  file,
  onClose,
  onEdit,
  onShare,
}: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [loadDocumentUrl] = useLazyGetDocumentUrlQuery()
  const [loadDriveFileUrl] = useLazyGetDriveFileUrlQuery()

  const kind = useMemo(() => (file ? fileKind(file) : 'unsupported'), [file])
  const extension = useMemo(() => (file ? normalizeExtension(file).toUpperCase() : ''), [file])
  const officeUrl = useMemo(() => {
    if (!previewUrl) return null
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`
  }, [previewUrl])

  const documentSummary = useGetDocumentPreviewSummaryQuery(file?.id ?? '', {
    skip: !file || file.sourceType !== 'document',
  })
  const driveSummary = useGetDriveFilePreviewSummaryQuery(file?.id ?? '', {
    skip: !file || file.sourceType !== 'drive',
  })
  const summaryState = file?.sourceType === 'drive' ? driveSummary : documentSummary

  useEffect(() => {
    if (!file) return
    let active = true
    setPreviewUrl(null)
    setPreviewError(null)
    setMarkdown(null)
    setIsLoadingUrl(true)

    const load = async () => {
      try {
        const result =
          file.sourceType === 'document'
            ? await loadDocumentUrl({ documentId: file.id, inline: true }).unwrap()
            : await loadDriveFileUrl({ fileId: file.id, inline: true }).unwrap()
        if (!active) return
        setPreviewUrl(result.url)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Preview URL could not be loaded.'
        setPreviewError(message)
      } finally {
        if (active) setIsLoadingUrl(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [file, loadDocumentUrl, loadDriveFileUrl])

  useEffect(() => {
    if (!file || kind !== 'markdown' || !previewUrl) return
    let active = true
    setMarkdown(null)
    apiFetch(previewUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Markdown preview could not be loaded.')
        return response.text()
      })
      .then((text) => {
        if (active) setMarkdown(text)
      })
      .catch(() => {
        if (active) setMarkdown(null)
      })
    return () => {
      active = false
    }
  }, [file, kind, previewUrl])

  if (!file) return null

  const download = () => {
    if (!previewUrl) return
    const anchor = document.createElement('a')
    anchor.href = previewUrl
    anchor.download = file.filename
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <AccessibleDialog
      open
      onClose={onClose}
      label={`Preview ${file.filename}`}
      overlayStyle={{
        zIndex: 2500,
        background: 'rgba(18, 18, 18, 0.54)',
        padding: 24,
        fontFamily,
      }}
      contentStyle={{
        width: 'min(1100px, calc(100vw - 48px))',
        height: 'min(720px, calc(100vh - 48px))',
        minHeight: 460,
        background: '#F9F9F9',
        borderRadius: 22,
        border: '1px solid rgba(255, 255, 255, 0.58)',
        boxShadow: '0 28px 90px rgba(0, 0, 0, 0.28)',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <section
        style={{
          flex: 1,
          minWidth: 0,
          background: '#252525',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 56,
            flexShrink: 0,
            background: '#303030',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            title="Close preview"
            aria-label="Close preview"
            style={{
              width: 34,
              height: 34,
              border: 'none',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <CloseIcon />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 650,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.filename}
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              color: '#D8D8D8',
              padding: '5px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
            }}
          >
            {extension || 'FILE'}
          </span>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
          }}
        >
          {isLoadingUrl ? (
            <div style={{ color: '#D7D7D7', fontSize: 14, alignSelf: 'center' }}>
              Loading preview...
            </div>
          ) : previewError ? (
            <PreviewFallback title="Preview unavailable" detail={previewError} />
          ) : kind === 'pdf' && previewUrl ? (
            <iframe
              title={file.filename}
              src={previewUrl}
              style={{ width: '100%', height: '100%', border: 0, background: '#1F1F1F' }}
            />
          ) : kind === 'markdown' ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                background: '#FFFFFF',
                color: '#2B2B2B',
                padding: '40px min(56px, 7vw)',
                lineHeight: 1.58,
              }}
            >
              {markdown ? (
                <ReactMarkdown>{markdown}</ReactMarkdown>
              ) : (
                <PreviewFallback
                  title="Markdown preview unavailable"
                  detail="The file can still be downloaded from the actions panel."
                  light
                />
              )}
            </div>
          ) : kind === 'office' && officeUrl && previewUrl?.startsWith('https://') ? (
            <iframe
              title={file.filename}
              src={officeUrl}
              style={{ width: '100%', height: '100%', border: 0, background: '#2A2A2A' }}
            />
          ) : (
            <PreviewFallback
              title="Preview unavailable"
              detail="This file type cannot be previewed here yet."
            />
          )}
        </div>
      </section>

      <aside
        style={{
          width: 300,
          flexShrink: 0,
          background: '#FFFFFF',
          borderLeft: '1px solid #E5E5E5',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ padding: '30px 26px 18px', borderBottom: '1px solid #E7E7E7' }}>
          <h2
            style={{
              fontSize: 24,
              lineHeight: '29px',
              fontWeight: 650,
              color: '#252525',
              margin: 0,
              overflowWrap: 'anywhere',
            }}
          >
            {file.filename}
          </h2>
          <p style={{ marginTop: 10, fontSize: 13, color: '#777777' }}>
            {formatDate(file.createdAt)}
          </p>
        </div>
        {actionError && (
          <p
            role="alert"
            style={{
              margin: '14px 26px 0',
              padding: '10px 12px',
              borderRadius: 10,
              background: '#FEF2F2',
              color: '#B42318',
              fontSize: 13,
              lineHeight: '18px',
            }}
          >
            {actionError}
          </p>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 26px' }}>
          <section>
            <div style={{ fontSize: 12, color: '#555555', fontWeight: 650, marginBottom: 10 }}>
              Summary
            </div>
            {summaryState.isLoading || summaryState.isFetching ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {[0, 1, 2].map((key) => (
                  <div
                    key={key}
                    style={{
                      height: 12,
                      borderRadius: 999,
                      background: '#EEEEEE',
                      width: `${88 - key * 12}%`,
                    }}
                  />
                ))}
              </div>
            ) : summaryState.data?.status === 'ready' && summaryState.data.summary.length ? (
              <ul
                style={{
                  display: 'grid',
                  gap: 10,
                  paddingLeft: 18,
                  color: '#595959',
                  fontSize: 13,
                  lineHeight: '18px',
                }}
              >
                {summaryState.data.summary.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#777777', fontSize: 13, lineHeight: '18px' }}>
                {summaryState.data?.detail ||
                  (summaryState.error
                    ? 'Summary could not be generated.'
                    : 'Summary is not available for this file.')}
              </p>
            )}
          </section>

          {file.description ? (
            <section style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #EAEAEA' }}>
              <div style={{ fontSize: 12, color: '#555555', fontWeight: 650, marginBottom: 8 }}>
                Description
              </div>
              <p style={{ color: '#777777', fontSize: 13, lineHeight: '18px' }}>
                {file.description}
              </p>
            </section>
          ) : null}

          {kind === 'office' && previewUrl && !previewUrl.startsWith('https://') ? (
            <section
              style={{
                marginTop: 24,
                padding: 12,
                borderRadius: 10,
                background: '#F7F7F7',
                color: '#6C6C6C',
                fontSize: 12,
                lineHeight: '17px',
              }}
            >
              Microsoft preview requires an externally reachable HTTPS file URL.
            </section>
          ) : null}
        </div>

        <div
          style={{
            padding: '18px 26px 26px',
            borderTop: '1px solid #E7E7E7',
            display: 'flex',
            gap: 14,
            justifyContent: 'center',
          }}
        >
          <IconButton label="Download" onClick={previewUrl ? download : undefined}>
            <DownloadIcon />
          </IconButton>
          <IconButton
            label="Open in editor"
            onClick={onEdit && file.sourceType === 'document' ? () => onEdit(file) : undefined}
          >
            <EditIcon />
          </IconButton>
          <IconButton label="Share" onClick={onShare ? () => onShare(file) : undefined}>
            <ShareIcon />
          </IconButton>
        </div>
      </aside>
    </AccessibleDialog>
  )
}

function PreviewFallback({
  title,
  detail,
  light = false,
}: {
  title: string
  detail: string
  light?: boolean
}) {
  return (
    <div
      style={{
        alignSelf: 'center',
        color: light ? '#4F4F4F' : '#D7D7D7',
        textAlign: 'center',
        maxWidth: 360,
        padding: 24,
        margin: 'auto',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: '19px', color: light ? '#777777' : '#AFAFAF' }}>
        {detail}
      </div>
    </div>
  )
}
