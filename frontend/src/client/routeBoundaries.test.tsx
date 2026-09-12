import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes, RouteErrorBoundary } from './App'

const mocks = vi.hoisted(() => {
  let resolveDashboard: () => void = () => undefined
  const dashboardReady = new Promise<void>((resolve) => {
    resolveDashboard = resolve
  })
  return {
    useAuth: vi.fn(),
    dashboardReady,
    resolveDashboard,
  }
})

vi.mock('./hooks/useAuth', () => ({ useAuth: mocks.useAuth }))
vi.mock('./hooks/useNavigationWarning', () => ({ useNavigationWarning: () => undefined }))
vi.mock('./components/OnboardingScreen', () => ({
  default: () => <div>Route loading</div>,
}))
vi.mock('./components/PendingProcessesIndicator', () => ({ default: () => null }))
vi.mock('./components/BackgroundChatIndicator', () => ({ default: () => null }))
vi.mock('./features/dashboard/DashboardFeature', async () => {
  await mocks.dashboardReady
  return { default: () => <div>Lazy dashboard</div> }
})

describe('route boundaries', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ status: 'authenticated', error: null })
  })

  it('shows the route loading boundary until a page chunk resolves', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Route loading')).toBeInTheDocument()
    mocks.resolveDashboard()
    expect(await screen.findByText('Lazy dashboard')).toBeInTheDocument()
  })

  it('replaces a route render failure with the error boundary', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    function BrokenPage(): never {
      throw new Error('broken route')
    }

    render(
      <RouteErrorBoundary resetKey="route-1">
        <BrokenPage />
      </RouteErrorBoundary>,
    )

    expect(screen.getByText('This page could not be loaded')).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
