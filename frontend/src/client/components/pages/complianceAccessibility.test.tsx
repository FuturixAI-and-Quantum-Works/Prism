import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ComplianceListFeature as CompliancePage } from '../../features/compliance/ComplianceListFeature'

const mocks = vi.hoisted(() => ({
  mutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve() }))],
  reviews: [] as Array<Record<string, unknown>>,
}))

vi.mock('../Layout', () => ({
  default: ({
    children,
  }: {
    children: ReactNode | ((props: { onAddProject: () => void }) => ReactNode)
  }) => (
    <main>{typeof children === 'function' ? children({ onAddProject: vi.fn() }) : children}</main>
  ),
}))

vi.mock('../../features/documents/documentsApi', () => ({
  useGetDocumentsQuery: () => ({ data: [] }),
  useDeleteDocumentMutation: mocks.mutation,
  useUpdateDocumentMutation: mocks.mutation,
  useUploadDocumentMutation: mocks.mutation,
}))
vi.mock('../../features/documents/api/documentCoreApi', () => ({
  useGetDocumentsQuery: () => ({ data: [] }),
  useDeleteDocumentMutation: mocks.mutation,
  useUpdateDocumentMutation: mocks.mutation,
  useUploadDocumentMutation: mocks.mutation,
}))

vi.mock('../../store/api/complianceApi', () => ({
  useGetComplianceReviewsQuery: () => ({ data: mocks.reviews }),
  useDeleteComplianceReviewMutation: mocks.mutation,
}))

vi.mock('../../store/api/drive/driveWorkspaceApi', () => ({
  useGetDriveWorkspacesQuery: () => ({ data: [] }),
}))

describe('compliance accessibility', () => {
  beforeEach(() => {
    mocks.reviews.splice(0)
  })

  it('has no automated violations in its empty state', async () => {
    const { container } = render(
      <MemoryRouter>
        <CompliancePage />
      </MemoryRouter>,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('operates filters and row actions from the keyboard', async () => {
    mocks.reviews.push({
      id: 'review-1',
      primaryDocumentId: 'document-1',
      workspaceId: null,
      title: 'Supplier agreement',
      results: { criticalIssues: 2 },
      complianceScore: 78,
      updatedAt: '2026-09-01T12:00:00.000Z',
    })
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <CompliancePage />
      </MemoryRouter>,
    )

    const filters = screen.getByRole('button', { name: 'Filters' })
    await user.click(filters)
    const highRisk = screen.getByRole('menuitemcheckbox', { name: 'High Risk' })
    await waitFor(() => expect(highRisk).toHaveFocus())
    await user.keyboard('{ArrowDown}')
    const mediumRisk = screen.getByRole('menuitemcheckbox', { name: 'Medium Risk' })
    expect(mediumRisk).toHaveFocus()
    await user.keyboard(' ')
    expect(mediumRisk).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(filters).toHaveFocus())

    const sort = screen.getByRole('button', { name: /Sort:/ })
    await user.click(sort)
    await waitFor(() => expect(screen.getByRole('option', { name: 'Newest First' })).toHaveFocus())
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Oldest First' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(sort).toHaveFocus())

    const actions = screen.getByRole('button', { name: 'More actions for Supplier agreement' })
    actions.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Open Review' })).toHaveFocus())
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Continue Analysis' })).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(actions).toHaveFocus())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('maps review data and opens the matching review route', async () => {
    mocks.reviews.push(
      {
        id: 'document-review',
        primaryDocumentId: 'document-1',
        workspaceId: null,
        title: 'Supplier agreement',
        results: { criticalIssues: 2 },
        complianceScore: 78,
        updatedAt: '2026-09-01T12:00:00.000Z',
      },
      {
        id: 'workspace-review',
        primaryDocumentId: 'document-2',
        workspaceId: 'workspace-1',
        title: 'Acquisition room',
        results: { criticalIssues: 5 },
        complianceScore: 42,
        updatedAt: '2026-09-02T12:00:00.000Z',
      },
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/compliance']}>
        <Routes>
          <Route path="/compliance" element={<CompliancePage />} />
          <Route
            path="/compliance/reviews/:reviewId"
            element={<div>Exact review destination</div>}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('2 Medium Risks')).toBeInTheDocument()
    expect(screen.getByText('78% Compliant')).toBeInTheDocument()
    expect(screen.getByText('5 High Risks')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Supplier agreement' }))
    expect(screen.getByText('Exact review destination')).toBeInTheDocument()
  })
})
