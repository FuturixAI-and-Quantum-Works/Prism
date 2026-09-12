import { useRef, useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ComplianceReviewActions } from './ComplianceReviewActions'
import { ComplianceRiskResults } from './ComplianceRiskResults'
import type { ComplianceListAction, ComplianceListDocument } from './reviewListModel'

const document: ComplianceListDocument = {
  id: 'review-1',
  primaryDocumentId: 'document-1',
  workspaceId: null,
  name: 'Supplier agreement',
  reviewType: 'Document Review',
  riskStatus: 'Medium',
  riskCount: 2,
  complianceScore: 78,
  reviewer: 'AI Assistant',
  updatedTime: '1 Sep 2026',
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
}

function ReviewActionsHarness({
  onOpenReview = vi.fn(),
  onDelete = vi.fn(),
}: {
  onOpenReview?: (action: ComplianceListAction) => void
  onDelete?: (action: ComplianceListAction) => void
}) {
  const [action, setAction] = useState<ComplianceListAction | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!triggerRef.current) return
          setAction({
            kind: 'menu',
            document,
            position: { top: 0, left: 0 },
            trigger: triggerRef.current,
          })
        }}
      >
        Review actions
      </button>
      <ComplianceReviewActions
        action={action}
        onClose={() => setAction(null)}
        onOpenReview={onOpenReview}
        onDelete={onDelete}
      />
      <button type="button">After actions</button>
    </>
  )
}

describe('compliance action menus', () => {
  it('renders only review actions backed by handlers', async () => {
    const user = userEvent.setup()
    const onOpenReview = vi.fn()
    const onDelete = vi.fn()
    render(<ReviewActionsHarness onOpenReview={onOpenReview} onDelete={onDelete} />)

    const trigger = screen.getByRole('button', { name: 'Review actions' })
    await user.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Actions for Supplier agreement' })

    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Open Review', 'Continue Analysis', 'Delete'])
    expect(within(menu).queryByRole('menuitem', { name: 'Ask Prism' })).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Export Summary' })).not.toBeInTheDocument()
    expect(
      within(menu).queryByRole('menuitem', { name: 'View Audit Trail' }),
    ).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Share Review' })).not.toBeInTheDocument()

    await user.click(within(menu).getByRole('menuitem', { name: 'Open Review' }))
    expect(onOpenReview).toHaveBeenCalledOnce()

    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Continue Analysis' }))
    expect(onOpenReview).toHaveBeenCalledTimes(2)

    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it.each([
    { direction: 'forward', shift: false, destination: 'After actions' },
    { direction: 'backward', shift: true, destination: 'Review actions' },
  ])(
    'closes the review menu on $direction Tab without overriding focus',
    async ({ shift, destination }) => {
      const user = userEvent.setup()
      render(<ReviewActionsHarness />)

      await user.click(screen.getByRole('button', { name: 'Review actions' }))
      await waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'Open Review' })).toHaveFocus(),
      )

      await user.tab({ shift })

      expect(
        screen.queryByRole('menu', { name: 'Actions for Supplier agreement' }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: destination })).toHaveFocus()
    },
  )

  it('opens the persisted risk action from the keyboard and restores focus on Escape', async () => {
    const user = userEvent.setup()
    render(
      <ComplianceRiskResults
        results={[
          {
            id: 'risk-1',
            summary: 'Unlimited liability',
            status: 'non_compliant',
          },
        ]}
        insights={[]}
        isRunning={false}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Actions for Unlimited liability' })
    trigger.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy text' })).toHaveFocus())
    const menu = screen.getByRole('menu', { name: 'Risk result actions' })

    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Copy text'])
    expect(
      within(menu).queryByRole('menuitem', { name: 'Mark as resolved' }),
    ).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Dismiss' })).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.queryByRole('menu', { name: 'Risk result actions' })).not.toBeInTheDocument()

    fireEvent.contextMenu(screen.getByText('Unlimited liability'))
    expect(screen.queryByRole('menu', { name: 'Risk result actions' })).not.toBeInTheDocument()

    await user.keyboard(' ')
    expect(screen.getByRole('menu', { name: 'Risk result actions' })).toBeInTheDocument()
  })
})
