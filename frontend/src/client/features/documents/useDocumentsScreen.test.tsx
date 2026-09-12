import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDocumentsScreen } from './useDocumentsScreen'

const mocks = vi.hoisted(() => ({
  createInvitation: vi.fn(() => ({
    unwrap: () =>
      Promise.resolve({
        delivery: { email: 'reviewer@example.com', status: 'sent' },
      }),
  })),
  createDocument: vi.fn((_input: Record<string, unknown>) => ({
    unwrap: () => Promise.resolve({ id: 'document-copy' }),
  })),
  getDocumentHtml: vi.fn((_input: Record<string, unknown>) => ({
    unwrap: () => Promise.resolve({ html: '<p>Agreement terms</p>', messages: [] }),
  })),
  uploadDocument: vi.fn((_data: FormData) => ({
    unwrap: () => Promise.resolve({ id: 'document-upload' }),
  })),
  deleteDocument: vi.fn(() => ({ unwrap: () => Promise.resolve({ ok: true }) })),
  updateDocument: vi.fn(() => ({ unwrap: () => Promise.resolve({ ok: true }) })),
  sourceDocument: {
    id: 'document-1',
    project_id: 'project-1',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    folder_id: null,
    filename: 'Agreement.pdf',
    file_type: 'pdf',
    size_bytes: 9,
    page_count: 1,
    status: 'ready',
    lifecycle_status: 'DRAFT',
    current_version_id: 'version-1',
    is_primary: true,
    created_at: '2026-09-01T12:00:00.000Z',
    updated_at: '2026-09-01T12:00:00.000Z',
  },
}))

vi.mock('../../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('./api/documentCoreApi', () => ({
  useCreateDocumentMutation: () => [mocks.createDocument],
  useDeleteDocumentMutation: () => [mocks.deleteDocument],
  useGetDocumentsQuery: () => ({
    data: [mocks.sourceDocument],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useUpdateDocumentMutation: () => [mocks.updateDocument],
  useUploadDocumentMutation: () => [mocks.uploadDocument],
}))
vi.mock('./api/documentContentApi', () => ({
  useLazyGetDocumentHtmlQuery: () => [mocks.getDocumentHtml],
  useLazyGetDocumentUrlQuery: () => [vi.fn()],
}))
vi.mock('./api/documentSharingApi', () => ({
  useCreateDocumentInvitationMutation: () => [mocks.createInvitation, { isLoading: false }],
  useGetDocumentSharesQuery: () => ({
    data: { shares: [], pending_invitations: [] },
    isFetching: false,
  }),
  useRemoveDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
}))

let currentLocation: ReturnType<typeof useLocation> | undefined

function LocationCapture() {
  currentLocation = useLocation()
  return null
}

function Router({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <LocationCapture />
      {children}
    </MemoryRouter>
  )
}

afterEach(() => {
  currentLocation = undefined
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('useDocumentsScreen actions', () => {
  it('duplicates a document through the existing read and create services', async () => {
    const { result } = renderHook(() => useDocumentsScreen(false), { wrapper: Router })

    act(() => result.current.actions.runDocumentAction('duplicate', result.current.documents[0]))

    await waitFor(() =>
      expect(mocks.createDocument).toHaveBeenCalledWith({
        filename: 'Agreement copy.docx',
        content_html: '<p>Agreement terms</p>',
        project_id: 'project-1',
        workspace_id: 'workspace-1',
        folder_id: null,
        is_primary: true,
      }),
    )
  })

  it('uploads the file selected from the empty-state control', async () => {
    const file = new File(['terms'], 'terms.txt', { type: 'text/plain' })
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      Object.defineProperty(this, 'files', { configurable: true, value: [file] })
      this.dispatchEvent(new Event('change'))
    })
    const { result } = renderHook(() => useDocumentsScreen(false), { wrapper: Router })

    act(() => result.current.actions.uploadFromEmptyState())

    await waitFor(() => expect(mocks.uploadDocument).toHaveBeenCalledOnce())
    expect(mocks.uploadDocument.mock.calls[0]?.[0].get('file')).toBe(file)
  })

  it('opens Ask Prism with the selected document attached', () => {
    const { result } = renderHook(() => useDocumentsScreen(false), { wrapper: Router })

    act(() => result.current.actions.runDocumentAction('ask', result.current.documents[0]))

    expect(currentLocation?.pathname).toBe('/assistant')
    expect(currentLocation?.state).toEqual({
      initialMessage: 'Review "Agreement.pdf".',
      initialFile: {
        id: 'document-1',
        name: 'Agreement.pdf',
        size: 9,
        type: 'pdf',
        source: { kind: 'stored-document', documentId: 'document-1' },
      },
    })
  })

  it('keeps rename and delete dialogs populated when mutations reject', async () => {
    mocks.updateDocument.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { detail: 'Rename was rejected.' } }),
    })
    mocks.deleteDocument.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { detail: 'Delete was rejected.' } }),
    })
    const { result } = renderHook(() => useDocumentsScreen(false), { wrapper: Router })
    const document = result.current.documents[0]

    act(() => result.current.actions.runDocumentAction('rename', document))
    await act(async () => result.current.actions.submitRename())
    expect(result.current.renameModalOpen).toBe(true)
    expect(result.current.renameValue).toBe('Agreement.pdf')
    expect(result.current.selectedDocument?.id).toBe('document-1')
    expect(result.current.renameError).toBe('Rename was rejected.')

    act(() => result.current.actions.runDocumentAction('delete', document))
    await act(async () => result.current.actions.confirmDelete())
    expect(result.current.deleteModalOpen).toBe(true)
    expect(result.current.selectedDocument?.id).toBe('document-1')
    expect(result.current.deleteError).toBe('Delete was rejected.')
  })

  it('prevents duplicate rename submissions while the first request is pending', async () => {
    let resolveRename!: (value: { ok: boolean }) => void
    mocks.updateDocument.mockReturnValue({
      unwrap: () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveRename = resolve
        }),
    })
    const { result } = renderHook(() => useDocumentsScreen(false), { wrapper: Router })
    act(() => result.current.actions.runDocumentAction('rename', result.current.documents[0]))

    let firstRequest!: Promise<void>
    act(() => {
      firstRequest = result.current.actions.submitRename()
      void result.current.actions.submitRename()
    })

    expect(mocks.updateDocument).toHaveBeenCalledOnce()
    expect(result.current.isRenaming).toBe(true)
    resolveRename({ ok: true })
    await act(async () => firstRequest)
    expect(result.current.renameModalOpen).toBe(false)
  })

  it('does not close a new rename dialog when an earlier rename completes', async () => {
    let resolveRename!: (value: { ok: boolean }) => void
    mocks.updateDocument.mockReturnValue({
      unwrap: () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveRename = resolve
        }),
    })
    const { result } = renderHook(() => useDocumentsScreen(false), { wrapper: Router })
    act(() => result.current.actions.runDocumentAction('rename', result.current.documents[0]))

    let firstRequest!: Promise<void>
    act(() => {
      firstRequest = result.current.actions.submitRename()
    })
    act(() =>
      result.current.actions.runDocumentAction('rename', {
        ...result.current.documents[0],
        id: 'document-2',
        title: 'Second agreement.docx',
      }),
    )
    resolveRename({ ok: true })
    await act(async () => firstRequest)

    expect(result.current.renameModalOpen).toBe(true)
    expect(result.current.selectedDocument?.id).toBe('document-2')
    expect(result.current.renameValue).toBe('Second agreement.docx')
  })

  it('keeps the invitation email and reports unsuccessful delivery', async () => {
    mocks.createInvitation.mockReturnValueOnce({
      unwrap: () =>
        Promise.resolve({
          delivery: {
            email: 'reviewer@example.com',
            status: 'failed',
            error: 'Email delivery was rejected.',
          },
        }),
    })
    const { result } = renderHook(() => useDocumentsScreen(false), { wrapper: Router })

    act(() => {
      result.current.actions.runDocumentAction('share', result.current.documents[0])
      result.current.actions.setShareEmail('reviewer@example.com')
    })
    await act(async () => result.current.actions.submitShare())

    expect(result.current.shareModalOpen).toBe(true)
    expect(result.current.shareEmail).toBe('reviewer@example.com')
    expect(result.current.shareError).toBe('Email delivery was rejected.')
    expect(result.current.shareNotice).toBeNull()
  })
})
