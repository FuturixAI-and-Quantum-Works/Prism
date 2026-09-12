import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import LibraryPanel from './LibraryPanel'

describe('side panel accessibility', () => {
  it('operates the library panel from the keyboard', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onItemSelect = vi.fn()
    const { container } = render(
      <LibraryPanel open sidebarCollapsed={false} onClose={onClose} onItemSelect={onItemSelect} />,
    )

    const templates = screen.getByRole('button', { name: 'Templates' })
    await user.click(templates)

    expect(onItemSelect).toHaveBeenCalledWith('templates')
    expect(onClose).toHaveBeenCalledOnce()
    expect(await axe(container)).toHaveNoViolations()
  })
})
