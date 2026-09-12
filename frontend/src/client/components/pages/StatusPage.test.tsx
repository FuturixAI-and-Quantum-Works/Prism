import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StatusPage from './StatusPage'

const statusHooks = vi.hoisted(() => ({
  useGetSystemStatusQuery: vi.fn(),
  useGetStatusHistoryQuery: vi.fn(),
}))

vi.mock('../../store/api/statusApi', () => statusHooks)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('StatusPage', () => {
  it('renders authenticated status API results', () => {
    statusHooks.useGetSystemStatusQuery.mockReturnValue({
      data: {
        status: 'operational',
        message: 'All Systems Operational',
        lastUpdated: '2026-09-02T12:00:00.000Z',
        services: [
          {
            name: 'api',
            displayName: 'Prism API',
            status: 'operational',
            responseTimeMs: 42,
          },
        ],
      },
      isLoading: false,
    })
    statusHooks.useGetStatusHistoryQuery.mockReturnValue({
      data: {
        services: [
          {
            name: 'api',
            displayName: 'Prism API',
            uptimePercentage: 99.95,
            history: [{ date: '2026-09-02', status: 'operational' }],
          },
        ],
      },
      isLoading: false,
    })

    render(<StatusPage />)

    expect(screen.getByText('Prism Status')).toBeInTheDocument()
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument()
    expect(screen.getByText('Prism API')).toBeInTheDocument()
    expect(screen.getByText('99.95 % measured availability')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(statusHooks.useGetStatusHistoryQuery).toHaveBeenCalledWith(90)
  })

  it('names every uptime segment and reveals its status from the keyboard', async () => {
    const user = userEvent.setup()
    statusHooks.useGetSystemStatusQuery.mockReturnValue({
      data: {
        status: 'degraded',
        message: 'Some systems are degraded',
        services: [{ name: 'api', displayName: 'Prism API', status: 'degraded' }],
      },
      isLoading: false,
    })
    statusHooks.useGetStatusHistoryQuery.mockReturnValue({
      data: {
        services: [
          {
            name: 'api',
            displayName: 'Prism API',
            uptimePercentage: 98.5,
            history: [
              { date: '2026-09-01', status: 'degraded' },
              { date: '2026-09-02', status: 'operational' },
            ],
          },
        ],
      },
      isLoading: false,
    })

    const { container } = render(<StatusPage />)

    expect(
      screen.getByRole('list', { name: 'Prism API 90-day status history' }),
    ).toBeInTheDocument()
    const degradedDay = screen.getByRole('listitem', {
      name: 'Sep 1, 2026: Degraded',
    })
    const operationalDay = screen.getByRole('listitem', {
      name: 'Sep 2, 2026: Operational',
    })

    await user.tab()
    expect(degradedDay).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sep 1, 2026')
    expect(screen.getByRole('tooltip')).toHaveTextContent('Degraded')

    await user.tab()
    expect(operationalDay).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Operational')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps the loading state visible until both protected requests resolve', () => {
    statusHooks.useGetSystemStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    statusHooks.useGetStatusHistoryQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(<StatusPage />)

    expect(screen.getByText('Loading status...')).toBeInTheDocument()
  })

  it('does not claim an operational state when status data is unavailable', () => {
    statusHooks.useGetSystemStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    statusHooks.useGetStatusHistoryQuery.mockReturnValue({
      data: { services: [] },
      isLoading: false,
    })

    render(<StatusPage />)

    expect(screen.getByText('Status unavailable')).toBeInTheDocument()
    expect(screen.queryByText('All Systems Operational')).not.toBeInTheDocument()
  })

  it('does not report perfect availability without observations', () => {
    statusHooks.useGetSystemStatusQuery.mockReturnValue({
      data: {
        status: 'operational',
        message: 'All Systems Operational',
        services: [{ name: 'api', displayName: 'Prism API', status: 'operational' }],
      },
      isLoading: false,
    })
    statusHooks.useGetStatusHistoryQuery.mockReturnValue({
      data: {
        services: [
          {
            name: 'api',
            displayName: 'Prism API',
            uptimePercentage: 100,
            history: [],
          },
        ],
      },
      isLoading: false,
    })

    render(<StatusPage />)

    expect(screen.getByText('N/A')).toBeInTheDocument()
    expect(screen.queryByText(/100\.00 %/)).not.toBeInTheDocument()
  })
})
