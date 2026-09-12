import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import FilePreviewModal, { type FilePreviewFile } from '../../components/FilePreviewModal'
import {
  useClearTabularCellsMutation,
  useGetTabularReviewQuery,
  useUpdateTabularReviewMutation,
  type TabularGenerateEvent,
} from '../../store/api/tabularReviewApi'
import { AddColumnDialog } from './AddColumnDialog'
import { ProjectDocumentPicker } from './ProjectDocumentPicker'
import { ReviewDetailHeader } from './ReviewDetailHeader'
import { ReviewResultPanel } from './ReviewResults'
import { ReviewTable } from './ReviewTable'
import {
  applyTabularGenerateEvent,
  makePendingCells,
  mapCell,
  mapDocument,
  normalizeCellContent,
  normalizeColumns,
  reviewFontFamily as fontFamily,
  reviewTitle,
  toApiColumns,
  type ColumnConfig,
  type ReviewDocument,
  type TabularCell,
} from './reviewModel'
import { useReviewGeneration } from './useReviewGeneration'

export function ReviewDetailScreen({ reviewId }: { reviewId: string }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useGetTabularReviewQuery(reviewId)

  const [updateReview] = useUpdateTabularReviewMutation()
  const [clearCells] = useClearTabularCellsMutation()
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [documents, setDocuments] = useState<ReviewDocument[]>([])
  const [cells, setCells] = useState<TabularCell[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false)
  const [docPickerOpen, setDocPickerOpen] = useState(false)
  const [expandedCell, setExpandedCell] = useState<TabularCell | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [generationError, setGenerationError] = useState('')
  const [previewFile, setPreviewFile] = useState<FilePreviewFile | null>(null)
  const applyGenerationEvent = useCallback((event: TabularGenerateEvent) => {
    setCells((previous) => applyTabularGenerateEvent(previous, event))
    if (event.type === 'cell_update' && event.status === 'error') {
      setGenerationError(event.content?.reasoning || 'Some cells could not be extracted.')
    }
  }, [])
  const generation = useReviewGeneration({
    reviewId,
    cells: data?.cells,
    onReconnectEvent: applyGenerationEvent,
    onReconnectError: (error) => setGenerationError(error.message),
    refetch,
  })
  const generating = generation.generating

  useEffect(() => {
    if (!data) return
    const nextColumns = normalizeColumns(data.review.columnsConfig)
    const nextDocs = data.documents.map(mapDocument)
    const nextCells =
      data.cells.length > 0
        ? data.cells.map(mapCell)
        : makePendingCells(reviewId, nextDocs, nextColumns)
    setColumns(nextColumns)
    setDocuments(nextDocs)
    setCells(nextCells)
  }, [data, reviewId])

  const filteredDocuments = searchQuery
    ? documents.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents
  const expandedDoc = expandedCell ? documents.find((d) => d.id === expandedCell.documentId) : null
  const expandedCol = expandedCell
    ? columns.find((c) => c.index === expandedCell.columnIndex)
    : null
  const title = reviewTitle(data?.review)

  const saveColumns = async (nextColumns: ColumnConfig[]) => {
    setColumns(nextColumns)
    await updateReview({ reviewId, columns_config: toApiColumns(nextColumns) }).unwrap()
    refetch()
  }

  const handleAddColumns = async (newCols: Omit<ColumnConfig, 'id' | 'width'>[]) => {
    const created = newCols.map((col, index) => ({
      ...col,
      id: `col-${Date.now()}-${index}`,
      index: columns.length + index,
      width: 250,
    }))
    await saveColumns([...columns, ...created])
  }

  const handleUpdateColumn = (column: ColumnConfig) => {
    void saveColumns(columns.map((existing) => (existing.id === column.id ? column : existing)))
  }

  const handleDeleteColumn = (columnId: string) => {
    void saveColumns(
      columns
        .filter((column) => column.id !== columnId)
        .map((column, index) => ({ ...column, index })),
    )
  }

  const handleSaveDocuments = async (documentIds: string[]) => {
    await updateReview({ reviewId, document_ids: documentIds }).unwrap()
    setDocPickerOpen(false)
    setSelectedDocIds([])
    refetch()
  }

  const handleDeleteDocuments = () => {
    void handleSaveDocuments(
      documents.filter((doc) => !selectedDocIds.includes(doc.id)).map((doc) => doc.id),
    )
  }

  const handlePreviewDocument = (doc: ReviewDocument) => {
    setPreviewFile({
      sourceType: 'document',
      id: doc.id,
      filename: doc.name,
      fileType: doc.extension || doc.type,
      extension: doc.extension,
      createdAt: doc.createdAt,
    })
  }

  const handleClearResults = async () => {
    if (selectedDocIds.length === 0) return
    await clearCells({ reviewId, document_ids: selectedDocIds }).unwrap()
    setCells((prev) =>
      prev.map((cell) =>
        selectedDocIds.includes(cell.documentId)
          ? { ...cell, content: null, status: 'pending' }
          : cell,
      ),
    )
    setSelectedDocIds([])
    refetch()
  }

  const handleGenerate = async () => {
    if (generating || columns.length === 0 || documents.length === 0) return
    setGenerationError('')
    setCells((prev) =>
      prev.map((cell) =>
        cell.status === 'done' && cell.content
          ? cell
          : { ...cell, status: 'generating', content: null },
      ),
    )

    await generation.startGeneration({
      onEvent: applyGenerationEvent,
      onComplete: () => void refetch(),
      onError: (error) => {
        setGenerationError(error.message || 'Could not run this review.')
        void refetch()
      },
    })
  }

  const handleCancelGenerate = () => generation.cancel()

  const handleRegenerateExpandedCell = async () => {
    if (!expandedCell) return
    setGenerationError('')
    setCells((prev) =>
      prev.map((cell) =>
        cell.id === expandedCell.id ? { ...cell, status: 'generating', content: null } : cell,
      ),
    )
    await generation.startRegeneration(
      {
        documentId: expandedCell.documentId,
        columnIndex: expandedCell.columnIndex,
      },
      {
        onEvent: (event) => {
          applyGenerationEvent(event)
          if (
            event.type === 'cell_update' &&
            event.document_id === expandedCell.documentId &&
            event.column_index === expandedCell.columnIndex
          ) {
            setExpandedCell((previous) =>
              previous
                ? {
                    ...previous,
                    status: event.status,
                    content: normalizeCellContent(event.content),
                  }
                : previous,
            )
          }
        },
        onComplete: () => void refetch(),
        onError: (error) => {
          const message = error.message || 'Could not regenerate this cell.'
          setGenerationError(message)
          setCells((prev) =>
            prev.map((cell) =>
              cell.id === expandedCell.id
                ? {
                    ...cell,
                    status: 'error',
                    content: { summary: '', flag: 'red', reasoning: message },
                  }
                : cell,
            ),
          )
          setExpandedCell((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'error',
                  content: { summary: '', flag: 'red', reasoning: message },
                }
              : prev,
          )
          void refetch()
        },
      },
    )
  }

  return (
    <Layout activePage="review">
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          fontFamily,
          backgroundColor: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <ReviewDetailHeader
          title={title}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          columnCount={columns.length}
          documentCount={documents.length}
          generating={generating}
          selectedCount={selectedDocIds.length}
          generationError={generationError}
          onBack={() => navigate('/review')}
          onAddColumn={() => setAddColumnModalOpen(true)}
          onManageDocuments={() => setDocPickerOpen(true)}
          onGenerate={handleGenerate}
          onCancel={handleCancelGenerate}
          onClearResults={handleClearResults}
          onRemoveDocuments={handleDeleteDocuments}
        />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {isError ? (
            <div
              role="alert"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C83A2D',
              }}
            >
              Could not load this review.
            </div>
          ) : (
            <ReviewTable
              loading={isLoading}
              columns={columns}
              documents={filteredDocuments}
              cells={cells}
              selectedDocIds={selectedDocIds}
              onSelectionChange={setSelectedDocIds}
              onExpand={setExpandedCell}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              onAddColumn={() => setAddColumnModalOpen(true)}
              onAddDocuments={() => setDocPickerOpen(true)}
              onPreviewDocument={handlePreviewDocument}
            />
          )}
        </div>
      </div>

      {expandedCell && expandedDoc && expandedCol && (
        <ReviewResultPanel
          cell={expandedCell}
          document={expandedDoc}
          column={expandedCol}
          columns={columns}
          onClose={() => setExpandedCell(null)}
          onNavigate={(columnIndex) => {
            const nextCell = cells.find(
              (c) => c.documentId === expandedCell.documentId && c.columnIndex === columnIndex,
            )
            if (nextCell) setExpandedCell(nextCell)
          }}
          onRegenerate={handleRegenerateExpandedCell}
        />
      )}

      <AddColumnDialog
        isOpen={addColumnModalOpen}
        existingCount={columns.length}
        onClose={() => setAddColumnModalOpen(false)}
        onAdd={handleAddColumns}
      />
      <ProjectDocumentPicker
        open={docPickerOpen}
        projectId={data?.review.projectId}
        currentDocIds={documents.map((doc) => doc.id)}
        onClose={() => setDocPickerOpen(false)}
        onSave={handleSaveDocuments}
      />
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onEdit={(file) => navigate(`/documents/${file.id}`)}
      />
    </Layout>
  )
}
