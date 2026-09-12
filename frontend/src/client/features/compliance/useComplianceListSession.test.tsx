import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useComplianceListSession } from './useComplianceListSession'

const mocks = vi.hoisted(() => ({
  deleteDocument: vi.fn(),
  deleteReview: vi.fn(),
  navigate: vi.fn(),
  updateDocument: vi.fn(),
  uploadDocument: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../documents/api/documentCoreApi', () => ({
  useDeleteDocumentMutation: () => [mocks.deleteDocument],
  useGetDocumentsQuery: () => ({ data: [] }),
  useUpdateDocumentMutation: () => [mocks.updateDocument],
  useUploadDocumentMutation: () => [mocks.uploadDocument],
}))

vi.mock('../../store/api/complianceApi', () => ({
  useDeleteComplianceReviewMutation: () => [mocks.deleteReview],
  useGetComplianceReviewsQuery: () => ({ data: [] }),
}))

vi.mock('../../store/api/drive/driveWorkspaceApi', () => ({
  useGetDriveWorkspacesQuery: () => ({ data: [] }),
}))

function fileEvent(files: File[]): ChangeEvent<HTMLInputElement> {
  const fileList = Object.assign(files, {
    item: (index: number) => files[index] ?? null,
  })
  return {
    target: { files: fileList, value: 'selected' },
  } as unknown as ChangeEvent<HTMLInputElement>
}

describe('useComplianceListSession uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.uploadDocument.mockImplementation((formData: FormData) => {
      const file = formData.get('file') as File
      return {
        unwrap: vi.fn().mockResolvedValue({ id: `document-${file.name}` }),
      }
    })
  })

  it('uploads every selected file and navigates once after the batch', async () => {
    const { result } = renderHook(() => useComplianceListSession())

    await act(async () =>
      result.current.upload.handleFileUpload(
        fileEvent([new File(['a'], 'A.pdf'), new File(['b'], 'B.pdf')]),
      ),
    )

    expect(mocks.uploadDocument).toHaveBeenCalledTimes(2)
    expect(mocks.navigate).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith('/compliance/documents/document-A.pdf')
  })

  it('stops the batch and exposes the rejected upload', async () => {
    mocks.uploadDocument
      .mockReturnValueOnce({
        unwrap: vi.fn().mockResolvedValue({ id: 'document-A.pdf' }),
      })
      .mockReturnValueOnce({
        unwrap: vi.fn().mockRejectedValue({ data: { detail: 'B failed' } }),
      })
    const { result } = renderHook(() => useComplianceListSession())

    await act(async () =>
      result.current.upload.handleFileUpload(
        fileEvent([new File(['a'], 'A.pdf'), new File(['b'], 'B.pdf'), new File(['c'], 'C.pdf')]),
      ),
    )

    expect(mocks.uploadDocument).toHaveBeenCalledTimes(2)
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(result.current.upload.error).toBe('B failed')
  })
})
