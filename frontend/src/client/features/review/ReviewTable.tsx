import { useRef } from 'react'
import uploadBoxIcon from '../../assets/upload-box-icon.svg'
import browseFilesIcon from '../../assets/browse-files-icon.svg'
import pdfFileIcon from '../../assets/file-types/pdf.png'
import docxFileIcon from '../../assets/file-types/docx.png'
import { ColumnEditMenu } from './ColumnEditMenu'
import { ReviewCell } from './ReviewResults'
import {
  reviewFontFamily as fontFamily,
  type ColumnConfig,
  type ReviewDocument,
  type TabularCell,
} from './reviewModel'

function getFileTypeIcon(document: ReviewDocument): string | null {
  if (document.type === 'pdf') return pdfFileIcon
  if (document.type === 'word') return docxFileIcon
  return null
}

interface ReviewTableProps {
  loading: boolean
  columns: ColumnConfig[]
  documents: ReviewDocument[]
  cells: TabularCell[]
  selectedDocIds: string[]
  onSelectionChange: (ids: string[]) => void
  onExpand: (cell: TabularCell) => void
  onUpdateColumn: (col: ColumnConfig) => void
  onDeleteColumn: (columnId: string) => void
  onAddColumn: () => void
  onAddDocuments: () => void
  onPreviewDocument: (doc: ReviewDocument) => void
}

export function ReviewTable({
  loading,
  columns,
  documents,
  cells,
  selectedDocIds,
  onSelectionChange,
  onExpand,
  onUpdateColumn,
  onDeleteColumn,
  onAddColumn,
  onAddDocuments,
  onPreviewDocument,
}: ReviewTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sortedColumns = [...columns].sort((a, b) => a.index - b.index)

  function getCell(docId: string, colIdx: number) {
    return cells.find((c) => c.documentId === docId && c.columnIndex === colIdx)
  }

  const allSelected = documents.length > 0 && documents.every((d) => selectedDocIds.includes(d.id))
  const someSelected = !allSelected && documents.some((d) => selectedDocIds.includes(d.id))

  function toggleAll() {
    onSelectionChange(allSelected ? [] : documents.map((d) => d.id))
  }

  function toggleDoc(id: string) {
    onSelectionChange(
      selectedDocIds.includes(id)
        ? selectedDocIds.filter((x) => x !== id)
        : [...selectedDocIds, id],
    )
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading review table" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ width: '32px', borderRight: '1px solid #E5E7EB', padding: '8px' }} />
          <div
            style={{
              width: '250px',
              borderRight: '1px solid #E5E7EB',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#59616C',
            }}
          >
            Document
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{ width: '200px', borderRight: '1px solid #E5E7EB', padding: '8px' }}
            >
              <div
                style={{
                  height: '16px',
                  width: '112px',
                  borderRadius: '4px',
                  backgroundColor: '#F3F4F6',
                  animation: 'pulse 2s infinite',
                }}
              />
            </div>
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            style={{
              display: 'flex',
              borderBottom: '1px solid #F3F4F6',
              backgroundColor: row % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
            }}
          >
            <div style={{ width: '32px', padding: '8px' }} />
            <div style={{ width: '250px', padding: '8px' }}>
              <div
                style={{
                  height: '16px',
                  width: '128px',
                  borderRadius: '4px',
                  backgroundColor: '#F3F4F6',
                  animation: 'pulse 2s infinite',
                }}
              />
            </div>
            {[1, 2, 3, 4].map((col) => (
              <div key={col} style={{ width: '200px', padding: '8px' }}>
                <div
                  style={{
                    height: '16px',
                    borderRadius: '4px',
                    backgroundColor: '#F3F4F6',
                    animation: 'pulse 2s infinite',
                  }}
                />
              </div>
            ))}
          </div>
        ))}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    )
  }

  if (columns.length === 0 && documents.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ width: '32px', borderRight: '1px solid #E5E7EB' }} />
          <div
            style={{
              width: '250px',
              borderRight: '1px solid #E5E7EB',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#59616C',
            }}
          >
            Document
          </div>
        </div>
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
            <div
              style={{
                backgroundColor: '#EDEDED',
                borderRadius: '66.92px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={uploadBoxIcon} alt="Upload" style={{ width: '39px', height: '39px' }} />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily,
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                  lineHeight: '21px',
                  width: '219px',
                }}
              >
                No documents to compare
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#454545',
                  letterSpacing: '-0.7px',
                  lineHeight: '16px',
                  width: '234px',
                }}
              >
                Add documents to start comparing key clauses and insights
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={onAddDocuments}
                style={{
                  width: '135px',
                  height: '40px',
                  backgroundColor: '#272727',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#FFFFFF',
                    letterSpacing: '-0.7px',
                    lineHeight: '16px',
                  }}
                >
                  Upload
                </span>
              </button>
              <button
                type="button"
                onClick={onAddDocuments}
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
                    fontFamily,
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.7px',
                    lineHeight: '16px',
                  }}
                >
                  Browse Files
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalWidth = 32 + 250 + sortedColumns.length * 250 + 150

  return (
    <div style={{ flex: 1, overflow: 'auto' }} ref={scrollContainerRef}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          backgroundColor: '#F5F5F5',
          minWidth: totalWidth,
        }}
      >
        <div
          style={{
            position: 'sticky',
            left: 0,
            zIndex: 30,
            width: '32px',
            borderBottom: '1px solid #E5E7EB',
            borderRight: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <input
            type="checkbox"
            aria-label="Select all documents"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={toggleAll}
            style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: '#111827' }}
          />
        </div>
        <div
          style={{
            position: 'sticky',
            left: '32px',
            zIndex: 30,
            width: '250px',
            borderBottom: '1px solid #E5E7EB',
            borderRight: '1px solid #E5E7EB',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#59616C',
          }}
        >
          Document
        </div>
        {sortedColumns.map((col) => (
          <div
            key={col.id}
            style={{
              width: '250px',
              flexShrink: 0,
              borderBottom: '1px solid #E5E7EB',
              borderRight: '1px solid #E5E7EB',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#59616C',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col.name}
              </span>
              <ColumnEditMenu
                column={col}
                onSave={onUpdateColumn}
                onDelete={() => onDeleteColumn(col.id)}
              />
            </div>
          </div>
        ))}
        <div
          style={{
            flex: 1,
            minWidth: '150px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '8px 12px',
          }}
        >
          <button
            type="button"
            aria-label="Add column"
            onClick={onAddColumn}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#9CA3AF',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {documents.map((doc, docIdx) => {
        const isSelected = selectedDocIds.includes(doc.id)
        const rowBg = isSelected ? '#F3F4F6' : docIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
        const fileTypeIcon = getFileTypeIcon(doc)
        return (
          <div
            key={doc.id}
            style={{ display: 'flex', minWidth: totalWidth, backgroundColor: rowBg }}
          >
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 10,
                width: '32px',
                borderBottom: '1px solid #E5E7EB',
                borderRight: '1px solid #E5E7EB',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: rowBg,
              }}
            >
              <input
                type="checkbox"
                aria-label={`Select ${doc.name}`}
                checked={isSelected}
                onChange={() => toggleDoc(doc.id)}
                style={{
                  width: '12px',
                  height: '12px',
                  cursor: 'pointer',
                  accentColor: '#111827',
                }}
              />
            </div>
            <div
              style={{
                position: 'sticky',
                left: '32px',
                zIndex: 10,
                width: '250px',
                borderBottom: '1px solid #E5E7EB',
                borderRight: '1px solid #E5E7EB',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: rowBg,
              }}
            >
              {fileTypeIcon && (
                <img
                  src={fileTypeIcon}
                  alt=""
                  style={{ width: '20px', height: '20px', flexShrink: 0, objectFit: 'contain' }}
                />
              )}
              <button
                type="button"
                onClick={() => onPreviewDocument(doc)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  margin: 0,
                  fontFamily,
                  fontSize: '12px',
                  color: '#374151',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                title={doc.name}
              >
                {doc.name}
              </button>
            </div>
            {sortedColumns.map((col) => {
              const cell = getCell(doc.id, col.index)
              return (
                <div
                  key={col.id}
                  style={{
                    width: '250px',
                    flexShrink: 0,
                    borderBottom: '1px solid #E5E7EB',
                    borderRight: '1px solid #E5E7EB',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.2s',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {cell && <ReviewCell cell={cell} column={col} onExpand={() => onExpand(cell)} />}
                </div>
              )
            })}
            <div style={{ flex: 1, minWidth: '150px', borderBottom: '1px solid #E5E7EB' }} />
          </div>
        )
      })}
    </div>
  )
}
