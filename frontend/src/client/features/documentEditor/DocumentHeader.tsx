import {
  useEffect,
  useId,
  useRef,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import calendarIcon from '../../assets/document-editor/calendar.svg'
import clipboardExportIcon from '../../assets/document-editor/clipboard-export.svg'
import docIcon from '../../assets/document-editor/doc-icon.svg'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface Collaborator {
  active?: boolean
  color: string
  initials: string
  name: string
}

interface DocumentHeaderProps {
  canEditDocument: boolean
  canManageDocumentSharing: boolean
  canOwnerReviewApproval: boolean
  canSendForApproval: boolean
  displayedCollaborators: Collaborator[]
  docName: string
  exportDisabled: boolean
  exportError: string | null
  handleExportDocx: () => Promise<boolean>
  handleExportPdf: () => Promise<boolean>
  handleSaveVersion: () => Promise<boolean>
  isEditorFocused: boolean
  isExporting: boolean
  isSavingVersion: boolean
  isSendingForApproval: boolean
  moreOptionsDropdownOpen: boolean
  moreOptionsDropdownRef: RefObject<HTMLDivElement | null>
  setApprovalError: Dispatch<SetStateAction<string>>
  setApprovalModalOpen: Dispatch<SetStateAction<boolean>>
  setInviteError: Dispatch<SetStateAction<string>>
  setInviteModalOpen: Dispatch<SetStateAction<boolean>>
  setInviteNotice: Dispatch<SetStateAction<string>>
  setMoreOptionsDropdownOpen: Dispatch<SetStateAction<boolean>>
  setOwnerApprovalError: Dispatch<SetStateAction<string>>
  setOwnerApproveModalOpen: Dispatch<SetStateAction<boolean>>
  setOwnerRejectAnchor: Dispatch<SetStateAction<string>>
  setOwnerRejectModalOpen: Dispatch<SetStateAction<boolean>>
  setOwnerRejectNote: Dispatch<SetStateAction<string>>
  setOwnerRejectPage: Dispatch<SetStateAction<string>>
  setOwnerRejectSection: Dispatch<SetStateAction<string>>
  statusConfig: { bg: string; color: string; label: string }
  updatedTimeDisplay: string
  versionSaveDisabled: boolean
  versionSaveMessage: string
}

export function DocumentHeader({
  canEditDocument,
  canManageDocumentSharing,
  canOwnerReviewApproval,
  canSendForApproval,
  displayedCollaborators,
  docName,
  exportDisabled,
  exportError,
  handleExportDocx,
  handleExportPdf,
  handleSaveVersion,
  isEditorFocused,
  isExporting,
  isSavingVersion,
  isSendingForApproval,
  moreOptionsDropdownOpen,
  moreOptionsDropdownRef,
  setApprovalError,
  setApprovalModalOpen,
  setInviteError,
  setInviteModalOpen,
  setInviteNotice,
  setMoreOptionsDropdownOpen,
  setOwnerApprovalError,
  setOwnerApproveModalOpen,
  setOwnerRejectAnchor,
  setOwnerRejectModalOpen,
  setOwnerRejectNote,
  setOwnerRejectPage,
  setOwnerRejectSection,
  statusConfig,
  updatedTimeDisplay,
  versionSaveDisabled,
  versionSaveMessage,
}: DocumentHeaderProps) {
  const menuId = useId()
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOptionsDropdownOpen) return
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [moreOptionsDropdownOpen])

  const closeMenu = (restoreFocus = true) => {
    setMoreOptionsDropdownOpen(false)
    if (restoreFocus) menuTriggerRef.current?.focus()
  }

  const runMenuAction = async (action: () => Promise<boolean>) => {
    if (await action()) closeMenu()
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMenu()
      return
    }
    if (event.key === 'Tab') {
      setMoreOptionsDropdownOpen(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ??
        [],
    )
    if (items.length === 0) return
    event.preventDefault()
    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length
    items[nextIndex].focus()
  }

  return (
    <>
      <header
        aria-label="Document header"
        aria-hidden={isEditorFocused ? true : undefined}
        inert={isEditorFocused ? true : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: isEditorFocused ? '0px' : '50px',
          padding: isEditorFocused ? '0 16px' : '6px 16px',
          backgroundColor: '#FFFFFF',
          borderBottom: isEditorFocused ? 'none' : '1px solid #EDEDED',
          overflow: isEditorFocused ? 'hidden' : 'visible',
          transition: 'height 0.2s ease, padding 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '19px', height: '19px' }}>
            <div
              style={{
                width: '19px',
                height: '19px',
                backgroundColor: '#D0D3D6',
                borderRadius: '4px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '3.5px',
                  left: '3.5px',
                  width: '12px',
                  height: '2px',
                  backgroundColor: '#FAFEFF',
                  borderRadius: '1px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '8.5px',
                  left: '3.5px',
                  width: '12px',
                  height: '2px',
                  backgroundColor: '#FAFEFF',
                  borderRadius: '1px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '13.5px',
                  left: '3.5px',
                  width: '12px',
                  height: '2px',
                  backgroundColor: '#FAFEFF',
                  borderRadius: '1px',
                }}
              />
            </div>
            <img
              src={docIcon}
              alt=""
              style={{
                position: 'absolute',
                right: '-2px',
                bottom: '-2px',
                width: '11px',
                height: '11px',
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.9px',
              margin: 0,
            }}
          >
            {docName}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            role="status"
            aria-label={`Document status: ${statusConfig.label}`}
            style={{
              backgroundColor: statusConfig.bg,
              borderRadius: '6px',
              padding: '3px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: statusConfig.color,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 510,
                color: statusConfig.color,
                letterSpacing: '-0.6px',
              }}
            >
              {statusConfig.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <img src={calendarIcon} alt="" style={{ width: '18px', height: '18px' }} />
            <time
              aria-label={`Last updated: ${updatedTimeDisplay}`}
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
              }}
            >
              {updatedTimeDisplay}
            </time>
          </div>
          {canSendForApproval && (
            <button
              type="button"
              onClick={() => {
                setApprovalError('')
                setApprovalModalOpen(true)
              }}
              disabled={isSendingForApproval}
              style={{
                height: '34px',
                padding: '0 14px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isSendingForApproval ? '#CCCCCC' : '#272727',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 510,
                cursor: isSendingForApproval ? 'not-allowed' : 'pointer',
                fontFamily,
                whiteSpace: 'nowrap',
              }}
            >
              {isSendingForApproval ? 'Sending...' : 'Send for approval'}
            </button>
          )}
          {canOwnerReviewApproval && (
            <>
              <button
                type="button"
                onClick={() => {
                  setOwnerApprovalError('')
                  setOwnerApproveModalOpen(true)
                }}
                disabled={isSendingForApproval}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isSendingForApproval ? '#CCCCCC' : '#272727',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 510,
                  cursor: isSendingForApproval ? 'not-allowed' : 'pointer',
                  fontFamily,
                  whiteSpace: 'nowrap',
                }}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setOwnerApprovalError('')
                  setOwnerRejectNote('')
                  setOwnerRejectPage('')
                  setOwnerRejectSection('')
                  setOwnerRejectAnchor('')
                  setOwnerRejectModalOpen(true)
                }}
                disabled={isSendingForApproval}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  border: '1px solid #F2C7C3',
                  borderRadius: '8px',
                  backgroundColor: '#FFF7F6',
                  color: '#C83A2D',
                  fontSize: '13px',
                  fontWeight: 510,
                  cursor: isSendingForApproval ? 'not-allowed' : 'pointer',
                  fontFamily,
                  whiteSpace: 'nowrap',
                }}
              >
                Reject
              </button>
            </>
          )}
          {displayedCollaborators.length > 0 && (
            <button
              type="button"
              aria-label={`${canManageDocumentSharing ? 'Manage' : 'View'} collaborators: ${displayedCollaborators
                .map((collaborator) => collaborator.name)
                .join(', ')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '7px 0',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
              }}
              onClick={() => {
                setInviteError('')
                setInviteNotice('')
                setInviteModalOpen(true)
              }}
            >
              {displayedCollaborators.map((collab, idx) => (
                <div
                  key={idx}
                  title={collab.name}
                  style={{
                    width: '25px',
                    height: '25px',
                    borderRadius: '50%',
                    backgroundColor: collab.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: idx > 0 ? '-6px' : 0,
                    border: collab.active ? '1px solid #30D294' : 'none',
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 510, color: '#FFFFFF' }}>
                    {collab.initials}
                  </span>
                </div>
              ))}
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveVersion}
            disabled={versionSaveDisabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '34px',
              padding: '0 14px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: versionSaveDisabled ? '#E5E5E5' : '#272727',
              color: versionSaveDisabled ? '#999' : '#FFFFFF',
              fontSize: '13px',
              fontWeight: 510,
              cursor: versionSaveDisabled ? 'not-allowed' : 'pointer',
              fontFamily,
              opacity: versionSaveDisabled ? 0.7 : 1,
            }}
            title={!canEditDocument ? 'Your current document role cannot save edits' : ''}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M11 13H3C2.46957 13 1.96086 12.7893 1.58579 12.4142C1.21071 12.0391 1 11.5304 1 11V3C1 2.46957 1.21071 1.96086 1.58579 1.58579C1.96086 1.21071 2.46957 1 3 1H9L13 5V11C13 11.5304 12.7893 12.0391 12.4142 12.4142C12.0391 12.7893 11.5304 13 11 13Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 1V5H13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M4 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M4 7H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {isSavingVersion ? 'Saving...' : 'Save'}
          </button>
          {canManageDocumentSharing && (
            <button
              type="button"
              onClick={() => {
                setInviteError('')
                setInviteNotice('')
                setInviteModalOpen(true)
              }}
              style={{
                height: '34px',
                padding: '0 14px',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#454545',
                fontSize: '13px',
                fontWeight: 510,
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Share
            </button>
          )}
          <div ref={moreOptionsDropdownRef} style={{ position: 'relative' }}>
            <button
              ref={menuTriggerRef}
              type="button"
              aria-label="More document actions"
              aria-haspopup="menu"
              aria-expanded={moreOptionsDropdownOpen}
              aria-controls={moreOptionsDropdownOpen ? menuId : undefined}
              onClick={() => setMoreOptionsDropdownOpen(!moreOptionsDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                backgroundColor: moreOptionsDropdownOpen ? '#F7F7F7' : '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                cursor: 'pointer',
                transform: 'rotate(90deg)',
              }}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="4" cy="10" r="1.5" fill="#454545" />
                <circle cx="10" cy="10" r="1.5" fill="#454545" />
                <circle cx="16" cy="10" r="1.5" fill="#454545" />
              </svg>
            </button>
            {moreOptionsDropdownOpen && (
              <div
                id={menuId}
                ref={menuRef}
                role="menu"
                aria-label="Document actions"
                onKeyDown={handleMenuKeyDown}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F7F7F7',
                  borderRadius: '8px',
                  boxShadow: '0px 0px 11.5px rgba(0, 0, 0, 0.24)',
                  minWidth: '200px',
                  zIndex: 9999,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={versionSaveDisabled}
                  onClick={() => void runMenuAction(handleSaveVersion)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    height: '40px',
                    boxSizing: 'border-box',
                    cursor: versionSaveDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: '#FFFFFF',
                    opacity: versionSaveDisabled ? 0.55 : 1,
                    transition: 'background-color 0.15s ease',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily,
                  }}
                  onMouseEnter={(e) =>
                    !versionSaveDisabled && (e.currentTarget.style.backgroundColor = '#F5F5F5')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  title={!canEditDocument ? 'Your current document role cannot save edits' : ''}
                >
                  <img src={clipboardExportIcon} alt="" style={{ width: '16px', height: '16px' }} />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                      fontFamily,
                    }}
                  >
                    {isSavingVersion ? 'Saving...' : 'Save as a Version'}
                  </span>
                </button>
                <div
                  role="separator"
                  style={{ height: '1px', backgroundColor: '#EDEDED', margin: '4px 0' }}
                />
                <button
                  type="button"
                  role="menuitem"
                  disabled={exportDisabled || isExporting}
                  onClick={() => void runMenuAction(handleExportPdf)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    height: '40px',
                    boxSizing: 'border-box',
                    cursor: exportDisabled || isExporting ? 'not-allowed' : 'pointer',
                    backgroundColor: '#FFFFFF',
                    opacity: exportDisabled || isExporting ? 0.55 : 1,
                    transition: 'background-color 0.15s ease',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily,
                  }}
                  onMouseEnter={(e) =>
                    !exportDisabled &&
                    !isExporting &&
                    (e.currentTarget.style.backgroundColor = '#F5F5F5')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  title={exportDisabled ? 'No document data to export' : ''}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 1H10L14 5V14C14 14.5523 13.5523 15 13 15H4C3.44772 15 3 14.5523 3 14V2C3 1.44772 3.44772 1 4 1Z"
                      fill="#E53935"
                    />
                    <path d="M10 1V5H14L10 1Z" fill="#FFCDD2" />
                    <text
                      x="8.5"
                      y="11"
                      fontSize="4"
                      fontWeight="700"
                      fill="white"
                      textAnchor="middle"
                    >
                      PDF
                    </text>
                  </svg>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                      fontFamily,
                    }}
                  >
                    Export as PDF
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={exportDisabled || isExporting}
                  onClick={() => void runMenuAction(handleExportDocx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    height: '40px',
                    boxSizing: 'border-box',
                    cursor: exportDisabled || isExporting ? 'not-allowed' : 'pointer',
                    backgroundColor: '#FFFFFF',
                    opacity: exportDisabled || isExporting ? 0.55 : 1,
                    transition: 'background-color 0.15s ease',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily,
                  }}
                  onMouseEnter={(e) =>
                    !exportDisabled &&
                    !isExporting &&
                    (e.currentTarget.style.backgroundColor = '#F5F5F5')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  title={exportDisabled ? 'No document data to export' : ''}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 1H10L14 5V14C14 14.5523 13.5523 15 13 15H4C3.44772 15 3 14.5523 3 14V2C3 1.44772 3.44772 1 4 1Z"
                      fill="#454545"
                    />
                    <path d="M10 1V5H14L10 1Z" fill="#E5E5E5" />
                    <text
                      x="8.5"
                      y="11"
                      fontSize="3.5"
                      fontWeight="700"
                      fill="white"
                      textAnchor="middle"
                    >
                      DOCX
                    </text>
                  </svg>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                      fontFamily,
                    }}
                  >
                    Export as Word DOCX
                  </span>
                </button>
                {exportError && (
                  <p
                    role="alert"
                    style={{
                      margin: '8px 12px 12px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#FEF2F2',
                      color: '#B42318',
                      fontSize: '12px',
                      lineHeight: '17px',
                    }}
                  >
                    {exportError}
                  </p>
                )}
              </div>
            )}
          </div>
          {versionSaveMessage && (
            <span
              role="status"
              aria-live="polite"
              style={{
                fontSize: '12px',
                fontWeight: 510,
                color: versionSaveMessage.startsWith('Saved') ? '#2F7D32' : '#C83A2D',
                letterSpacing: '-0.4px',
              }}
            >
              {versionSaveMessage}
            </span>
          )}
        </div>
      </header>
    </>
  )
}
