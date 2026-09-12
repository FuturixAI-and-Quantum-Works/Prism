import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BrowseFilesModal from '../features/files/BrowseFilesDialog'
import type { BrowseFile } from '../features/files/fileBrowserTypes'
import CreateDocumentModal from './CreateDocumentModal'
import CreateWorkspaceModal from '../features/workspaces/CreateWorkspaceModal'
import InsightDropdown from './InsightDropdown'

const workspaceApi = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  inviteWorkspaceMember: vi.fn(),
}))

vi.mock('../store/api/drive/driveWorkspaceApi', () => ({
  useCreateDriveWorkspaceMutation: () => [workspaceApi.createWorkspace, { isLoading: false }],
}))
vi.mock('../store/api/drive/driveInvitationsApi', () => ({
  useInviteWorkspaceMemberMutation: () => [workspaceApi.inviteWorkspaceMember],
}))

vi.mock('./FilePreviewModal', () => ({
  default: ({ file, onClose }: { file: { filename: string } | null; onClose: () => void }) =>
    file ? (
      <div role="dialog" aria-label={`Preview ${file.filename}`}>
        <button type="button" onClick={onClose}>
          Close preview
        </button>
      </div>
    ) : null,
}))

const browseFiles: BrowseFile[] = [
  {
    id: 'contract',
    name: 'Contract.pdf',
    type: 'pdf',
    date: 'Today',
    extension: 'pdf',
  },
]

function BrowseFilesHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open files
      </button>
      <BrowseFilesModal
        isOpen={open}
        files={browseFiles}
        onClose={() => setOpen(false)}
        onImport={vi.fn()}
        onUploadFolder={vi.fn()}
        onSelectFile={vi.fn()}
        onDeleteFiles={vi.fn()}
        onRenameFile={vi.fn()}
      />
    </>
  )
}

function CreateDocumentHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        New document
      </button>
      <CreateDocumentModal
        open={open}
        onClose={() => setOpen(false)}
        onCreateDocument={() => Promise.resolve({ id: 'document-1' })}
      />
    </>
  )
}

describe('scoped modal and popup accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workspaceApi.createWorkspace.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'workspace-1' }),
    })
    workspaceApi.inviteWorkspaceMember.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    })
  })

  it('supports keyboard selection and preview in the file browser', async () => {
    const user = userEvent.setup()
    const { container } = render(<BrowseFilesHarness />)
    const trigger = screen.getByRole('button', { name: 'Open files' })

    await user.click(trigger)
    expect(screen.getByRole('searchbox', { name: 'Search files' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    const file = screen.getByRole('button', { name: /Contract\.pdf/ })
    file.focus()
    await user.keyboard('{Enter}')
    expect(file).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(screen.getByRole('dialog', { name: 'Preview Contract.pdf' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Browse files' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(screen.getByRole('dialog', { name: 'Browse files' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits the create-document form from the keyboard and focuses the result', async () => {
    const user = userEvent.setup()
    const { container } = render(<CreateDocumentHarness />)

    await user.click(screen.getByRole('button', { name: 'New document' }))
    const name = screen.getByRole('textbox', { name: /Document name/i })
    expect(name).toHaveFocus()

    await user.type(name, 'Service agreement{Enter}')
    expect(await screen.findByRole('status')).toHaveTextContent('Document created successfully')
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('presents workspace invitations without unsupported access choices', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <CreateWorkspaceModal open onClose={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('textbox', { name: /Project name/i })).toHaveFocus()
    const basicTab = screen.getByRole('tab', { name: 'Enter basic info' })
    basicTab.focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Invite Members' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('textbox', { name: 'Invite Members' })).toHaveFocus()
    expect(screen.queryByRole('combobox', { name: 'Workspace access' })).not.toBeInTheDocument()
    expect(screen.queryByText(/All team members can access/i)).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('exposes insight disclosure state to keyboard users', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <InsightDropdown
        insight={{
          title: 'Missing termination right',
          category: 'High',
          description: 'The agreement has no termination right.',
          severity: 'high',
        }}
      />,
    )
    const disclosure = screen.getByRole('button', { name: /Missing termination right/ })

    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    disclosure.focus()
    await user.keyboard('{Enter}')

    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: /Missing termination right/ })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})
