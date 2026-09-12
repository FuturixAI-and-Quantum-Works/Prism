import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ComplianceListToolbar } from './ComplianceListToolbar'

describe('ComplianceListToolbar', () => {
  it('renders only document actions backed by handlers', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn()
    const onOpenProjectPicker = vi.fn()

    render(
      <ComplianceListToolbar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilters={[]}
        onToggleFilter={vi.fn()}
        onClearFilters={vi.fn()}
        sortOption="newest"
        onSortChange={vi.fn()}
        onUpload={onUpload}
        onOpenProjectPicker={onOpenProjectPicker}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Add A Document' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Upload Document' }))
    await user.click(screen.getByRole('button', { name: 'From Project' }))

    expect(onUpload).toHaveBeenCalledOnce()
    expect(onOpenProjectPicker).toHaveBeenCalledOnce()
  })
})
