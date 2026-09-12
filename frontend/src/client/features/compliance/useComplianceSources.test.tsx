import { act, renderHook, waitFor } from '@testing-library/react'
import type { ChangeEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComplianceReviewResponse } from '../../store/api/complianceApi'
import { useComplianceSources } from './useComplianceSources'

const mocks = vi.hoisted(() => ({
  addSupportingDocument: vi.fn(),
  deleteDocument: vi.fn(),
  documents: [
    {
      id: 'document-existing',
      filename: 'Existing.pdf',
      file_type: 'pdf',
      created_at: '2026-09-01T12:00:00.000Z',
    },
  ],
  removeSupportingDocument: vi.fn(),
  updateDocument: vi.fn(),
  uploadDocument: vi.fn(),
}))

vi.mock('../documents/api/documentCoreApi', () => ({
  useDeleteDocumentMutation: () => [mocks.deleteDocument],
  useGetDocumentsQuery: () => ({ data: mocks.documents }),
  useUpdateDocumentMutation: () => [mocks.updateDocument],
  useUploadDocumentMutation: () => [mocks.uploadDocument],
}))

vi.mock('../../store/api/complianceApi', () => ({
  useAddComplianceSupportingDocMutation: () => [mocks.addSupportingDocument],
  useRemoveComplianceSupportingDocMutation: () => [mocks.removeSupportingDocument],
}))

function mutation<T>(result: T) {
  return { unwrap: vi.fn().mockResolvedValue(result) }
}

function reviewData(
  id: string,
  supportingDocs: ComplianceReviewResponse['supportingDocs'] = [],
  status: ComplianceReviewResponse['review']['status'] = 'pending',
): ComplianceReviewResponse {
  return {
    review: {
      id,
      userId: 'user-1',
      projectId: null,
      workspaceId: null,
      primaryDocumentId: 'document-primary',
      title: 'Review',
      status,
      complianceScore: null,
      results: null,
      aiInsights: null,
      ragCollectionName: null,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    },
    supportingDocs,
    rules: [],
    questions: [],
  }
}

function fileEvent(files: File[]): ChangeEvent<HTMLInputElement> {
  const fileList = Object.assign(files, {
    item: (index: number) => files[index] ?? null,
  })
  return {
    target: { files: fileList, value: 'selected' },
  } as unknown as ChangeEvent<HTMLInputElement>
}

describe('useComplianceSources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.addSupportingDocument.mockReturnValue(mutation({ id: 'attachment-1' }))
    mocks.deleteDocument.mockReturnValue(mutation(undefined))
    mocks.removeSupportingDocument.mockReturnValue(mutation(undefined))
    mocks.updateDocument.mockReturnValue(mutation(undefined))
    mocks.uploadDocument.mockImplementation((formData: FormData) => {
      const file = formData.get('file') as File
      return mutation({
        id: `uploaded-${file.name}`,
        filename: file.name,
        created_at: '2026-09-01T12:00:00.000Z',
      })
    })
  })

  it('clears supporting documents when the active review changes to an empty review', async () => {
    const first = reviewData('review-1', [
      {
        id: 'attachment-1',
        reviewId: 'review-1',
        documentId: 'document-old',
        filename: 'Old.pdf',
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    ])
    const second = reviewData('review-2')
    const { result, rerender } = renderHook(
      ({ reviewId, data }) =>
        useComplianceSources({ kind: 'document', documentId: 'document-primary' }, reviewId, data),
      { initialProps: { reviewId: 'review-1', data: first } },
    )
    await waitFor(() => expect(result.current.supportingDocuments).toHaveLength(1))

    rerender({ reviewId: 'review-2', data: second })

    await waitFor(() => expect(result.current.supportingDocuments).toEqual([]))
  })

  it('clears supporting documents when the same review changes status', async () => {
    const first = reviewData('review-1', [
      {
        id: 'attachment-1',
        reviewId: 'review-1',
        documentId: 'document-old',
        filename: 'Old.pdf',
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    ])
    const { result, rerender } = renderHook(
      ({ data }) =>
        useComplianceSources(
          { kind: 'document', documentId: 'document-primary' },
          'review-1',
          data,
        ),
      { initialProps: { data: first } },
    )
    await waitFor(() => expect(result.current.supportingDocuments).toHaveLength(1))

    rerender({ data: reviewData('review-1', [], 'running') })

    await waitFor(() => expect(result.current.supportingDocuments).toEqual([]))
  })

  it('uploads and attaches every selected file before displaying it', async () => {
    const data = reviewData('review-1')
    const { result } = renderHook(() =>
      useComplianceSources({ kind: 'document', documentId: 'document-primary' }, 'review-1', data),
    )
    const files = [new File(['a'], 'A.pdf'), new File(['b'], 'B.docx')]

    await act(async () => result.current.dialogs.upload(fileEvent(files)))

    expect(mocks.uploadDocument).toHaveBeenCalledTimes(2)
    expect(mocks.addSupportingDocument.mock.calls).toEqual([
      [{ reviewId: 'review-1', document_id: 'uploaded-A.pdf' }],
      [{ reviewId: 'review-1', document_id: 'uploaded-B.docx' }],
    ])
    expect(result.current.supportingDocuments.map(({ filename }) => filename)).toEqual([
      'A.pdf',
      'B.docx',
    ])
  })

  it('does not display a selected source when persistence fails', async () => {
    mocks.addSupportingDocument.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ data: { detail: 'Attachment rejected' } }),
    })
    const data = reviewData('review-1')
    const { result } = renderHook(() =>
      useComplianceSources({ kind: 'document', documentId: 'document-primary' }, 'review-1', data),
    )

    await act(async () => {
      await expect(
        result.current.dialogs.select({
          id: 'document-existing',
          name: 'Existing.pdf',
          type: 'pdf',
          date: '1 Sep 2026',
        }),
      ).rejects.toEqual({ data: { detail: 'Attachment rejected' } })
    })

    expect(result.current.supportingDocuments).toEqual([])
  })

  it('ignores an upload completion from a review that is no longer active', async () => {
    let resolveUpload!: (value: { id: string; filename: string; created_at: string }) => void
    const uploadResult = new Promise<{
      id: string
      filename: string
      created_at: string
    }>((resolve) => {
      resolveUpload = resolve
    })
    mocks.uploadDocument.mockReturnValue({ unwrap: () => uploadResult })
    const first = reviewData('review-1')
    const second = reviewData('review-2')
    const { result, rerender } = renderHook(
      ({ reviewId, data }) =>
        useComplianceSources({ kind: 'document', documentId: 'document-primary' }, reviewId, data),
      { initialProps: { reviewId: 'review-1', data: first } },
    )
    let pending!: Promise<void>

    act(() => {
      pending = result.current.dialogs.upload(fileEvent([new File(['old'], 'Old.pdf')]))
    })
    rerender({ reviewId: 'review-2', data: second })
    resolveUpload({
      id: 'document-old',
      filename: 'Old.pdf',
      created_at: '2026-09-01T12:00:00.000Z',
    })
    await act(async () => pending)

    expect(mocks.addSupportingDocument).toHaveBeenCalledWith({
      reviewId: 'review-1',
      document_id: 'document-old',
    })
    expect(result.current.supportingDocuments).toEqual([])
  })
})
