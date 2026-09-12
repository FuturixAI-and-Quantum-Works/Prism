import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BrowseFilesDialog from './BrowseFilesDialog'
import type { BrowseFile } from './fileBrowserTypes'

vi.mock('../../components/FilePreviewModal', () => ({
  default: () => null,
}))

const files: BrowseFile[] = [
  { id: 'folder', name: 'Matter', type: 'folder', date: 'Today' },
  {
    id: 'nested',
    name: 'Nested agreement.pdf',
    type: 'pdf',
    date: 'Today',
    path: ['Matter'],
  },
  { id: 'root', name: 'Root agreement.docx', type: 'word', date: 'Yesterday' },
]

function renderBrowser(overrides: Partial<React.ComponentProps<typeof BrowseFilesDialog>> = {}) {
  const props: React.ComponentProps<typeof BrowseFilesDialog> = {
    isOpen: true,
    files,
    onClose: vi.fn(),
    onImport: vi.fn(),
    onUploadFolder: vi.fn(),
    onSelectFile: vi.fn(),
    onDeleteFiles: vi.fn(),
    onRenameFile: vi.fn(),
    ...overrides,
  }
  return { user: userEvent.setup(), props, ...render(<BrowseFilesDialog {...props} />) }
}

describe('BrowseFilesDialog behavior', () => {
  it('navigates folders and searches across the full file collection', async () => {
    const { user } = renderBrowser()

    await user.click(screen.getByRole('button', { name: 'Matter, folder' }))
    expect(screen.getByRole('button', { name: 'Nested agreement.pdf, file' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Root agreement.docx, file' }),
    ).not.toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search files' }), 'Root agreement')
    expect(screen.getByRole('button', { name: 'Root agreement.docx, file' })).toBeInTheDocument()
  })

  it('enforces the selection cap and confirms selected files in display order', async () => {
    const onSelectFile = vi.fn()
    const onClose = vi.fn()
    const { user } = renderBrowser({ maxSelection: 1, onSelectFile, onClose })

    const nested = screen.getByRole('button', { name: 'Nested agreement.pdf, file' })
    const root = screen.getByRole('button', { name: 'Root agreement.docx, file' })
    await user.click(nested)
    await user.click(root)

    expect(nested).toHaveAttribute('aria-pressed', 'true')
    expect(root).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Cut' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Confirm Selection/ }))

    expect(onSelectFile).toHaveBeenCalledTimes(1)
    expect(onSelectFile).toHaveBeenCalledWith(files[1])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps import and directory-upload actions available in the empty state', async () => {
    const onImport = vi.fn()
    const onUploadFolder = vi.fn()
    const { user } = renderBrowser({ files: [], onImport, onUploadFolder })

    await user.click(screen.getByRole('button', { name: 'Import' }))
    await user.click(screen.getByRole('button', { name: 'Upload Folder' }))

    expect(onImport).toHaveBeenCalledOnce()
    expect(onUploadFolder).toHaveBeenCalledOnce()
  })

  it('omits folder upload when no implementation is supplied', () => {
    renderBrowser({ files: [], onUploadFolder: undefined })

    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upload Folder' })).not.toBeInTheDocument()
  })

  it('preserves selection and reports rejected delete and rename actions', async () => {
    const onDeleteFiles = vi
      .fn()
      .mockRejectedValue({ data: { detail: 'Delete permission was denied.' } })
    const onRenameFile = vi.fn().mockRejectedValue({ data: { detail: 'Rename failed.' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue('Renamed.docx')
    const { user } = renderBrowser({ onDeleteFiles, onRenameFile })
    const root = screen.getByRole('button', { name: 'Root agreement.docx, file' })

    await user.click(root)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Delete permission was denied.')
    expect(root).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('dialog', { name: 'Browse files' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rename' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Rename failed.')
    expect(root).toHaveAttribute('aria-pressed', 'true')
  })

  it('waits for selection confirmation before clearing and closing', async () => {
    let resolveSelection!: () => void
    const onSelectFile = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSelection = resolve
        }),
    )
    const onClose = vi.fn()
    const { user } = renderBrowser({ onSelectFile, onClose })
    const root = screen.getByRole('button', { name: 'Root agreement.docx, file' })

    await user.click(root)
    await user.click(screen.getByRole('button', { name: /Confirm Selection/ }))

    expect(root).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Working/ })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()

    resolveSelection()
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })
})
