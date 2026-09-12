import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './App'
import { store } from './store'
import { addProcess, clearAll } from './store/slices/pendingProcessesSlice'

const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('./hooks/useAuth', () => ({
  useAuth: useAuthMock,
}))
vi.mock('./hooks/useNavigationWarning', () => ({
  useNavigationWarning: () => undefined,
}))
vi.mock('./components/OnboardingScreen', () => ({
  default: () => <div>Session loading</div>,
}))
vi.mock('./components/LoginScreen', () => ({
  default: () => <div>Sign in</div>,
}))
vi.mock('./components/ProfileOnboardingScreen', () => ({
  default: () => <div>Complete profile</div>,
}))
vi.mock('./components/pages/StatusPage', () => ({
  default: () => <div>Service status</div>,
}))
vi.mock('./components/pages/ApprovalDecisionPage', () => ({
  default: () => <div>Approval decision</div>,
}))
vi.mock('./components/pages/ShareAcceptPage', () => ({
  default: () => <div>Share acceptance</div>,
}))
vi.mock('./components/pages/NotFoundPage', () => ({
  default: () => <div>Page not found</div>,
}))
vi.mock('./features/dashboard/DashboardFeature', () => ({
  default: () => <div>Authenticated dashboard</div>,
}))
vi.mock('./components/PendingProcessesIndicator', () => ({ default: () => null }))
vi.mock('./components/BackgroundChatIndicator', () => ({ default: () => null }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('authentication routing', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ status: 'loading', error: null })
    store.dispatch(clearAll())
  })

  afterEach(cleanup)

  it('keeps protected content hidden while the session loads', () => {
    renderAt('/')
    expect(screen.getByText('Session loading')).toBeInTheDocument()
    expect(screen.queryByText('Authenticated dashboard')).not.toBeInTheDocument()
  })

  it('routes signed-out users to login', async () => {
    useAuthMock.mockReturnValue({ status: 'signedOut', error: null })
    renderAt('/')
    expect(await screen.findByText('Sign in')).toBeInTheDocument()
  })

  it('routes incomplete profiles to onboarding', async () => {
    useAuthMock.mockReturnValue({ status: 'needsOnboarding', error: null })
    renderAt('/')
    expect(await screen.findByText('Complete profile')).toBeInTheDocument()
  })

  it('renders protected routes for authenticated users', async () => {
    useAuthMock.mockReturnValue({ status: 'authenticated', error: null })
    renderAt('/')
    expect(await screen.findByText('Authenticated dashboard')).toBeInTheDocument()
  })

  it('has no automated accessibility violations in the authenticated shell', async () => {
    useAuthMock.mockReturnValue({ status: 'authenticated', error: null })
    const { container } = renderAt('/')
    await screen.findByText('Authenticated dashboard')
    expect(await axe(container)).toHaveNoViolations()
  })

  it.each([
    ['/approval/token-1', 'Approval decision'],
    ['/share/accept/token-1', 'Share acceptance'],
  ])('keeps the public route %s available during session validation', async (path, content) => {
    renderAt(path)
    expect(await screen.findByText(content)).toBeInTheDocument()
  })

  it('requires an authenticated session for the status route', async () => {
    useAuthMock.mockReturnValue({ status: 'signedOut', error: null })
    renderAt('/status')

    expect(await screen.findByText('Sign in')).toBeInTheDocument()
    expect(screen.queryByText('Service status')).not.toBeInTheDocument()
  })

  it('renders status for authenticated users', async () => {
    useAuthMock.mockReturnValue({ status: 'authenticated', error: null })
    renderAt('/status')

    expect(await screen.findByText('Service status')).toBeInTheDocument()
  })

  it('renders an explicit not-found page', async () => {
    renderAt('/missing')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('clears session-scoped state when an authenticated session is lost', async () => {
    const dispatch = vi.spyOn(store, 'dispatch')
    useAuthMock.mockReturnValue({ status: 'authenticated', error: null })
    const view = renderAt('/')
    await screen.findByText('Authenticated dashboard')
    store.dispatch(
      addProcess({
        id: 'run-1',
        type: 'compliance',
        title: 'Compliance',
      }),
    )

    useAuthMock.mockReturnValue({ status: 'signedOut', error: null })
    view.rerender(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sign in')).toBeInTheDocument()
    expect(store.getState().pendingProcesses.processes).toEqual([])
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'api/resetApiState' }))
    dispatch.mockRestore()
  })
})
