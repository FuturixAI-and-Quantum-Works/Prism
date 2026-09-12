import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from './DashboardFeature'

const mocks = vi.hoisted(() => ({
  acceptInvitation: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  approveAccessRequest: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  updateAttentionItem: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  attentionItems: [] as Array<Record<string, unknown>>,
}))

vi.mock('../../components/Layout', () => ({
  default: ({
    children,
  }: {
    children: (value: { onAddProject: () => void }) => React.ReactNode
  }) => <>{children({ onAddProject: vi.fn() })}</>,
}))
vi.mock('../files/BrowseFilesDialog', () => ({ default: () => null }))
vi.mock('../assistant/panel/AiAssistantPanel', () => ({ default: () => null }))
vi.mock('../../hooks', () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false }),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { displayName: 'Alex Morgan' } }),
}))
vi.mock('../documents/documentsApi', () => ({
  useGetDocumentsQuery: () => ({ data: [] }),
}))
vi.mock('../documents/api/documentCoreApi', () => ({
  useDeleteDocumentMutation: () => [vi.fn()],
  useGetDocumentsQuery: () => ({ data: [] }),
  useUpdateDocumentMutation: () => [vi.fn()],
  useUploadDocumentMutation: () => [vi.fn()],
}))
vi.mock('../../store/api/complianceApi', () => ({
  useGetComplianceReviewsQuery: () => ({ data: [] }),
}))
vi.mock('../../store/api/drive/driveWorkspaceApi', () => ({
  useGetDriveWorkspacesQuery: () => ({ data: [] }),
}))
vi.mock('../../store/api/attentionApi', () => ({
  useGetAttentionItemsQuery: () => ({ data: mocks.attentionItems }),
  useUpdateAttentionItemMutation: () => [mocks.updateAttentionItem],
}))
vi.mock('../../store/api/invitationsApi', () => ({
  useAcceptInvitationMutation: () => [mocks.acceptInvitation],
  useDeclineInvitationMutation: () => [vi.fn()],
  useApproveAccessRequestMutation: () => [mocks.approveAccessRequest],
  useRejectAccessRequestMutation: () => [vi.fn()],
  useApproveChangeRequestMutation: () => [vi.fn()],
  useRejectChangeRequestMutation: () => [vi.fn()],
}))

describe('dashboard actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.attentionItems.splice(0, mocks.attentionItems.length, {
      id: 'request-1',
      title: 'Jordan requested access',
      description: 'Editor access to Apollo',
      source_type: 'access_request',
      source_id: 'request-1',
      metadata: { workspaceId: 'workspace-1' },
      status: 'pending',
    })
  })

  it('approves an access request with its workspace relation intact', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Review Access' }))
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() =>
      expect(mocks.approveAccessRequest).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        requestId: 'request-1',
      }),
    )
  })

  it('accepts dashboard invitations by invitation ID', async () => {
    mocks.attentionItems.splice(0, mocks.attentionItems.length, {
      id: 'attention-1',
      title: 'Project invitation',
      description: 'Editor access to Apollo',
      source_type: 'project_invitation',
      source_id: 'invitation-1',
      metadata: null,
      status: 'pending',
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Review Access' }))
    await user.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() =>
      expect(mocks.acceptInvitation).toHaveBeenCalledWith({
        kind: 'id',
        invitationId: 'invitation-1',
      }),
    )
  })

  it('reports attention update failures and allows retry', async () => {
    mocks.attentionItems.splice(0, mocks.attentionItems.length, {
      id: 'attention-1',
      title: 'Contract risk found',
      description: 'Review the flagged clause',
      source_type: 'document_risk',
      source_id: 'document-1',
      metadata: null,
      status: 'pending',
    })
    mocks.updateAttentionItem.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { detail: 'Could not mark this item as viewed.' } }),
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'view' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not mark this item as viewed.',
    )

    await user.click(screen.getByRole('button', { name: 'view' }))
    await waitFor(() => expect(mocks.updateAttentionItem).toHaveBeenCalledTimes(2))
  })
})
