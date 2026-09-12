import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApprovalDecisionPage from './ApprovalDecisionPage'

const api = vi.hoisted(() => ({
  decide: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('../../store/api/approvalsApi', () => ({
  useDecidePublicApprovalRequestMutation: () => [api.decide, { isLoading: false }],
  useGetPublicApprovalRequestQuery: () => ({
    currentData: {
      request: {
        role_label: 'Legal approver',
        approver_name: 'Taylor',
        status: 'pending',
      },
      items: [{ id: 'item-1', title: 'Terms', reason: 'Updated liability' }],
    },
    isLoading: false,
    isError: false,
    refetch: api.refetch,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/approvals/token-1']}>
      <Routes>
        <Route path="/approvals/:token" element={<ApprovalDecisionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ApprovalDecisionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.decide.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          role_label: 'Legal approver',
          approver_name: 'Taylor',
          status: 'approved',
        }),
    })
  })

  it('preserves the note and pending status when a decision rejects', async () => {
    api.decide.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'This approval link expired.' } }),
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('textbox', { name: 'Decision note' }), 'Needs revision')
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This approval link expired.')
    expect(screen.getByRole('textbox', { name: 'Decision note' })).toHaveValue('Needs revision')
    expect(screen.getByRole('status')).toHaveTextContent('Status: pending')
    expect(api.refetch).not.toHaveBeenCalled()
  })

  it('blocks duplicate decisions while the first request is pending', async () => {
    let resolveDecision!: (value: Record<string, unknown>) => void
    api.decide.mockReturnValue({
      unwrap: () =>
        new Promise<Record<string, unknown>>((resolve) => {
          resolveDecision = resolve
        }),
    })
    renderPage()
    const approve = screen.getByRole('button', { name: 'Approve' })

    fireEvent.click(approve)
    fireEvent.click(approve)
    expect(api.decide).toHaveBeenCalledOnce()

    await act(async () => {
      resolveDecision({
        role_label: 'Legal approver',
        approver_name: 'Taylor',
        status: 'approved',
      })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Status: approved')
  })
})
