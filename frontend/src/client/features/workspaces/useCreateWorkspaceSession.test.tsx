import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreateWorkspaceSession } from './useCreateWorkspaceSession'

const api = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  inviteWorkspaceMember: vi.fn(),
}))

vi.mock('../../store/api/drive/driveWorkspaceApi', () => ({
  useCreateDriveWorkspaceMutation: () => [api.createWorkspace, { isLoading: false }],
}))

vi.mock('../../store/api/drive/driveInvitationsApi', () => ({
  useInviteWorkspaceMemberMutation: () => [api.inviteWorkspaceMember],
}))

let currentPath = ''

function LocationCapture() {
  currentPath = useLocation().pathname
  return null
}

function Router({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <LocationCapture />
      {children}
    </MemoryRouter>
  )
}

describe('useCreateWorkspaceSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentPath = ''
    api.createWorkspace.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'workspace-1' }),
    })
    api.inviteWorkspaceMember.mockImplementation(({ email }: { email: string }) => ({
      unwrap: () =>
        email === 'rejected@example.com'
          ? Promise.reject({ data: { detail: 'Invitation request was rejected.' } })
          : Promise.resolve({
              delivery: {
                email,
                status: 'suppressed',
                error: 'Email delivery is not configured.',
              },
            }),
    }))
  })

  it('reports rejected and undelivered invitations without claiming success', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useCreateWorkspaceSession({ onClose }), {
      wrapper: Router,
    })

    act(() => {
      result.current.actions.setWorkspaceName('Apollo')
      result.current.actions.openAccessStep()
      result.current.actions.setEmailInput('rejected@example.com')
    })
    act(() => result.current.actions.addInvite())
    act(() => result.current.actions.setEmailInput('suppressed@example.com'))
    act(() => result.current.actions.addInvite())
    await act(async () => result.current.actions.create())

    expect(result.current.step).toBe('access')
    expect(result.current.fields.invitationFailures).toEqual([
      {
        email: 'rejected@example.com',
        message: 'Invitation request was rejected.',
      },
      {
        email: 'suppressed@example.com',
        message: 'Email delivery is not configured.',
      },
    ])
    expect(result.current.fields.error).toBe(
      'Workspace created, but 2 invitations could not be delivered.',
    )

    await act(async () => result.current.actions.create())
    expect(api.createWorkspace).toHaveBeenCalledOnce()

    act(() => result.current.actions.continueWithoutFailedInvitations())
    expect(onClose).toHaveBeenCalledOnce()
    expect(currentPath).toBe('/workspaces/workspace-1')
  })

  it('blocks duplicate workspace submissions while creation is pending', async () => {
    let resolveWorkspace!: (workspace: { id: string }) => void
    api.createWorkspace.mockReturnValue({
      unwrap: () =>
        new Promise<{ id: string }>((resolve) => {
          resolveWorkspace = resolve
        }),
    })
    const { result } = renderHook(() => useCreateWorkspaceSession({ onClose: vi.fn() }), {
      wrapper: Router,
    })

    let firstRequest!: Promise<void>
    act(() => {
      firstRequest = result.current.actions.create()
      void result.current.actions.create()
    })

    expect(api.createWorkspace).toHaveBeenCalledOnce()
    expect(result.current.fields.isCreating).toBe(true)
    resolveWorkspace({ id: 'workspace-1' })
    await act(async () => firstRequest)
    expect(result.current.step).toBe('success')
  })

  it('ignores a completed creation after the dialog is closed', async () => {
    let resolveWorkspace!: (workspace: { id: string }) => void
    api.createWorkspace.mockReturnValue({
      unwrap: () =>
        new Promise<{ id: string }>((resolve) => {
          resolveWorkspace = resolve
        }),
    })
    const onClose = vi.fn()
    const { result } = renderHook(() => useCreateWorkspaceSession({ onClose }), {
      wrapper: Router,
    })

    let request!: Promise<void>
    act(() => {
      result.current.actions.setWorkspaceName('Apollo')
      request = result.current.actions.create()
    })
    act(() => result.current.actions.close())
    resolveWorkspace({ id: 'workspace-1' })
    await act(async () => request)

    expect(onClose).toHaveBeenCalledOnce()
    expect(result.current.step).toBe('basic')
    expect(result.current.fields.workspaceName).toBe('')
    expect(result.current.fields.error).toBeNull()
    expect(currentPath).toBe('/')
  })
})
