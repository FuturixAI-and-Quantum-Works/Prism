import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RulebookPage from '../../features/rulebook/RulebookFeature'

const mocks = vi.hoisted(() => {
  const mutation = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 'created-1' }) }))
  return {
    mutation,
    workflows: [
      {
        id: 'rulebook-1',
        title: 'Vendor policy',
        practice: 'Commercial',
        columnsConfig: [
          {
            id: 'check-1',
            index: 0,
            name: 'Termination',
            prompt: 'Check termination rights',
            format: 'text',
          },
        ],
        is_owner: true,
        allow_edit: true,
        updatedAt: '2026-09-01T12:00:00.000Z',
      },
    ],
  }
})

vi.mock('../Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../../store/api/workflowsApi', () => ({
  useGetWorkflowsQuery: () => ({
    data: mocks.workflows,
    isLoading: false,
    isError: false,
  }),
  useCreateWorkflowMutation: () => [mocks.mutation, { isLoading: false }],
  useDeleteWorkflowMutation: () => [mocks.mutation, { isLoading: false }],
  usePatchWorkflowMutation: () => [mocks.mutation, { isLoading: false }],
}))

vi.mock('../../features/documents/documentsApi', () => ({
  useGetDocumentsQuery: () => ({ data: [], isLoading: false }),
}))
vi.mock('../../features/documents/api/documentCoreApi', () => ({
  useGetDocumentsQuery: () => ({ data: [], isLoading: false }),
}))

vi.mock('../../store/api/tabularReviewApi', () => ({
  useCreateTabularReviewMutation: () => [mocks.mutation, { isLoading: false }],
}))

vi.mock('../../store/api/rulebookApi', () => ({
  useGenerateRulebookMutation: () => [mocks.mutation, { isLoading: false }],
}))

describe('rulebook page accessibility', () => {
  it('opens row actions and the editor with the keyboard', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <RulebookPage />
      </MemoryRouter>,
    )

    const rulebook = screen.getByRole('button', { name: /Vendor policy/ })
    rulebook.focus()
    await user.keyboard('{Shift>}{F10}{/Shift}')

    expect(screen.getByRole('menu', { name: 'Actions for Vendor policy' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Create review' })).toHaveFocus(),
    )

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await waitFor(() => expect(rulebook).toHaveFocus())

    await user.keyboard('{Shift>}{F10}{/Shift}')
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Create review' })).toHaveFocus(),
    )
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Vendor policy' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(rulebook).toHaveFocus())

    const newRulebook = screen.getByRole('button', { name: 'New rulebook' })
    await user.click(newRulebook)
    expect(screen.getByRole('dialog', { name: 'New rulebook' })).toBeInTheDocument()

    const sampleDocument = screen.getByRole('button', { name: 'Sample document: None' })
    sampleDocument.focus()
    await user.keyboard('{ArrowDown}')
    await waitFor(() => expect(screen.getByRole('option', { name: 'None' })).toHaveFocus())
    expect(await axe(container)).toHaveNoViolations()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(sampleDocument).toHaveFocus())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(newRulebook).toHaveFocus()
  })
})
