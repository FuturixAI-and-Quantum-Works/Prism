import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsFeature from './DocumentsFeature'

const mocks = vi.hoisted(() => ({
  queryResult: {
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as {
    data: Array<Record<string, unknown>> | undefined
    isLoading: boolean
    isError: boolean
    refetch: ReturnType<typeof vi.fn>
  },
}))

vi.mock('../../components/FilePreviewModal', () => ({ default: () => null }))
vi.mock('../../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))
vi.mock('./api/documentCoreApi', () => ({
  useCreateDocumentMutation: () => [vi.fn()],
  useDeleteDocumentMutation: () => [vi.fn()],
  useGetDocumentsQuery: () => mocks.queryResult,
  useUpdateDocumentMutation: () => [vi.fn()],
  useUploadDocumentMutation: () => [vi.fn()],
}))
vi.mock('./api/documentContentApi', () => ({
  useLazyGetDocumentHtmlQuery: () => [vi.fn()],
  useLazyGetDocumentUrlQuery: () => [vi.fn()],
}))
vi.mock('./api/documentSharingApi', () => ({
  useCreateDocumentInvitationMutation: () => [vi.fn(), { isLoading: false }],
  useGetDocumentSharesQuery: () => ({
    data: { shares: [], pending_invitations: [] },
    isFetching: false,
  }),
  useRemoveDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateDocumentShareMutation: () => [vi.fn(), { isLoading: false }],
}))

function apiDocument(id: string, filename: string, createdAt: string) {
  return {
    id,
    project_id: null,
    workspace_id: null,
    user_id: 'user-1',
    folder_id: null,
    filename,
    file_type: 'pdf',
    size_bytes: 2048,
    page_count: 2,
    status: 'ready',
    lifecycle_status: 'DRAFT',
    current_version_id: null,
    is_primary: false,
    created_at: createdAt,
    updated_at: createdAt,
  }
}

function LocationProbe() {
  return <output aria-label="Current route">{useLocation().pathname}</output>
}

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={['/library']}>
      <Routes>
        <Route path="/library" element={<DocumentsFeature />} />
        <Route path="/documents/new" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.queryResult = {
    data: [
      apiDocument('document-2', 'Zeta filing.pdf', '2026-02-01T00:00:00.000Z'),
      apiDocument('document-1', 'Alpha filing.pdf', '2026-01-01T00:00:00.000Z'),
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }
})

describe('library documents', () => {
  it('renders API documents, real sorting, and the existing create route without prototype data', async () => {
    const user = userEvent.setup()
    renderLibrary()

    expect(
      screen.getAllByRole('button', { name: /^Preview / }).map((button) => button.ariaLabel),
    ).toEqual(['Preview Zeta filing.pdf', 'Preview Alpha filing.pdf'])
    expect(screen.queryByText('Tech Corp NDA - Q4 2024')).not.toBeInTheDocument()
    expect(screen.queryByText('Project : Personal')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sort : Newest' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Name A-Z' }))

    expect(
      screen.getAllByRole('button', { name: /^Preview / }).map((button) => button.ariaLabel),
    ).toEqual(['Preview Alpha filing.pdf', 'Preview Zeta filing.pdf'])

    await user.click(screen.getByRole('tab', { name: 'Done' }))
    expect(screen.getByText('No documents match your search or status filter.')).toBeInTheDocument()
    expect(screen.queryByText('No saved documents yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New' }))
    expect(screen.getByRole('status', { name: 'Current route' })).toHaveTextContent(
      '/documents/new',
    )
  })

  it('renders empty and error states from the document query', async () => {
    const user = userEvent.setup()
    mocks.queryResult = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    const rendered = renderLibrary()

    expect(screen.getByText('No saved documents yet')).toBeInTheDocument()
    expect(screen.queryByText('Vendor Service Contract 2024')).not.toBeInTheDocument()

    rendered.unmount()
    const refetch = vi.fn()
    mocks.queryResult = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    }
    renderLibrary()

    expect(screen.getByText('Documents could not be loaded.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
