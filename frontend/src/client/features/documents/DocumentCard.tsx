import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import docEllipsisIcon from '../../assets/doc-ellipsis-icon.svg'
import docCalendarIcon from '../../assets/doc-calendar-icon.svg'
import pdfFileIcon from '../../assets/file-types/pdf.png'
import docxFileIcon from '../../assets/file-types/docx.png'
import { Button, IconButton } from '../../components/ui/Button'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import { documentActionOptions } from './documentActionOptions'
import {
  documentFontFamily as fontFamily,
  type DocumentAction,
  type DocumentCardModel,
} from './documentLibraryModel'

function getFileTypeIcon(fileType: string | null | undefined): string | null {
  if (!fileType) return null
  const type = fileType.toLowerCase()
  if (type === 'application/pdf' || type === 'pdf') return pdfFileIcon
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    type === 'docx' ||
    type === 'doc'
  )
    return docxFileIcon
  return null
}

const FileTypeIcon = ({ fileType }: { fileType?: string | null }) => {
  const iconSrc = getFileTypeIcon(fileType)

  if (iconSrc) {
    return (
      <div
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <img src={iconSrc} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#F4F4F4',
        borderRadius: '46px',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
        <path
          d="M15.5832 4.13332V18.7C15.5832 19.8475 14.653 20.7778 13.5055 20.7778H2.07778C0.930251 20.7778 0 19.8475 0 18.7V2.07778C0 0.930253 0.930253 0 2.07778 0H11.0832L15.5832 4.13332Z"
          fill="#9761F3"
        />
        <path
          d="M15.0583 4.65276H11.0778C10.7909 4.65276 10.5583 4.4202 10.5583 4.13332V0.519444L15.0583 4.65276Z"
          fill="#EAC7FE"
        />
        <rect x="1.35" y="5.67" width="12.883" height="6" rx="1" fill="white" />
        <text
          x="7.79"
          y="9.5"
          fontSize="4.68"
          fontWeight="700"
          fill="#9761F3"
          textAnchor="middle"
          fontFamily="Poppins, sans-serif"
        >
          DOC
        </text>
      </svg>
    </div>
  )
}

interface DocumentCardProps {
  document: DocumentCardModel
  onClick: () => void
  onContextMenu?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  onContextMenuKeyDown?: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  onAction: (action: DocumentAction) => void
}

export function DocumentCard({
  document: doc,
  onClick,
  onContextMenu,
  onContextMenuKeyDown,
  onAction,
}: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownButtonRef = useRef<HTMLButtonElement>(null)
  const dropdownMenuRef = useMenuFocus({
    open: dropdownOpen,
    onClose: () => setDropdownOpen(false),
    onOpen: () => setDropdownOpen(true),
    triggerRef: dropdownButtonRef,
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !event.composedPath().includes(dropdownRef.current)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleDropdownClick = (e: ReactMouseEvent, optionId: DocumentAction) => {
    e.stopPropagation()
    setDropdownOpen(false)
    onAction(optionId)
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '15px',
        paddingTop: '18px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsHovered(false)
      }}
    >
      <Button
        aria-label={`Preview ${doc.title}`}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onKeyDown={onContextMenuKeyDown}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          border: 'none',
          borderRadius: '12px',
          background: 'transparent',
          cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 590,
              color: '#626262',
              letterSpacing: '-0.6px',
              lineHeight: '16px',
            }}
          >
            {doc.fileTypeLabel}
          </span>
        </div>
        <div ref={dropdownRef} style={{ position: 'relative', zIndex: 2 }}>
          <IconButton
            ref={dropdownButtonRef}
            label={`More actions for ${doc.title}`}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            aria-controls={dropdownOpen ? `document-actions-${doc.id}` : undefined}
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen(!dropdownOpen)
            }}
            style={{
              width: '19px',
              height: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src={docEllipsisIcon} alt="" style={{ width: '19px', height: '5px' }} />
          </IconButton>

          {dropdownOpen && (
            <div
              ref={dropdownMenuRef}
              id={`document-actions-${doc.id}`}
              role="menu"
              aria-label={`Actions for ${doc.title}`}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #F7F7F7',
                borderRadius: '8px',
                boxShadow: '0px 0px 11.5px rgba(0, 0, 0, 0.24)',
                minWidth: '170px',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              {documentActionOptions.map((option) => (
                <Button
                  key={option.id}
                  role="menuitem"
                  onClick={(e) => handleDropdownClick(e, option.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 15px',
                    height: '40px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    backgroundColor: '#FFFFFF',
                    transition: 'background-color 0.15s ease',
                    border: 'none',
                    width: '100%',
                    fontFamily,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                >
                  <img src={option.icon} alt="" style={{ width: '16px', height: '16px' }} />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: option.danger ? '#E53935' : '#454545',
                      letterSpacing: '-0.7px',
                      lineHeight: '16px',
                      fontFamily,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {option.label}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#F1F2F4',
          borderRadius: '7px',
          padding: '15px 15px 0px 15px',
          height: '120px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '9px 17px',
            display: 'flex',
            flexDirection: 'column',
            gap: '7.66px',
            minHeight: '106px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '10px',
              fontWeight: 590,
              color: '#A8A8A8',
              letterSpacing: '-0.5px',
              lineHeight: '13.8px',
              width: '98px',
            }}
          >
            {doc.title.toUpperCase()}
          </p>
          {doc.details.map((detail) => (
            <p
              key={detail}
              style={{
                margin: 0,
                fontSize: '6px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.3px',
                lineHeight: '8px',
              }}
            >
              {detail}
            </p>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FileTypeIcon fileType={doc.fileType} />
          <p
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.8px',
              lineHeight: '18px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              height: '37px',
              width: '220px',
              alignContent: 'center',
            }}
          >
            {doc.title}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {doc.status && (
            <div
              style={{
                backgroundColor: doc.status.statusBg,
                borderRadius: '8px',
                padding: '0 6px',
                height: '19px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: doc.status.statusColor,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 510,
                  color: doc.status.statusColor,
                  letterSpacing: '-0.6px',
                  lineHeight: '16px',
                  whiteSpace: 'nowrap',
                }}
              >
                {doc.status.label}
              </span>
            </div>
          )}

          {doc.updatedAtLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src={docCalendarIcon} alt="" style={{ width: '12px', height: '12px' }} />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.6px',
                  lineHeight: '16px',
                  whiteSpace: 'nowrap',
                }}
              >
                {doc.updatedAtLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
