import { useState } from 'react'
import {
  useClearTabularCellsMutation,
  useGetTabularReviewQuery,
  useUpdateTabularReviewMutation,
} from '../../store/api/tabularReviewApi'
import FilePreviewModal, { type FilePreviewFile } from '../../components/FilePreviewModal'
import { AddColumnDialog } from './AddColumnDialog'
import { ProjectDocumentPicker } from './ProjectDocumentPicker'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import { ReviewResultPanel } from './ReviewResults'
import { ReviewTable } from './ReviewTable'
import {
  mapCell,
  mapDocument,
  normalizeColumns,
  toApiColumns,
  type ColumnConfig,
  type ReviewDocument,
  type TabularCell,
} from './reviewModel'
import { useReviewGeneration } from './useReviewGeneration'

export function EmbeddedReviewDetailScreen({ reviewId }: { reviewId: string }) {
  const { data, isLoading, isError, refetch } = useGetTabularReviewQuery(reviewId)
  const [updateReview] = useUpdateTabularReviewMutation()
  const [clearCells] = useClearTabularCellsMutation()

  const review = data?.review
  const columns = normalizeColumns(review?.columnsConfig)
  const documents: ReviewDocument[] = (data?.documents ?? []).map(mapDocument)
  const cells: TabularCell[] = (data?.cells ?? []).map(mapCell)

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [expandedCell, setExpandedCell] = useState<TabularCell | null>(null)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false)
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null)
  const [previewFile, setPreviewFile] = useState<FilePreviewFile | null>(null)
  const [generationError, setGenerationError] = useState('')
  const generation = useReviewGeneration({
    reviewId,
    cells: data?.cells,
    onReconnectEvent: () => void refetch(),
    onReconnectError: (error) => setGenerationError(error.message),
    refetch,
  })
  const generating = generation.generating
  const expandedDocument = documents.find((document) => document.id === expandedCell?.documentId)
  const expandedColumn = columns.find((column) => column.index === expandedCell?.columnIndex)

  const handleAddColumn = async (newCols: Omit<ColumnConfig, 'id' | 'width'>[]) => {
    const updated = [
      ...columns,
      ...newCols.map((col, i) => ({ ...col, id: `col-${columns.length + i}`, width: 250 })),
    ]
    await updateReview({ reviewId, columns_config: toApiColumns(updated) }).unwrap()
    refetch()
  }

  const handleUpdateColumn = async (col: ColumnConfig) => {
    const updated = columns.map((c) => (c.id === col.id ? col : c))
    await updateReview({ reviewId, columns_config: toApiColumns(updated) }).unwrap()
    setEditingColumn(null)
    refetch()
  }

  const handleDeleteColumn = async (columnId: string) => {
    const updated = columns.filter((c) => c.id !== columnId).map((c, i) => ({ ...c, index: i }))
    await updateReview({ reviewId, columns_config: toApiColumns(updated) }).unwrap()
    refetch()
  }

  const handleSaveDocuments = async (documentIds: string[]) => {
    await updateReview({ reviewId, document_ids: documentIds }).unwrap()
    setDocumentPickerOpen(false)
    setSelectedDocIds([])
    refetch()
  }

  const handlePreviewDocument = (document: ReviewDocument) => {
    setPreviewFile({
      sourceType: 'document',
      id: document.id,
      filename: document.name,
      fileType: document.extension || document.type,
      extension: document.extension,
      createdAt: document.createdAt,
    })
  }

  const handleGenerate = async () => {
    if (generating || documents.length === 0 || columns.length === 0) return
    setGenerationError('')
    try {
      await generation.startGeneration({
        beforeStream: async () => {
          await clearCells({ reviewId }).unwrap()
          refetch()
        },
        onEvent: () => refetch(),
        onComplete: () => void refetch(),
        onError: (error) => {
          setGenerationError(error.message || 'Could not run this review.')
        },
      })
      refetch()
    } catch (error) {
      setGenerationError(getRequestErrorMessage(error, 'Could not run this review.'))
    }
  }

  const handleCancelGenerate = () => generation.cancel()

  const handleRegenerate = async () => {
    if (!expandedCell || generating) return
    setGenerationError('')
    await generation.startRegeneration(
      {
        documentId: expandedCell.documentId,
        columnIndex: expandedCell.columnIndex,
      },
      {
        onEvent: () => void refetch(),
        onComplete: () => void refetch(),
        onError: (error) => {
          setGenerationError(error.message || 'Could not regenerate this cell.')
          void refetch()
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ padding: '40px', textAlign: 'center', color: '#797979' }}
      >
        Loading...
      </div>
    )
  }

  if (isError || !review) {
    return (
      <div role="alert" style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
        Error loading review
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #EDEDED',
        }}
      >
        <span style={{ fontSize: '14px', color: '#797979' }}>
          {documents.length} document{documents.length !== 1 ? 's' : ''} · {columns.length} column
          {columns.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setAddColumnOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#F7F7F7',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 510,
              color: '#454545',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Column
          </button>
          <button
            type="button"
            aria-live="polite"
            aria-busy={generating}
            onClick={generating ? handleCancelGenerate : handleGenerate}
            disabled={!generating && (documents.length === 0 || columns.length === 0)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: generating ? '#454545' : '#272727',
              border: 'none',
              borderRadius: '8px',
              cursor:
                !generating && (documents.length === 0 || columns.length === 0)
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '13px',
              fontWeight: 510,
              color: '#FFFFFF',
            }}
          >
            {generating ? 'Cancel' : 'Generate'}
          </button>
        </div>
      </div>
      {generationError && (
        <div
          role="alert"
          style={{
            padding: '8px 18px',
            borderBottom: '1px solid #F4D7D7',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            fontSize: '13px',
          }}
        >
          {generationError}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ReviewTable
          loading={false}
          columns={columns}
          documents={documents}
          cells={cells}
          selectedDocIds={selectedDocIds}
          onSelectionChange={setSelectedDocIds}
          onExpand={setExpandedCell}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
          onAddColumn={() => setAddColumnOpen(true)}
          onAddDocuments={() => setDocumentPickerOpen(true)}
          onPreviewDocument={handlePreviewDocument}
        />
      </div>
      <AddColumnDialog
        isOpen={addColumnOpen || !!editingColumn}
        existingCount={columns.length}
        onClose={() => {
          setAddColumnOpen(false)
          setEditingColumn(null)
        }}
        onAdd={handleAddColumn}
        editingColumn={editingColumn}
        onSave={handleUpdateColumn}
        onDelete={() => editingColumn && handleDeleteColumn(editingColumn.id)}
      />
      {expandedCell && expandedDocument && expandedColumn && (
        <ReviewResultPanel
          cell={expandedCell}
          document={expandedDocument}
          column={expandedColumn}
          columns={columns}
          onClose={() => setExpandedCell(null)}
          onNavigate={(colIdx) => {
            const cell = cells.find(
              (candidate) =>
                candidate.documentId === expandedDocument.id && candidate.columnIndex === colIdx,
            )
            if (cell) setExpandedCell(cell)
          }}
          onRegenerate={() => void handleRegenerate()}
        />
      )}
      <ProjectDocumentPicker
        open={documentPickerOpen}
        projectId={review.projectId}
        currentDocIds={documents.map((document) => document.id)}
        onClose={() => setDocumentPickerOpen(false)}
        onSave={handleSaveDocuments}
      />
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  )
}
