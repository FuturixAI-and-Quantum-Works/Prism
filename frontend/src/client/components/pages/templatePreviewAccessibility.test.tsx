import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import TemplatePreviewPage from '../../features/templatePreview/TemplatePreviewFeature'

vi.mock('../Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('../../features/editor/TiptapEditorFeature', () => ({
  default: () => <div />,
}))
vi.mock('../../features/templates/templatesApi', () => {
  const template = {
    id: 'template-1',
    userId: null,
    name: 'NDA Template',
    category: 'NDA',
    description: 'A mutual confidentiality agreement',
    contentHtml: '<p>{{party_name}}</p>',
    fields: [
      {
        id: 'party_name',
        label: 'Party name',
        type: 'text',
        required: true,
        section: 'Details',
      },
    ],
    sourceFilename: null,
    sourceStoragePath: null,
    sourceMimeType: null,
    sourceChecksum: null,
    sourceMetadata: null,
    isCreatedByUser: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  return {
    useGetTemplateQuery: () => ({
      data: template,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useCreateDocumentFromTemplateMutation: () => [vi.fn(), { isLoading: false }],
  }
})
vi.mock('../../features/documents/documentsApi', () => ({
  useCreateDocumentMutation: () => [vi.fn(), { isLoading: false }],
}))

describe('template preview accessibility', () => {
  it('keeps the real editor and disclosure keyboard accessible without fake workspace tabs', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter initialEntries={['/template-preview/template-1']}>
        <Routes>
          <Route path="/template-preview/:templateId" element={<TemplatePreviewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('region', { name: 'Template editor' })).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Files' })).not.toBeInTheDocument()

    const section = screen.getByRole('button', { name: 'Details' })
    expect(section).toHaveAttribute('aria-expanded', 'true')
    section.focus()
    await user.keyboard('{Enter}')
    expect(section).toHaveAttribute('aria-expanded', 'false')
    expect(await axe(container)).toHaveNoViolations()
  })
})
