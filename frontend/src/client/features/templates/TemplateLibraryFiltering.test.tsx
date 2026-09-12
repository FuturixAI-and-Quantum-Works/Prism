import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LibraryTemplatesScreen from './TemplateLibraryFeature'

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

vi.mock('../../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))
vi.mock('./templatesApi', () => ({
  useGetTemplatesQuery: () => mocks.queryResult,
  useUpdateTemplateMutation: () => [vi.fn()],
  useDeleteTemplateMutation: () => [vi.fn()],
}))

beforeEach(() => {
  mocks.queryResult = {
    data: [
      {
        id: 'template-1',
        userId: null,
        name: 'NDA Template',
        category: 'NDA',
        description: 'Confidentiality terms',
        contentHtml: '<p>Confidential</p>',
        fields: [],
        sourceFilename: null,
        sourceStoragePath: null,
        sourceMimeType: null,
        sourceChecksum: null,
        sourceMetadata: null,
        isCreatedByUser: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'template-2',
        userId: null,
        name: 'Service Agreement',
        category: 'Service',
        description: 'Standard service terms',
        contentHtml: '<p>Services</p>',
        fields: [],
        sourceFilename: null,
        sourceStoragePath: null,
        sourceMimeType: null,
        sourceChecksum: null,
        sourceMetadata: null,
        isCreatedByUser: false,
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }
})

describe('template library filtering', () => {
  it('filters categories and preserves the selected sort order', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LibraryTemplatesScreen />
      </MemoryRouter>,
    )

    expect(
      screen.getAllByRole('button', { name: /^Open / }).map((button) => button.ariaLabel),
    ).toEqual(['Open Service Agreement', 'Open NDA Template'])

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.click(screen.getByRole('button', { name: 'NDA' }))
    expect(screen.getByRole('button', { name: 'Open NDA Template' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Service Agreement' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    await user.click(screen.getByRole('button', { name: 'Sort: Newest' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Name A-Z' }))

    expect(
      screen.getAllByRole('button', { name: /^Open / }).map((button) => button.ariaLabel),
    ).toEqual(['Open NDA Template', 'Open Service Agreement'])
    expect(screen.queryByRole('button', { name: 'New' })).not.toBeInTheDocument()
  })

  it('shows API empty and error states without default category controls', async () => {
    const user = userEvent.setup()
    mocks.queryResult = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    const rendered = render(
      <MemoryRouter>
        <LibraryTemplatesScreen />
      </MemoryRouter>,
    )

    expect(screen.getByText('No templates available.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument()

    rendered.unmount()
    const refetch = vi.fn()
    mocks.queryResult = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    }
    render(
      <MemoryRouter>
        <LibraryTemplatesScreen />
      </MemoryRouter>,
    )

    expect(screen.getByText('Templates could not be loaded.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
