import type { MouseEvent } from 'react'
import browseFilesIcon from '../../assets/browse-files-icon.svg'
import calendarIcon from '../../assets/compliance/calendar-icon.svg'
import dangerIcon from '../../assets/compliance/danger-icon.svg'
import diagramIcon from '../../assets/compliance/diagram-icon.svg'
import documentIcon from '../../assets/compliance/document-icon.svg'
import judgeIcon from '../../assets/compliance/judge-elements.svg'
import moreActionIcon from '../../assets/compliance/more-action.svg'
import starIcon from '../../assets/compliance/star-icon.svg'
import uploadBoxIcon from '../../assets/upload-box-icon.svg'
import { complianceFontFamily, visuallyHidden } from './compliancePresentation'
import { getRiskLabel, type ComplianceListDocument } from './reviewListModel'

interface ComplianceListContentProps {
  documents: ComplianceListDocument[]
  isUploading: boolean
  activeMenuId: string | null
  activeContextMenuId: string | null
  onUpload: () => void
  onBrowse: () => void
  onOpenReview: (document: ComplianceListDocument) => void
  onOpenMenu: (
    document: ComplianceListDocument,
    position: { top: number; left: number },
    trigger: HTMLButtonElement,
  ) => void
  onOpenContextMenu: (
    document: ComplianceListDocument,
    position: { top: number; left: number },
    trigger: HTMLButtonElement | null,
  ) => void
}

const columns = [
  { icon: documentIcon, label: 'Document Name', width: '217px' },
  { icon: starIcon, label: 'Review Type', width: '187px' },
  { icon: dangerIcon, label: 'Risk Status', width: '186px' },
  { icon: diagramIcon, label: 'Compliance Score', width: '191px', iconSize: '14px' },
  { icon: judgeIcon, label: 'Reviewer', width: '185px' },
  { icon: calendarIcon, label: 'Updated Time', width: '264px' },
]

export function ComplianceListContent({
  documents,
  isUploading,
  activeMenuId,
  activeContextMenuId,
  onUpload,
  onBrowse,
  onOpenReview,
  onOpenMenu,
  onOpenContextMenu,
}: ComplianceListContentProps) {
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {documents.length} compliance review{documents.length === 1 ? '' : 's'} shown
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {documents.length === 0 ? (
          <ComplianceListEmptyState
            isUploading={isUploading}
            onUpload={onUpload}
            onBrowse={onBrowse}
          />
        ) : (
          <>
            <ComplianceListHeader />
            {documents.map((document, index) => (
              <ComplianceListRow
                key={document.id}
                document={document}
                highlighted={index !== 0}
                menuOpen={activeMenuId === document.id}
                contextMenuOpen={activeContextMenuId === document.id}
                onOpenReview={onOpenReview}
                onOpenMenu={onOpenMenu}
                onOpenContextMenu={onOpenContextMenu}
              />
            ))}
          </>
        )}
      </div>
    </>
  )
}

function ComplianceListEmptyState({
  isUploading,
  onUpload,
  onBrowse,
}: {
  isUploading: boolean
  onUpload: () => void
  onBrowse: () => void
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <div
          style={{
            backgroundColor: '#EDEDED',
            borderRadius: '66.92px',
            padding: '18px',
            display: 'flex',
          }}
        >
          <img src={uploadBoxIcon} alt="Upload" style={{ width: '39px', height: '39px' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontFamily: complianceFontFamily,
              fontSize: '16px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              width: '219px',
            }}
          >
            No documents to review
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: complianceFontFamily,
              fontSize: '14px',
              color: '#454545',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              width: '280px',
            }}
          >
            Add documents to start compliance review and risk analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            aria-label={isUploading ? 'Uploading document' : 'Upload document'}
            aria-busy={isUploading}
            onClick={onUpload}
            disabled={isUploading}
            style={{
              width: '135px',
              height: '40px',
              backgroundColor: '#272727',
              border: 'none',
              borderRadius: '12px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isUploading ? 0.7 : 1,
            }}
          >
            {isUploading ? (
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #FFFFFF',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ) : (
              <span
                style={{
                  fontFamily: complianceFontFamily,
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#FFFFFF',
                  letterSpacing: '-0.7px',
                }}
              >
                Upload
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onBrowse}
            style={{
              width: '135px',
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
            <img src={browseFilesIcon} alt="Browse" style={{ width: '20px', height: '20px' }} />
            <span
              style={{
                fontFamily: complianceFontFamily,
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
              }}
            >
              Browse Files
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ComplianceListHeader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#F4F4F4',
        borderBottom: '1px solid #F3F3F3',
      }}
    >
      {columns.map((column) => (
        <div key={column.label} style={{ width: column.width, padding: '6px 29px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '32px',
              padding: '8px 14px',
              justifyContent: 'center',
            }}
          >
            <img
              src={column.icon}
              alt=""
              style={{
                width: column.iconSize || '16px',
                height: column.iconSize || '16px',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
                whiteSpace: 'nowrap',
              }}
            >
              {column.label}
            </span>
          </div>
        </div>
      ))}
      <div style={{ flex: 1, minWidth: '100px', padding: '6px 29px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '32px',
            padding: '8px 14px',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            More action
          </span>
        </div>
      </div>
    </div>
  )
}

function ComplianceListRow({
  document,
  highlighted,
  menuOpen,
  contextMenuOpen,
  onOpenReview,
  onOpenMenu,
  onOpenContextMenu,
}: {
  document: ComplianceListDocument
  highlighted: boolean
  menuOpen: boolean
  contextMenuOpen: boolean
  onOpenReview: (document: ComplianceListDocument) => void
  onOpenMenu: ComplianceListContentProps['onOpenMenu']
  onOpenContextMenu: ComplianceListContentProps['onOpenContextMenu']
}) {
  const cellStyle = {
    height: '60px',
    padding: '6px 29px',
    backgroundColor: highlighted ? '#FAFAFA' : '#FFFFFF',
    borderRight: '1px solid #F3F3F3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as const

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onOpenContextMenu(
      document,
      { top: event.clientY, left: event.clientX },
      event.currentTarget.querySelector('button'),
    )
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: highlighted ? '#E7EEF7' : '#FFFFFF',
        borderBottom: '1px solid #F3F3F3',
      }}
    >
      <div
        style={{
          ...cellStyle,
          width: '217px',
          padding: '6px 31px',
          justifyContent: 'flex-start',
          borderLeft: '1px solid #F3F3F3',
        }}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={contextMenuOpen}
          aria-controls="compliance-context-menu"
          onKeyDown={(event) => {
            if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            onOpenContextMenu(document, { top: rect.bottom, left: rect.right }, event.currentTarget)
          }}
          onClick={() => onOpenReview(document)}
          style={{
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            wordBreak: 'break-word',
            fontFamily: complianceFontFamily,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {document.name}
        </button>
      </div>
      <ListCell style={cellStyle} width="187.333px">
        {document.reviewType}
      </ListCell>
      <div style={{ ...cellStyle, width: '187.333px' }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '32px',
            padding: '8px 14px',
            border: '1px solid #F3F3F3',
            borderRadius: '12px',
            width: '100%',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontFamily: complianceFontFamily,
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
            }}
          />
          {getRiskLabel(document.riskStatus, document.riskCount)}
        </span>
      </div>
      <ListCell style={cellStyle} width="187.333px">
        {document.complianceScore === null
          ? 'Not scored'
          : `${document.complianceScore}% Compliant`}
      </ListCell>
      <ListCell style={cellStyle} width="187.333px">
        {document.reviewer}
      </ListCell>
      <ListCell style={cellStyle} width="263px">
        {document.updatedTime}
      </ListCell>
      <div style={{ ...cellStyle, flex: 1, minWidth: '100px', position: 'relative' }}>
        <button
          type="button"
          aria-label={`More actions for ${document.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls="compliance-row-action-menu"
          onClick={(event) => {
            event.stopPropagation()
            const rect = event.currentTarget.getBoundingClientRect()
            onOpenMenu(
              document,
              { top: rect.bottom + 4, left: rect.left - 120 },
              event.currentTarget,
            )
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = '#F0F0F0'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <img src={moreActionIcon} alt="More actions" style={{ width: '19px', height: '5px' }} />
        </button>
      </div>
    </div>
  )
}

function ListCell({
  children,
  width,
  style,
}: {
  children: React.ReactNode
  width: string
  style: React.CSSProperties
}) {
  return (
    <div style={{ ...style, width }}>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.7px',
          lineHeight: '16px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontFamily: complianceFontFamily,
        }}
      >
        {children}
      </span>
    </div>
  )
}
