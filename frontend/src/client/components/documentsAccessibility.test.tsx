import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import DocumentsScreen from '../features/documents/DocumentsFeature'

vi.mock('./FilePreviewModal', () => ({ default: () => null }))
vi.mock('../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('../features/documents/documentsApi', () => {
  const documents = [
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
  ]

  return {
    useGetDocumentsQuery: () => ({
      data: documents,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useDeleteDocumentMutation: () => [vi.fn()],
    useUpdateDocumentMutation: () => [vi.fn()],
    useLazyGetDocumentUrlQuery: () => [vi.fn()],
    useCreateDocumentInvitationMutation: () => [vi.fn(), { isLoading: false }],
    useUpdateDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
    useRemoveDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
    useGetDocumentSharesQuery: () => ({
      data: { shares: [], pending_invitations: [] },
      isFetching: false,
    }),
  }
})
vi.mock('../features/documents/api/documentCoreApi', () => ({
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
vi.mock('../features/documents/api/documentContentApi', () => ({
  useLazyGetDocumentHtmlQuery: () => [vi.fn()],
  useLazyGetDocumentUrlQuery: () => [vi.fn()],
}))
vi.mock('../features/documents/api/documentSharingApi', () => ({
  useCreateDocumentInvitationMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
  useRemoveDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
  useGetDocumentSharesQuery: () => ({
    data: { shares: [], pending_invitations: [] },
    isFetching: false,
  }),
}))

describe('documents accessibility', () => {
  it('supports tabs, menus, and dialogs from the keyboard without axe violations', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <DocumentsScreen />
      </MemoryRouter>,
    )

    const active = screen.getByRole('tab', { name: 'Active' })
    for (let index = 0; index < 20 && document.activeElement !== active; index += 1) {
      await user.tab()
    }
    expect(active).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Done' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')

    const actions = screen.getByRole('button', { name: 'More actions for contract.pdf' })
    await user.click(actions)
    expect(screen.getByRole('menuitem', { name: 'Open in Editor' })).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
    await user.keyboard('{Escape}')
    expect(actions).toHaveFocus()

    await user.tab({ shift: true })
    const documentTrigger = screen.getByRole('button', { name: 'Preview contract.pdf' })
    expect(documentTrigger).toHaveFocus()
    await user.keyboard('{Shift>}{F10}{/Shift}')
    expect(screen.getByRole('menuitem', { name: 'Open in Editor' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(documentTrigger).toHaveFocus()

    await user.tab()
    expect(actions).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')

    expect(screen.getByRole('dialog', { name: 'Rename Document' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Document name' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
