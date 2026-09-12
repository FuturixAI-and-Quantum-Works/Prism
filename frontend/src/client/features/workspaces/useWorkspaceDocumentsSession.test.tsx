import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceDocumentsSession } from './useWorkspaceDocumentsSession'

const api = vi.hoisted(() => ({
  createDocument: vi.fn(),
  deleteDriveFile: vi.fn(),
  getDocumentDisplay: vi.fn(),
  uploadDriveFile: vi.fn(),
  refetchFiles: vi.fn(),
  refetchDocuments: vi.fn(),
}))

const driveFiles = [
  {
    id: 'file-1',
    name: 'First.pdf',
    extension: 'pdf',
    mime_type: 'application/pdf',
    size_bytes: 10,
    created_at: '2026-09-01T12:00:00.000Z',
    updated_at: '2026-09-01T12:00:00.000Z',
    is_primary: true,
  },
  {
    id: 'file-2',
    name: 'Second.pdf',
    extension: 'pdf',
    mime_type: 'application/pdf',
    size_bytes: 20,
    created_at: '2026-09-02T12:00:00.000Z',
    updated_at: '2026-09-02T12:00:00.000Z',
    is_primary: true,
  },
]

vi.mock('../../store/api/drive/driveFileApi', () => ({
  useDeleteDriveFileMutation: () => [api.deleteDriveFile],
  useGetDriveFilesQuery: () => ({
    data: { files: driveFiles },
    isLoading: false,
    refetch: api.refetchFiles,
  }),
  useUploadDriveFileMutation: () => [api.uploadDriveFile, { isLoading: false }],
}))

vi.mock('../documents/api/documentContentApi', () => ({
  useLazyGetDocumentDisplayQuery: () => [api.getDocumentDisplay],
}))

vi.mock('../documents/api/documentCoreApi', () => ({
  useCreateDocumentMutation: () => [api.createDocument, { isLoading: false }],
  useDeleteDocumentMutation: () => [vi.fn()],
  useGetDocumentsQuery: () => ({
    data: [],
    isLoading: false,
    refetch: api.refetchDocuments,
  }),
}))

function Router({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('useWorkspaceDocumentsSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.deleteDriveFile.mockImplementation((id: string) => ({
      unwrap: () =>
        id === 'file-2'
          ? Promise.reject({ data: { detail: 'Second file could not be removed.' } })
          : Promise.resolve({ ok: true }),
    }))
    api.uploadDriveFile.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'uploaded-1' }),
    })
    api.createDocument.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'document-1' }),
    })
    api.getDocumentDisplay.mockReturnValue({
      unwrap: () => Promise.resolve(new Blob(['document'])),
    })
  })

  it('keeps failed batch deletions selected and the dialog open', async () => {
    const { result } = renderHook(
      () => useWorkspaceDocumentsSession({ workspaceId: 'workspace-1' }),
      { wrapper: Router },
    )

    act(() => {
      result.current.actions.toggleItem(result.current.items[0])
      result.current.actions.toggleItem(result.current.items[1])
    })
    act(() => result.current.actions.requestDelete())
    await act(async () => result.current.actions.confirmDelete())

    expect(result.current.deleteOpen).toBe(true)
    expect(Array.from(result.current.selectedIds)).toEqual(['file-2'])
    expect(result.current.deleteError).toBe('Second file could not be removed.')
    expect(api.refetchFiles).toHaveBeenCalledOnce()
  })

  it('preserves the upload candidate when upload rejects', async () => {
    api.uploadDriveFile.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Storage is unavailable.' } }),
    })
    const { result } = renderHook(
      () => useWorkspaceDocumentsSession({ workspaceId: 'workspace-1' }),
      { wrapper: Router },
    )
    const file = new File(['terms'], 'Terms.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.actions.selectUpload({
        target: { files: [file], value: '/fake/Terms.pdf' },
      } as never)
    })
    await act(async () => result.current.actions.confirmUpload())

    expect(result.current.uploadCandidate).toBe(file)
    expect(result.current.uploadError).toBe('Storage is unavailable.')
  })

  it('keeps the add-files dialog open when blank creation rejects', async () => {
    api.createDocument.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Document creation was rejected.' } }),
    })
    const { result } = renderHook(
      () => useWorkspaceDocumentsSession({ workspaceId: 'workspace-1' }),
      { wrapper: Router },
    )

    act(() => result.current.actions.openAddFiles())
    await act(async () => result.current.actions.createBlank())

    expect(result.current.addFilesOpen).toBe(true)
    expect(result.current.addFilesError).toBe('Document creation was rejected.')
  })

  it('rejects failed imports so the file browser can remain open', async () => {
    api.getDocumentDisplay.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Source download failed.' } }),
    })
    const { result } = renderHook(
      () => useWorkspaceDocumentsSession({ workspaceId: 'workspace-1' }),
      { wrapper: Router },
    )
    act(() => result.current.actions.openBrowseFiles())

    let importError: unknown
    await act(async () => {
      try {
        await result.current.actions.importFile({
          id: 'document-1',
          name: 'Agreement.pdf',
          type: 'pdf',
          date: 'Today',
          extension: 'pdf',
        })
      } catch (error) {
        importError = error
      }
    })

    expect(importError).toEqual(new Error('Source download failed.'))
    expect(result.current.browseFilesOpen).toBe(true)
  })
})
