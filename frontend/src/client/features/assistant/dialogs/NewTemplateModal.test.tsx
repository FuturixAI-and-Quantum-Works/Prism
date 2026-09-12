import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NewTemplateModal } from './NewTemplateModal'

describe('NewTemplateModal', () => {
  it('creates a blank template without presenting a fake upload mode', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(<NewTemplateModal onClose={vi.fn()} onCreate={onCreate} isCreating={false} />)

    expect(screen.queryByLabelText(/upload template documents/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/supports PDF|drag your documents/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Template Name *'), 'Mutual NDA')
    await user.type(screen.getByLabelText('Category *'), 'NDA')
    await user.type(screen.getByLabelText('Description'), 'A reusable mutual NDA')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Mutual NDA',
      category: 'NDA',
      description: 'A reusable mutual NDA',
      content_html: '<p></p>',
    })
  })
})
