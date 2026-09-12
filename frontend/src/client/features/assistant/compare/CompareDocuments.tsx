import { useRef, useState } from 'react'
import docxIcon from '../../../assets/file-types/docx.png'
import pdfIcon from '../../../assets/file-types/pdf.png'
import uploadBoxIcon from '../../../assets/upload-box-icon.svg'
import { Button, IconButton } from '../../../components/ui/Button'
import type { CompareDocument } from '../home/assistantHomeModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 4V16M4 10H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getFileTypeInfo(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isImage =
    file.type.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)

  if (isImage) {
    return { icon: 'IMG', isImage: true }
  }
  if (ext === 'pdf' || file.type.includes('pdf')) {
    return {
      icon: <img src={pdfIcon} alt="PDF" style={{ width: '32px', height: '32px' }} />,
      isImage: false,
    }
  }
  if (['doc', 'docx'].includes(ext) || file.type.includes('word')) {
    return {
      icon: <img src={docxIcon} alt="DOC" style={{ width: '32px', height: '32px' }} />,
      isImage: false,
    }
  }
  if (ext === 'txt' || file.type.includes('text')) {
    return { icon: 'TXT', isImage: false }
  }
  if (ext === 'rtf') {
    return { icon: 'RTF', isImage: false }
  }
  if (ext === 'odt') {
    return { icon: 'ODT', isImage: false }
  }
  return { icon: 'FILE', isImage: false }
}

interface CompareDocumentsProps {
  documents: CompareDocument[]
  onChange: React.Dispatch<React.SetStateAction<CompareDocument[]>>
}

export function CompareDocuments({ documents, onChange }: CompareDocumentsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)

  const selectFile = (slotId: string) => {
    setActiveSlot(slotId)
    inputRef.current?.click()
  }

  const replaceFile = (slotId: string, file: File, previewUrl: string | null) => {
    onChange((current) =>
      current.map((document) => {
        if (document.id !== slotId) return document
        if (document.previewUrl) URL.revokeObjectURL(document.previewUrl)
        return { ...document, file, previewUrl }
      }),
    )
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && activeSlot) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const isImage =
        file.type.startsWith('image/') ||
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
      replaceFile(activeSlot, file, isImage ? URL.createObjectURL(file) : null)
    }
    event.target.value = ''
    setActiveSlot(null)
  }

  const handleDrop = (event: React.DragEvent, slotId: string) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOverSlot(null)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      replaceFile(slotId, file, file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    }
  }

  const removeSlot = (slotId: string) => {
    onChange((current) => {
      if (current.length <= 2) return current
      const removed = current.find((document) => document.id === slotId)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return current.filter((document) => document.id !== slotId)
    })
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '780px',
        marginBottom: '24px',
        animation: 'slideDownFadeIn 0.3s ease-out',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        aria-label="Upload a comparison document"
        accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.webp,.bmp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <h2
        id="comparison-upload-heading"
        style={{
          fontSize: '16px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.5px',
          marginBottom: '16px',
        }}
      >
        Upload Documents to Compare
      </h2>
      <div
        role="group"
        aria-labelledby="comparison-upload-heading"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {documents.map((document, index) => {
          const isDragOver = dragOverSlot === document.id
          const isHovered = hoveredSlot === document.id
          const fileInfo = document.file ? getFileTypeInfo(document.file) : null

          return (
            <div
              key={document.id}
              onDragOver={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setDragOverSlot(document.id)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setDragOverSlot(null)
              }}
              onDrop={(event) => handleDrop(event, document.id)}
              onMouseEnter={() => setHoveredSlot(document.id)}
              onMouseLeave={() => setHoveredSlot(null)}
              style={{
                width: '120px',
                height: '120px',
                backgroundColor: isDragOver ? '#F0F7FF' : '#FFFFFF',
                border: `2px dashed ${isDragOver ? '#338CE4' : '#DEDEDE'}`,
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'default',
                position: 'relative',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
            >
              {documents.length > 2 && (
                <IconButton
                  label={`Remove comparison slot ${index + 1}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeSlot(document.id)
                  }}
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '22px',
                    height: '22px',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #E0E0E0',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666666',
                    opacity: isHovered ? 1 : 0,
                    transition:
                      'opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = '#FEE2E2'
                    event.currentTarget.style.borderColor = '#DC2626'
                    event.currentTarget.style.color = '#DC2626'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = '#FFFFFF'
                    event.currentTarget.style.borderColor = '#E0E0E0'
                    event.currentTarget.style.color = '#666666'
                  }}
                  onFocus={() => setHoveredSlot(document.id)}
                  onBlur={() => setHoveredSlot(null)}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M8 2L2 8M2 2L8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </IconButton>
              )}

              {document.file ? (
                <>
                  <IconButton
                    label={`Remove ${document.file.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (document.previewUrl) URL.revokeObjectURL(document.previewUrl)
                      onChange((current) =>
                        current.map((candidate) =>
                          candidate.id === document.id
                            ? { ...candidate, file: null, previewUrl: null }
                            : candidate,
                        ),
                      )
                    }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '22px',
                      height: '22px',
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #E0E0E0',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666666',
                      opacity: isHovered ? 1 : 0,
                      transition:
                        'opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#FEE2E2'
                      event.currentTarget.style.borderColor = '#DC2626'
                      event.currentTarget.style.color = '#DC2626'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = '#FFFFFF'
                      event.currentTarget.style.borderColor = '#E0E0E0'
                      event.currentTarget.style.color = '#666666'
                    }}
                    onFocus={() => setHoveredSlot(document.id)}
                    onBlur={() => setHoveredSlot(null)}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M8 2L2 8M2 2L8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </IconButton>

                  {document.previewUrl && fileInfo?.isImage ? (
                    <img
                      src={document.previewUrl}
                      alt={document.file.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '14px',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                    />
                  ) : (
                    <>
                      {fileInfo?.icon || 'FILE'}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 510,
                          color: '#454545',
                          textAlign: 'center',
                          padding: '0 8px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '140px',
                        }}
                      >
                        {document.file.name}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => selectFile(document.id)}
                  aria-label={`Upload comparison document ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  {isDragOver ? (
                    <>
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <path
                          d="M20 8V32M8 20H32"
                          stroke="#338CE4"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span style={{ fontSize: '13px', fontWeight: 510, color: '#338CE4' }}>
                        Drop file here
                      </span>
                    </>
                  ) : (
                    <>
                      <img
                        src={uploadBoxIcon}
                        alt=""
                        style={{ width: '40px', height: '40px', opacity: 0.4 }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 400, color: '#999999' }}>
                        Drop or click
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )
        })}

        <IconButton
          label="Add another comparison document"
          onClick={() =>
            onChange((current) => [
              ...current,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                file: null,
                previewUrl: null,
              },
            ])
          }
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#FFFFFF',
            border: '2px dashed #DEDEDE',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#999999',
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = '#BBBBBB'
            event.currentTarget.style.color = '#666666'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = '#DEDEDE'
            event.currentTarget.style.color = '#999999'
          }}
        >
          <PlusIcon />
        </IconButton>
      </div>
    </div>
  )
}
