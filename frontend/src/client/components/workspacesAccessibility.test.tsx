import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import WorkspacesScreen from '../features/workspaces/WorkspacesFeature'

vi.mock('../features/workspaces/CreateWorkspaceModal', () => ({ default: () => null }))
vi.mock('../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}))
vi.mock('../store/api/drive/driveWorkspaceApi', () => ({
  useGetDriveWorkspacesQuery: () => ({
    data: [
      {
        id: 'workspace-1',
        owner_id: 'user-1',
        owner_name: 'Alex Morgan',
        name: 'Apollo',
        description: 'Client workspace',
        storage_used_bytes: 0,
        storage_quota_bytes: null,
        role: 'owner',
        file_count: 2,
        collaborators: [],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    isLoading: false,
  }),
  useUpdateDriveWorkspaceMutation: () => [vi.fn()],
  useDeleteDriveWorkspaceMutation: () => [vi.fn()],
}))
vi.mock('../store/api/drive/driveInvitationsApi', () => ({
  useInviteWorkspaceMemberMutation: () => [vi.fn()],
}))

describe('workspaces accessibility', () => {
  it('operates sorting and workspace actions from the keyboard without axe violations', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <WorkspacesScreen />
      </MemoryRouter>,
    )

    const sort = screen.getByRole('button', { name: 'Sort : Newest' })
    await user.click(sort)
    const oldest = screen.getByRole('menuitemradio', { name: 'Oldest' })
    expect(screen.getByRole('menuitemradio', { name: 'Newest' })).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
    await user.keyboard('{ArrowDown}')
    expect(oldest).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Sort : Oldest' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    const workspace = screen.getByRole('button', { name: 'Open Apollo' })
    for (let index = 0; index < 30 && document.activeElement !== workspace; index += 1) {
      await user.tab()
    }
    expect(workspace).toHaveFocus()
    await user.tab()
    const actions = screen.getByRole('button', { name: 'More actions for Apollo' })
    expect(actions).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Open Project' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(actions).toHaveFocus()

    await user.tab({ shift: true })
    expect(workspace).toHaveFocus()
    await user.keyboard('{Shift>}{F10}{/Shift}')
    expect(screen.getByRole('menuitem', { name: 'Open' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(workspace).toHaveFocus()

    await user.tab()
    expect(actions).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(screen.getByRole('dialog', { name: 'Rename Workspace' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Workspace name' })).toHaveFocus()
  })
})
