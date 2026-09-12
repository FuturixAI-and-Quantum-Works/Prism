import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'

const authMocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  sendVerificationOtp: vi.fn(),
  signInEmailOtp: vi.fn(),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../lib/authClient', () => ({
  authClient: {
    useSession: authMocks.useSession,
    emailOtp: { sendVerificationOtp: authMocks.sendVerificationOtp },
    signIn: {
      emailOtp: authMocks.signInEmailOtp,
      social: authMocks.signInSocial,
    },
    signOut: authMocks.signOut,
  },
}))

const identity = {
  id: 'user-1',
  email: 'lawyer@example.com',
  name: 'Ada Lawyer',
  image: null,
  emailVerified: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const profile = {
  displayName: 'Ada Lawyer',
  country: 'United Kingdom',
  jurisdiction: 'United Kingdom',
  organization: 'Prism Legal',
  professionalRole: 'lawyer',
  role: 'editor',
  onboardingCompleted: true,
}

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs out through Better Auth and refreshes the cookie session', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined)
    authMocks.useSession.mockReturnValue({
      data: { user: identity, session: { id: 'session-1' } },
      isPending: false,
      error: null,
      refetch,
    })
    authMocks.signOut.mockResolvedValue({ data: { success: true }, error: null })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(profile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    await act(async () => {
      await result.current.logout()
    })

    expect(authMocks.signOut).toHaveBeenCalledOnce()
    expect(refetch).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/user/profile',
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})
