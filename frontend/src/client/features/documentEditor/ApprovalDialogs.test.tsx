import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import { ApprovalDialogs } from './ApprovalDialogs'

function Harness() {
  const [open, setOpen] = useState(true)
  return (
    <ApprovalDialogs
      approvalError=""
      approvalModalOpen={open}
      canOwnerReviewApproval
      canSendForApproval
      handleOwnerApproveDocument={vi.fn()}
      handleOwnerRejectDocument={vi.fn()}
      handleSendForApproval={vi.fn()}
      isSendingForApproval={false}
      ownerApprovalError=""
      ownerApproveModalOpen={false}
      ownerRejectAnchor=""
      ownerRejectModalOpen={false}
      ownerRejectNote=""
      ownerRejectPage=""
      ownerRejectSection=""
      setApprovalModalOpen={setOpen}
      setOwnerApprovalError={vi.fn()}
      setOwnerApproveModalOpen={vi.fn()}
      setOwnerRejectAnchor={vi.fn()}
      setOwnerRejectModalOpen={vi.fn()}
      setOwnerRejectNote={vi.fn()}
      setOwnerRejectPage={vi.fn()}
      setOwnerRejectSection={vi.fn()}
    />
  )
}

describe('ApprovalDialogs accessibility', () => {
  it('is labeled, traps focus, and closes with Escape', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)

    expect(screen.getByRole('dialog', { name: 'Send for approval?' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
