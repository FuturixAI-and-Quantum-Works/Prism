import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import LoginScreen from './LoginScreen'
import OnboardingScreen from './OnboardingScreen'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    sendOtp: vi.fn(() => Promise.resolve({ success: true })),
    verifyOtp: vi.fn(),
    initiateGoogleOAuth: vi.fn(),
    isSendingOtp: false,
    isVerifyingOtp: false,
  }),
}))

describe('authentication and onboarding accessibility', () => {
  it.each([
    ['login', <LoginScreen />],
    ['onboarding', <OnboardingScreen />],
  ])('has no automated violations on the %s surface', async (_name, surface) => {
    const { container } = render(<MemoryRouter>{surface}</MemoryRouter>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('limits login copy to behavior provided by the application', () => {
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Sign in to Prism' })).toBeInTheDocument()
    expect(screen.getByText('Access your legal documents and workspaces.')).toBeInTheDocument()
    expect(
      screen.queryByText(/encrypted|private|model training|traceable|verified legal intelligence/i),
    ).not.toBeInTheDocument()
  })

  it('does not claim an OTP was delivered', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: 'Get started' }))

    expect(
      await screen.findByText('Enter the 6-digit code for alex@example.com'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/we sent/i)).not.toBeInTheDocument()
  })

  it('uses factual product and loading copy on the splash screen', () => {
    render(<OnboardingScreen />)

    expect(screen.getByText('Draft, review, and organize legal documents.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading Prism...')
    expect(
      screen.queryByText(/ISO 27001|SOC 2|GDPR|encrypted|model training/i),
    ).not.toBeInTheDocument()
  })
})
