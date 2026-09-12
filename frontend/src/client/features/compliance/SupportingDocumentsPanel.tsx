import { useEffect, useRef, useState } from 'react'
import browseFilesIcon from '../../assets/browse-files-icon.svg'
import closeIcon from '../../assets/document-editor/close-icon.svg'
import copyBrowseIcon from '../../assets/docs-compliance/copy-icon.svg'
import trashIcon from '../../assets/docs-compliance/trash-icon.svg'
import uploadDocumentIcon from '../../assets/docs-compliance/upload-document-icon.svg'
import uploadBoxIcon from '../../assets/docs-compliance/picker-2.svg'
import FileTypeIcon from '../../components/FileTypeIcon'
import { formatTimeAgo, type SupportingDocument } from './complianceModels'
import { complianceFontFamily, handlePopupKeyDown } from './compliancePresentation'

interface SupportingDocumentsPanelProps {
  documents: SupportingDocument[]
  primaryDocumentHeight: number | null
  onUpload: () => void
  onBrowse: () => void
  onClear: () => void | Promise<void>
  onPreview: (document: SupportingDocument) => void
  onRemove: (documentId: string) => void | Promise<void>
}

export function SupportingDocumentsPanel({
  documents,
  primaryDocumentHeight,
  onUpload,
  onBrowse,
  onClear,
  onPreview,
  onRemove,
}: SupportingDocumentsPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hoveredDocumentId, setHoveredDocumentId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', closeOnOutsideClick)
    return () => document.removeEventListener('click', closeOnOutsideClick)
  }, [menuOpen])

  const closeMenu = () => {
    setMenuOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <div
      style={{
        width: '50%',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #EDEDED',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '11px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDEDED',
          borderRadius: '12px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '11px',
          overflow: 'hidden',
          height: primaryDocumentHeight ? `${primaryDocumentHeight + 60}px` : 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 6px',
            flexShrink: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              fontFamily: complianceFontFamily,
            }}
          >
            Supporting Documents
          </p>
          <div ref={containerRef} style={{ position: 'relative' }} data-dropdown>
            <button
              ref={triggerRef}
              type="button"
              aria-label="Supporting document actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="supporting-documents-menu"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen(!menuOpen)
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#999999',
                  letterSpacing: '2px',
                }}
              >
                •••
              </span>
            </button>
            {menuOpen && (
              <div
                id="supporting-documents-menu"
                role="menu"
                aria-label="Supporting document actions"
                onKeyDown={(event) => handlePopupKeyDown(event, '[role="menuitem"]', closeMenu)}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F7F7F7',
                  borderRadius: '8px',
                  boxShadow: '0px 0px 15.3px 0px rgba(0, 0, 0, 0.12)',
                  zIndex: 100,
                  minWidth: '160px',
                  padding: '4px',
                }}
              >
                <DocumentMenuItem
                  autoFocus
                  icon={uploadDocumentIcon}
                  label="Upload Document"
                  onClick={() => {
                    onUpload()
                    setMenuOpen(false)
                  }}
                  flip
                />
                <DocumentMenuItem
                  icon={copyBrowseIcon}
                  label="Browse files"
                  onClick={() => {
                    onBrowse()
                    setMenuOpen(false)
                  }}
                />
                <DocumentMenuItem
                  icon={trashIcon}
                  label="Clear all"
                  onClick={() => {
                    void onClear()
                    setMenuOpen(false)
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div
          className="custom-scrollbar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          {documents.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px',
                }}
              >
                <img src={uploadBoxIcon} alt="Upload" style={{ width: '50px', height: '60px' }} />
                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: complianceFontFamily,
                      fontSize: '14px',
                      color: '#454545',
                      letterSpacing: '-0.7px',
                      lineHeight: '16px',
                    }}
                  >
                    Drag & drop files here or <br /> browse from your device
                  </p>
                  <p
                    style={{
                      color: '#666666',
                      fontSize: '14px',
                      fontWeight: 510,
                      lineHeight: '16px',
                      letterSpacing: '-0.7px',
                    }}
                  >
                    Supports PDF, DOCX, TXT up to 50 MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBrowse}
                  style={{
                    width: '200px',
                    height: '40px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EDEDED',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <img
                    src={browseFilesIcon}
                    alt="Browse"
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span
                    style={{
                      fontFamily: complianceFontFamily,
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                    }}
                  >
                    Browse Files
                  </span>
                </button>
              </div>
            </div>
          ) : (
            documents.map((document) => (
              <div
                key={document.id}
                onMouseEnter={() => setHoveredDocumentId(document.id)}
                onMouseLeave={() => setHoveredDocumentId(null)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDEDED',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => onPreview(document)}
                  aria-label={`Preview ${document.filename}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    flex: 1,
                    minWidth: 0,
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                    <FileTypeIcon filename={document.filename} />
                  </span>
                  <span
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}
                  >
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 510,
                        color: '#454545',
                        letterSpacing: '-0.8px',
                        lineHeight: '21px',
                        fontFamily: complianceFontFamily,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {document.filename}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 510, color: '#999999' }}>
                      {formatTimeAgo(document.created_at)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${document.filename}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    void onRemove(document.id)
                  }}
                  onFocus={(event) => (event.currentTarget.style.opacity = '1')}
                  onBlur={(event) =>
                    (event.currentTarget.style.opacity =
                      hoveredDocumentId === document.id ? '0.6' : '0')
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: hoveredDocumentId === document.id ? 0.6 : 0,
                  }}
                >
                  <img src={closeIcon} alt="" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentMenuItem({
  icon,
  label,
  onClick,
  autoFocus = false,
  flip = false,
}: {
  icon: string
  label: string
  onClick: () => void
  autoFocus?: boolean
  flip?: boolean
}) {
  return (
    <button
      autoFocus={autoFocus}
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        width: '100%',
        height: '40px',
        padding: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: complianceFontFamily,
      }}
    >
      <img
        src={icon}
        alt=""
        style={{
          width: '16px',
          height: '16px',
          transform: flip ? 'rotate(180deg) scaleX(-1)' : undefined,
        }}
      />
      <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>{label}</span>
    </button>
  )
}
