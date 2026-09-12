import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DocumentsScreen from './DocumentsFeature'

const mocks = vi.hoisted(() => ({
  createInvitation: vi.fn(() => ({
    unwrap: () =>
      Promise.resolve({
        delivery: { status: 'sent' },
        invitation: { id: 'invitation-2' },
      }),
  })),
  removeShare: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  updateShare: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
}))

vi.mock('../../components/FilePreviewModal', () => ({ default: () => null }))
vi.mock('../../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('./documentsApi', () => ({
  useGetDocumentsQuery: () => ({
    data: [
      {
        id: 'document-1',
        user_id: 'user-1',
        filename: 'contract.pdf',
        file_type: 'pdf',
        size_bytes: 2048,
        lifecycle_status: 'DRAFT',
        status: 'ready',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useDeleteDocumentMutation: () => [vi.fn()],
  useUpdateDocumentMutation: () => [vi.fn()],
  useLazyGetDocumentUrlQuery: () => [vi.fn()],
  useCreateDocumentInvitationMutation: () => [mocks.createInvitation, { isLoading: false }],
  useUpdateDocumentShareMutation: () => [mocks.updateShare, { isLoading: false }],
  useRemoveDocumentShareMutation: () => [mocks.removeShare, { isLoading: false }],
  useGetDocumentSharesQuery: () => ({
    data: {
      shares: [
        {
          id: 'share-1',
          document_id: 'document-1',
          user_id: 'user-2',
          email: 'collaborator@example.com',
          role: 'viewer',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      pending_invitations: [
        {
          id: 'invitation-1',
          email: 'pending@example.com',
          role: 'editor',
          status: 'pending',
          expires_at: '2026-12-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    isFetching: false,
  }),
}))
vi.mock('./api/documentCoreApi', () => ({
  useCreateDocumentMutation: () => [vi.fn()],
  useGetDocumentsQuery: () => ({
    data: [
      {
        id: 'document-1',
        user_id: 'user-1',
        filename: 'contract.pdf',
        file_type: 'pdf',
        size_bytes: 2048,
        lifecycle_status: 'DRAFT',
        status: 'ready',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useDeleteDocumentMutation: () => [vi.fn()],
  useUpdateDocumentMutation: () => [vi.fn()],
  useUploadDocumentMutation: () => [vi.fn()],
}))
vi.mock('./api/documentContentApi', () => ({
  useLazyGetDocumentHtmlQuery: () => [vi.fn()],
  useLazyGetDocumentUrlQuery: () => [vi.fn()],
}))
vi.mock('./api/documentSharingApi', () => ({
  useCreateDocumentInvitationMutation: () => [mocks.createInvitation, { isLoading: false }],
  useUpdateDocumentShareMutation: () => [mocks.updateShare, { isLoading: false }],
  useRemoveDocumentShareMutation: () => [mocks.removeShare, { isLoading: false }],
  useGetDocumentSharesQuery: () => ({
    data: {
      shares: [
        {
          id: 'share-1',
          document_id: 'document-1',
          user_id: 'user-2',
          email: 'collaborator@example.com',
          role: 'viewer',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      pending_invitations: [
        {
          id: 'invitation-1',
          email: 'pending@example.com',
          role: 'editor',
          status: 'pending',
          expires_at: '2026-12-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    isFetching: false,
  }),
}))

describe('document sharing', () => {
  it('keeps collaborator roles, removals, and invitations wired to the document', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DocumentsScreen />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'More actions for contract.pdf' }))
    await user.click(screen.getByRole('menuitem', { name: 'Share' }))

    expect(screen.getByRole('dialog', { name: 'Share "contract.pdf"' })).toBeInTheDocument()
    expect(screen.getByText('pending@example.com')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Role for collaborator@example.com' }),
      'editor',
    )
    await waitFor(() =>
      expect(mocks.updateShare).toHaveBeenCalledWith({
        documentId: 'document-1',
        shareId: 'share-1',
        role: 'editor',
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() =>
      expect(mocks.removeShare).toHaveBeenCalledWith({
        documentId: 'document-1',
        shareId: 'share-1',
      }),
    )

    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))
    await waitFor(() =>
      expect(mocks.createInvitation).toHaveBeenCalledWith({
        documentId: 'document-1',
        email: 'new@example.com',
        role: 'viewer',
      }),
    )
  })
})
