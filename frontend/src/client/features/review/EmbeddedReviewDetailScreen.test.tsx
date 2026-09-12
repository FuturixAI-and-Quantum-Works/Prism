import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmbeddedReviewDetailScreen } from './EmbeddedReviewDetailScreen'
import type { ReviewDocument } from './reviewModel'

const mocks = vi.hoisted(() => {
  const mutationResult = () => ({ unwrap: () => Promise.resolve() })
  return {
    updateReview: vi.fn(mutationResult),
    reviewGenerationOptions: null as {
      onReconnectError?: (error: Error) => void
    } | null,
  }
})

vi.mock('../../store/api/tabularReviewApi', () => ({
  useClearTabularCellsMutation: () => [vi.fn()],
  useGetTabularReviewQuery: () => ({
    data: {
      review: {
        id: 'review-1',
        projectId: 'project-1',
        columnsConfig: [],
      },
      documents: [
        {
          id: 'document-1',
          filename: 'contract.pdf',
          file_type: 'pdf',
          created_at: '2026-09-01T12:00:00.000Z',
        },
      ],
      cells: [],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateTabularReviewMutation: () => [mocks.updateReview],
}))

vi.mock('./useReviewGeneration', () => ({
  useReviewGeneration: (options: { onReconnectError?: (error: Error) => void }) => {
    mocks.reviewGenerationOptions = options
    return {
      cancel: vi.fn(),
      generating: false,
      startGeneration: vi.fn(),
      startRegeneration: vi.fn(),
    }
  },
}))

vi.mock('./ReviewTable', () => ({
  ReviewTable: ({
    documents,
    onAddDocuments,
    onPreviewDocument,
  }: {
    documents: ReviewDocument[]
    onAddDocuments: () => void
    onPreviewDocument: (document: ReviewDocument) => void
  }) => (
    <>
      <button type="button" onClick={onAddDocuments}>
        Add review documents
      </button>
      <button type="button" onClick={() => onPreviewDocument(documents[0])}>
        Preview review document
      </button>
    </>
  ),
}))

vi.mock('./AddColumnDialog', () => ({ AddColumnDialog: () => null }))
vi.mock('./ReviewResults', () => ({ ReviewResultPanel: () => null }))
vi.mock('./ProjectDocumentPicker', () => ({
  ProjectDocumentPicker: ({
    open,
    onSave,
  }: {
    open: boolean
    onSave: (documentIds: string[]) => void
  }) =>
    open ? (
      <div role="dialog" aria-label="Review documents">
        <button type="button" onClick={() => onSave(['document-1', 'document-2'])}>
          Save review documents
        </button>
      </div>
    ) : null,
}))
vi.mock('../../components/FilePreviewModal', () => ({
  default: ({ file }: { file: { filename: string } | null }) =>
    file ? (
      <div role="dialog" aria-label={`Previewing ${file.filename}`}>
        Previewing {file.filename}
      </div>
    ) : null,
}))

describe('EmbeddedReviewDetailScreen', () => {
  it('wires document management and preview controls to real behavior', async () => {
    const user = userEvent.setup()
    render(<EmbeddedReviewDetailScreen reviewId="review-1" />)

    await user.click(screen.getByRole('button', { name: 'Preview review document' }))
    expect(screen.getByRole('dialog', { name: 'Previewing contract.pdf' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add review documents' }))
    await user.click(screen.getByRole('button', { name: 'Save review documents' }))

    expect(mocks.updateReview).toHaveBeenCalledWith({
      reviewId: 'review-1',
      document_ids: ['document-1', 'document-2'],
    })
  })

  it('shows generation reconnect failures', () => {
    render(<EmbeddedReviewDetailScreen reviewId="review-1" />)

    act(() => mocks.reviewGenerationOptions?.onReconnectError?.(new Error('Review disconnected.')))

    expect(screen.getByRole('alert')).toHaveTextContent('Review disconnected.')
  })
})
