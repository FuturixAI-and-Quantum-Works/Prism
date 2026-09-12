import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import LibraryTemplatesScreen from '../features/templates/TemplateLibraryFeature'

vi.mock('../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))

vi.mock('../features/templates/templatesApi', () => ({
  useGetTemplatesQuery: () => ({
    data: [
      {
        id: 'template-1',
        userId: null,
        name: 'NDA Template',
        category: 'NDA',
        description: 'A mutual confidentiality agreement',
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
    ],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useUpdateTemplateMutation: () => [vi.fn()],
  useDeleteTemplateMutation: () => [vi.fn()],
}))

describe('template library accessibility', () => {
  it('opens a template dialog from the keyboard without automated violations', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <LibraryTemplatesScreen />
      </MemoryRouter>,
    )

    const template = screen.getByRole('button', { name: 'Open NDA Template' })
    const actions = screen.getByRole('button', { name: 'More actions for NDA Template' })
    for (let index = 0; index < 20 && document.activeElement !== template; index += 1) {
      await user.tab()
    }
    expect(template).toHaveFocus()
    await user.tab()
    expect(actions).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Preview' })).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
    await user.keyboard('{Escape}')
    expect(actions).toHaveFocus()

    await user.tab({ shift: true })
    expect(template).toHaveFocus()
    await user.keyboard('{Shift>}{F10}{/Shift}')
    expect(screen.getByRole('menuitem', { name: 'Preview' })).toHaveFocus()
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(template).toHaveFocus()

    await user.click(template)

    expect(screen.getByRole('dialog', { name: 'NDA Template' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close template preview' })).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(template).toHaveFocus()
  })
})
