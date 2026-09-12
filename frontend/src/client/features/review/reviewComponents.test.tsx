import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddColumnDialog } from './AddColumnDialog'
import { ColumnEditMenu } from './ColumnEditMenu'
import { ReviewListToolbar } from './ReviewListToolbar'
import { ReviewTable } from './ReviewTable'
import type { ColumnConfig, ReviewDocument, TabularCell } from './reviewModel'

const project = {
  id: 'project-1',
  name: 'Apollo',
  cm_number: null,
  user_id: 'user-1',
  is_owner: true,
  document_count: 1,
  chat_count: 0,
  review_count: 1,
  created_at: '2026-09-01T12:00:00.000Z',
  updated_at: '2026-09-01T12:00:00.000Z',
}

const column: ColumnConfig = {
  id: 'risk',
  index: 0,
  name: 'Risk',
  prompt: 'Summarize risk',
  format: 'text',
  width: 250,
}

const document: ReviewDocument = {
  id: 'document-1',
  name: 'contract.pdf',
  type: 'pdf',
  date: '1 Sep 2026',
}

const cell: TabularCell = {
  id: 'cell-1',
  documentId: document.id,
  columnIndex: column.index,
  content: { summary: 'Uncapped liability', flag: 'red' },
  status: 'done',
}

describe('review presentation components', () => {
  it('moves focus into the column dialog and restores it on every close path', async () => {
    const user = userEvent.setup()
    render(<ColumnEditMenu column={column} onSave={vi.fn()} onDelete={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: 'Edit Risk column' })
    await user.click(trigger)
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    fireEvent.mouseDown(globalThis.document.body)
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('roves one format option tab stop and dismisses the listbox on Tab', async () => {
    const user = userEvent.setup()
    render(<AddColumnDialog isOpen existingCount={0} onClose={vi.fn()} onAdd={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Suggestions' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Output format' }))
    const textOption = screen.getByRole('option', { name: 'Text' })
    const percentageOption = screen.getByRole('option', { name: 'Percentage' })
    await waitFor(() => expect(textOption).toHaveFocus())
    expect(textOption).toHaveAttribute('tabindex', '0')
    expect(percentageOption).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{End}')
    expect(textOption).toHaveAttribute('tabindex', '-1')
    expect(percentageOption).toHaveAttribute('tabindex', '0')
    expect(percentageOption).toHaveFocus()
    await user.tab()
    expect(screen.queryByRole('listbox', { name: 'Output format' })).not.toBeInTheDocument()
  })

  it('roves one filter tab stop and dismisses on Tab or Escape', async () => {
    const user = userEvent.setup()
    const onProjectFilterChange = vi.fn()

    render(
      <ReviewListToolbar
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        projects={[project]}
        projectFilter="all"
        onProjectFilterChange={onProjectFilterChange}
        ownershipFilter="all"
        onOwnershipFilterChange={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Filters' })
    await user.click(trigger)
    const allProjects = screen.getByRole('menuitemradio', { name: 'All Projects' })
    const projectOption = screen.getByRole('menuitemradio', { name: 'Apollo' })
    const sharedOption = screen.getByRole('menuitemradio', { name: 'Shared with Me' })
    await waitFor(() => expect(allProjects).toHaveFocus())
    expect(allProjects).toHaveAttribute('tabindex', '0')
    expect(projectOption).toHaveAttribute('tabindex', '-1')

    await user.click(projectOption)
    expect(allProjects).toHaveAttribute('tabindex', '-1')
    expect(projectOption).toHaveAttribute('tabindex', '0')

    await user.keyboard('{Home}')
    await user.keyboard('{ArrowDown}')
    expect(allProjects).toHaveAttribute('tabindex', '-1')
    expect(projectOption).toHaveAttribute('tabindex', '0')
    expect(projectOption).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onProjectFilterChange).toHaveBeenCalledWith('project-1')

    await user.keyboard('{End}')
    expect(sharedOption).toHaveAttribute('tabindex', '0')
    expect(sharedOption).toHaveFocus()
    await user.keyboard('{Home}')
    expect(allProjects).toHaveAttribute('tabindex', '0')
    expect(allProjects).toHaveFocus()
    await user.tab()
    expect(screen.queryByRole('menu', { name: 'Review filters' })).not.toBeInTheDocument()

    await user.click(trigger)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('connects table selection, preview, and cell detail interactions', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    const onPreviewDocument = vi.fn()

    render(
      <ReviewTable
        loading={false}
        columns={[column]}
        documents={[document]}
        cells={[cell]}
        selectedDocIds={[]}
        onSelectionChange={onSelectionChange}
        onExpand={vi.fn()}
        onUpdateColumn={vi.fn()}
        onDeleteColumn={vi.fn()}
        onAddColumn={vi.fn()}
        onAddDocuments={vi.fn()}
        onPreviewDocument={onPreviewDocument}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Select contract.pdf' }))
    expect(onSelectionChange).toHaveBeenCalledWith(['document-1'])

    await user.click(screen.getByRole('button', { name: 'contract.pdf' }))
    expect(onPreviewDocument).toHaveBeenCalledWith(document)

    await user.click(screen.getByRole('button', { name: 'Show Risk result details' }))
    expect(screen.getByRole('dialog', { name: 'Risk result details' })).toBeInTheDocument()
  })
})
