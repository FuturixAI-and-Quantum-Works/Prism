import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TemplateCard } from './TemplateCard'
import { toTemplateCard, type TemplateCardModel } from './templateLibraryModel'
import type { Template } from './templatesApi'

function template(isCreatedByUser = false): Template {
  return {
    id: 'template-1',
    userId: isCreatedByUser ? 'user-1' : null,
    name: 'Service Agreement',
    category: 'Service',
    description: 'Service terms',
    contentHtml: '<p>Terms</p>',
    fields: [],
    sourceFilename: null,
    sourceStoragePath: null,
    sourceMimeType: null,
    sourceChecksum: null,
    sourceMetadata: null,
    isCreatedByUser,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current route">{location.pathname}</output>
}

function renderCard(
  card: TemplateCardModel,
  props: Partial<React.ComponentProps<typeof TemplateCard>>,
) {
  return render(
    <MemoryRouter initialEntries={['/assistant']}>
      <Routes>
        <Route
          path="/assistant"
          element={<TemplateCard template={card} apiTemplate={card.apiTemplate} {...props} />}
        />
        <Route path="/template-preview/:templateId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TemplateCard actions', () => {
  it('routes Preview by template ID when no preview callback is supplied', async () => {
    const user = userEvent.setup()
    const apiTemplate = template()
    const card = toTemplateCard(apiTemplate)
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    renderCard(card, { onClick: vi.fn() })

    const actions = screen.getByRole('button', { name: 'More actions for Service Agreement' })
    actions.focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('menuitem', { name: 'Preview' }))

    expect(screen.getByRole('status', { name: 'Current route' })).toHaveTextContent(
      '/template-preview/template-1',
    )
    expect(consoleLog).not.toHaveBeenCalled()
  })

  it('keeps the menu preview-only for system and user-owned records', async () => {
    const user = userEvent.setup()
    const systemTemplate = toTemplateCard(template())
    const rendered = renderCard(systemTemplate, {})

    const systemActions = screen.getByRole('button', {
      name: 'More actions for Service Agreement',
    })
    systemActions.focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()

    rendered.unmount()
    renderCard(toTemplateCard(template(true)), {})

    const userActions = screen.getByRole('button', { name: 'More actions for Service Agreement' })
    userActions.focus()
    await user.keyboard('{Enter}')
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Preview'])
  })
})
