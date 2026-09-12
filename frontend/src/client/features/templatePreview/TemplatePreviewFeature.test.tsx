import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Template, TemplateField } from '../templates/templatesApi'
import TemplatePreviewPage from './TemplatePreviewFeature'

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createDocumentFromTemplate: vi.fn(),
  queryResult: { data: undefined, isLoading: false, isError: false, refetch: vi.fn() } as {
    data: unknown
    isLoading: boolean
    isError: boolean
    refetch: ReturnType<typeof vi.fn>
  },
  query: vi.fn(),
}))

vi.mock('../../components/Layout', () => ({
  default: ({
    breadcrumbs,
    children,
  }: {
    breadcrumbs: Array<{ label: string }>
    children: React.ReactNode
  }) => (
    <>
      <output aria-label="Breadcrumbs">{breadcrumbs.map(({ label }) => label).join(' / ')}</output>
      {children}
    </>
  ),
}))

vi.mock('../editor/TiptapEditorFeature', () => ({
  default: ({
    content,
    onContentChange,
    onFocusChange,
  }: {
    content: string
    onContentChange: (content: string) => void
    onFocusChange: (focused: boolean) => void
  }) => (
    <div role="region" aria-label="Template editor">
      <output aria-label="Editor content">{content}</output>
      <button
        type="button"
        onClick={() => {
          onFocusChange(true)
          onContentChange('<p>Manual editor change</p>')
        }}
      >
        Change editor content
      </button>
    </div>
  ),
}))

vi.mock('../templates/templatesApi', () => ({
  useGetTemplateQuery: (id: string, options: { skip: boolean }) => {
    mocks.query(id, options)
    return mocks.queryResult
  },
  useCreateDocumentFromTemplateMutation: () => [
    mocks.createDocumentFromTemplate,
    { isLoading: false },
  ],
}))

vi.mock('../documents/documentsApi', () => ({
  useCreateDocumentMutation: () => [mocks.createDocument, { isLoading: false }],
}))

const field = (id: string, label = id): TemplateField => ({
  id,
  label,
  type: 'text',
  required: true,
  section: 'Details',
})

const template = (overrides: Partial<Template> = {}): Template => ({
  id: 'template-1',
  userId: null,
  name: 'Route Template',
  category: 'Legal',
  description: null,
  contentHtml: '<p>{{party}}</p>',
  fields: [field('party', 'Party')],
  sourceFilename: null,
  sourceStoragePath: null,
  sourceMimeType: null,
  sourceChecksum: null,
  sourceMetadata: null,
  isCreatedByUser: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

function LocationProbe() {
  return <output aria-label="Current route">{useLocation().pathname}</output>
}

function renderPreview(routeTemplate?: Template) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/template-preview/template-1',
          state: routeTemplate ? { template: routeTemplate } : undefined,
        },
      ]}
    >
      <Routes>
        <Route path="/template-preview/:templateId" element={<TemplatePreviewPage />} />
        <Route path="/documents" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('template preview behavior', () => {
  beforeEach(() => {
    mocks.query.mockReset()
    mocks.queryResult = {
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    mocks.createDocument.mockReset()
    mocks.createDocument.mockImplementation(() => ({
      unwrap: () => Promise.resolve(),
    }))
    mocks.createDocumentFromTemplate.mockReset()
    mocks.createDocumentFromTemplate.mockImplementation(() => ({
      unwrap: () => Promise.resolve(),
    }))
  })

  it('waits for the API before initializing route state, then gives fetched data precedence', () => {
    const routeTemplate = template({ name: 'Route State Template' })
    mocks.queryResult = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    }

    const rendered = renderPreview(routeTemplate)

    expect(screen.getByText('Loading template...')).toBeInTheDocument()
    expect(screen.queryByText('Route State Template')).not.toBeInTheDocument()
    expect(mocks.query).toHaveBeenCalledWith('template-1', { skip: false })

    rendered.unmount()
    mocks.queryResult = {
      data: template({ name: 'Fetched Template' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    renderPreview(routeTemplate)

    expect(screen.getByText('Fetched Template')).toBeInTheDocument()
    expect(screen.queryByText('Route State Template')).not.toBeInTheDocument()
  })

  it('falls back to route state and reports missing templates', () => {
    const longName = 'A template name that must be truncated'
    mocks.queryResult = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    }
    const rendered = renderPreview(template({ name: longName }))

    expect(screen.getByText(longName)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Breadcrumbs' })).toHaveTextContent(
      'Home / Templates / A template name that must...',
    )

    rendered.unmount()
    const mismatched = renderPreview(template({ id: 'template-2', name: 'Wrong Template' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Template could not be loaded.')
    expect(screen.queryByText('Wrong Template')).not.toBeInTheDocument()

    mismatched.unmount()
    mocks.queryResult = {
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    renderPreview()
    expect(screen.getByText('Template not found')).toBeInTheDocument()
  })

  it('preserves editor edits through field changes and submits the edited HTML', async () => {
    const user = userEvent.setup()
    mocks.queryResult = {
      data: template({ contentHtml: '<p>{{party}}</p><script>unsafe()</script>' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    renderPreview()

    await user.click(screen.getByRole('button', { name: 'Change editor content' }))
    expect(screen.getByRole('status', { name: 'Editor content' })).toHaveTextContent(
      '<p>Manual editor change</p>',
    )

    await user.type(screen.getByLabelText('Party'), 'Acme')
    expect(screen.getByRole('status', { name: 'Editor content' })).toHaveTextContent(
      '<p>Manual editor change</p>',
    )

    await user.click(screen.getByRole('button', { name: 'Create Document' }))

    await waitFor(() => {
      expect(mocks.createDocument).toHaveBeenCalledWith({
        name: 'Route Template',
        filename: 'Route Template.docx',
        content_html: '<p>Manual editor change</p>',
      })
    })
    expect(mocks.createDocumentFromTemplate).not.toHaveBeenCalled()
    expect(screen.getByRole('status', { name: 'Current route' })).toHaveTextContent('/documents')
  })

  it('uses the source mutation and last duplicate value for either source marker', async () => {
    const user = userEvent.setup()
    mocks.queryResult = {
      data: template({
        fields: [field('party', 'First party'), field('party', 'Second party')],
        sourceStoragePath: 'templates/agreement.docx',
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    renderPreview()

    await user.type(screen.getByLabelText('First party'), 'First')
    await user.type(screen.getByLabelText('Second party'), 'Last')
    await user.click(screen.getByRole('button', { name: 'Create Document' }))

    await waitFor(() => {
      expect(mocks.createDocumentFromTemplate).toHaveBeenCalledWith({
        id: 'template-1',
        data: {
          name: 'Route Template',
          filename: 'Route Template.docx',
          values: { party: 'Last' },
        },
      })
    })
    expect(mocks.createDocument).not.toHaveBeenCalled()
    expect(screen.getByRole('status', { name: 'Current route' })).toHaveTextContent('/documents')
  })

  it('uses the edited HTML path when a source-backed template was changed', async () => {
    const user = userEvent.setup()
    mocks.queryResult = {
      data: template({ sourceStoragePath: 'templates/agreement.docx' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    renderPreview()

    await user.click(screen.getByRole('button', { name: 'Change editor content' }))
    await user.type(screen.getByLabelText('Party'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create Document' }))

    await waitFor(() => {
      expect(mocks.createDocument).toHaveBeenCalledWith({
        name: 'Route Template',
        filename: 'Route Template.docx',
        content_html: '<p>Manual editor change</p>',
      })
    })
    expect(mocks.createDocumentFromTemplate).not.toHaveBeenCalled()
  })

  it('shows real metadata and removes unsupported workspace and metadata controls', () => {
    mocks.queryResult = {
      data: template({
        name: 'Employment Terms',
        updatedAt: '2026-09-01T12:00:00.000Z',
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    renderPreview()

    expect(screen.getByText('Employment Terms')).toBeInTheDocument()
    expect(screen.getByText(/Updated Sep 1, 2026/)).toBeInTheDocument()
    expect(screen.queryByText('Yukon Pvt ltd')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save as Document' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Tabular view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Files' })).not.toBeInTheDocument()
  })

  it('requires API-defined required fields before creating a document', async () => {
    const user = userEvent.setup()
    mocks.queryResult = {
      data: template(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    renderPreview()

    await user.click(screen.getByRole('button', { name: 'Create Document' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Complete the required field: Party.')
    expect(mocks.createDocument).not.toHaveBeenCalled()
    expect(mocks.createDocumentFromTemplate).not.toHaveBeenCalled()
  })

  it('renders a retryable API error when no route-state template is available', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    mocks.queryResult = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    }
    renderPreview()

    expect(screen.getByRole('alert')).toHaveTextContent('Template could not be loaded.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('reports document creation failures without leaving the preview', async () => {
    const user = userEvent.setup()
    mocks.queryResult = {
      data: template(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }
    mocks.createDocument.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject(new Error('request failed')),
    }))
    renderPreview()

    await user.type(screen.getByLabelText('Party'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create Document' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Document could not be created. Try again.',
    )
    expect(screen.queryByRole('status', { name: 'Current route' })).not.toBeInTheDocument()
  })
})
