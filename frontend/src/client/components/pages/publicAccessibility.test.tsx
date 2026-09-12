import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApprovalDecisionPage from './ApprovalDecisionPage'
import ShareAcceptPage from './ShareAcceptPage'

const api = vi.hoisted(() => {
  const invitation = {
    status: 'pending' as const,
    role: 'viewer',
    resource_type: 'project' as 'document' | 'project' | 'workspace',
    resource_id: 'project-1' as string | null,
    resource_name: 'Apollo',
  }
  return {
    invitation,
    decide: vi.fn(() => ({
      unwrap: () => Promise.resolve({ status: 'approved' as const }),
    })),
    accept: vi.fn(() => ({
      unwrap: () => Promise.resolve({ ok: true, ...invitation, status: 'accepted' as const }),
    })),
  }
})

vi.mock('../../store/api/approvalsApi', () => ({
  useGetPublicApprovalRequestQuery: () => ({
    currentData: {
      request: {
        status: 'pending',
        role_label: 'Legal reviewer',
        approver_name: 'Alex',
      },
      items: [{ id: 'item-1', title: 'Payment terms', reason: 'Confirm the schedule.' }],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useDecidePublicApprovalRequestMutation: () => [api.decide, { isLoading: false }],
}))

vi.mock('../../store/api/invitationsApi', () => ({
  useGetInvitationQuery: () => ({
    data: api.invitation,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useAcceptInvitationMutation: () => [api.accept, { isLoading: false }],
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

function renderRoute(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.replace('token-1', ':token')} element={element} />
        <Route path="*" element={<LocationPath />} />
      </Routes>
    </MemoryRouter>,
  )
}

function LocationPath() {
  return <div>{useLocation().pathname}</div>
}

describe('public approval and share accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.invitation.resource_type = 'project'
    api.invitation.resource_id = 'project-1'
    api.invitation.resource_name = 'Apollo'
  })

  it('supports keyboard-only approval decisions without axe violations', async () => {
    const user = userEvent.setup()
    const { container } = renderRoute('/approval/token-1', <ApprovalDecisionPage />)

    expect(await axe(container)).toHaveNoViolations()
    screen.getByRole('button', { name: 'Approve' }).focus()
    await user.keyboard('{Enter}')
    expect(api.decide).toHaveBeenCalledWith({
      token: 'token-1',
      status: 'approved',
      decision_note: undefined,
    })
  })

  it('preserves the approval note and reports a rejected decision request', async () => {
    api.decide.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { detail: 'This approval link has expired.' } }),
    })
    const user = userEvent.setup()
    renderRoute('/approval/token-1', <ApprovalDecisionPage />)

    await user.type(screen.getByRole('textbox', { name: 'Decision note' }), 'Needs revision')
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This approval link has expired.')
    expect(screen.getByRole('textbox', { name: 'Decision note' })).toHaveValue('Needs revision')
    expect(screen.getByRole('status')).toHaveTextContent('Status: pending')
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled()
  })

  it('supports keyboard-only invitation acceptance without axe violations', async () => {
    const user = userEvent.setup()
    const { container } = renderRoute('/share/accept/token-1', <ShareAcceptPage />)

    expect(await axe(container)).toHaveNoViolations()
    screen.getByRole('button', { name: 'Accept invite' }).focus()
    await user.keyboard('{Enter}')
    expect(api.accept).toHaveBeenCalledWith({ kind: 'token', token: 'token-1' })
    expect(await screen.findByText('/projects/project-1')).toBeInTheDocument()
  })

  it.each([
    ['document', 'document-1', '/documents/document-1'],
    ['workspace', 'workspace-1', '/workspaces/workspace-1'],
  ] as const)('routes an accepted %s with its own ID', async (resourceType, resourceId, path) => {
    api.invitation.resource_type = resourceType
    api.invitation.resource_id = resourceId
    const user = userEvent.setup()
    renderRoute('/share/accept/token-1', <ShareAcceptPage />)

    await user.click(screen.getByRole('button', { name: 'Accept invite' }))

    expect(await screen.findByText(path)).toBeInTheDocument()
  })
})
