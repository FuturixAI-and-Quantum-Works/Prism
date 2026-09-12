import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import Dashboard from '../features/dashboard/DashboardFeature'

vi.mock('./Layout', () => ({
  default: ({
    children,
  }: {
    children: (value: { onAddProject: () => void }) => React.ReactNode
  }) => <>{children({ onAddProject: vi.fn() })}</>,
}))

vi.mock('../features/files/BrowseFilesDialog', () => ({ default: () => null }))
vi.mock('../features/assistant/panel/AiAssistantPanel', () => ({ default: () => null }))
vi.mock('../hooks', () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false }),
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { displayName: 'Alex Morgan' } }),
}))
vi.mock('../features/documents/documentsApi', () => ({
  useGetDocumentsQuery: () => ({ data: [] }),
}))
vi.mock('../features/documents/api/documentCoreApi', () => ({
  useDeleteDocumentMutation: () => [vi.fn()],
  useGetDocumentsQuery: () => ({ data: [] }),
  useUpdateDocumentMutation: () => [vi.fn()],
  useUploadDocumentMutation: () => [vi.fn()],
}))
vi.mock('../store/api/complianceApi', () => ({
  useGetComplianceReviewsQuery: () => ({ data: [] }),
}))
vi.mock('../store/api/drive/driveWorkspaceApi', () => ({
  useGetDriveWorkspacesQuery: () => ({ data: [] }),
}))
vi.mock('../store/api/attentionApi', () => ({
  useGetAttentionItemsQuery: () => ({
    data: [
      {
        id: 'request-1',
        title: 'Jordan requested access',
        description: 'Editor access to Apollo',
        source_type: 'access_request',
        source_id: 'request-1',
        metadata: { workspaceId: 'workspace-1' },
        status: 'pending',
      },
    ],
  }),
  useUpdateAttentionItemMutation: () => [vi.fn()],
}))
vi.mock('../store/api/invitationsApi', () => ({
  useAcceptInvitationMutation: () => [vi.fn()],
  useDeclineInvitationMutation: () => [vi.fn()],
  useApproveAccessRequestMutation: () => [vi.fn()],
  useRejectAccessRequestMutation: () => [vi.fn()],
  useApproveChangeRequestMutation: () => [vi.fn()],
  useRejectChangeRequestMutation: () => [vi.fn()],
}))

describe('dashboard accessibility', () => {
  it('opens and dismisses review actions from the keyboard without axe violations', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )

    const review = screen.getByRole('button', { name: 'Review Access' })
    review.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('dialog', { name: 'Access Request' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(review).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
  })
})
