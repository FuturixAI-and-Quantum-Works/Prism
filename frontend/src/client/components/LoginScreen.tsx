import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import logoWhite from '../assets/logo-white.svg'
import googleIcon from '../assets/google-icon.svg'
import editIcon from '../assets/edit-icon.svg'
import loadingSpinner from '../assets/loading-spinner.svg'
import { useAuth } from '../hooks/useAuth'

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export default function LoginScreen() {
  const [searchParams] = useSearchParams()
  const { sendOtp, verifyOtp, initiateGoogleOAuth, isSendingOtp, isVerifyingOtp } = useAuth()
  const [screen, setScreen] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState(
    searchParams.get('auth') === 'failed'
      ? 'Google sign-in failed. Please try again or use email.'
      : '',
  )
  const [resendTimer, setResendTimer] = useState(0)
  const [isInitiatingGoogle, setIsInitiatingGoogle] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = window.setTimeout(() => setResendTimer((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendTimer])

  const handleSendOtp = useCallback(async () => {
    const normalizedEmail = email.trim()
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Please enter a valid email address')
      return
    }
    setError('')
    const result = await sendOtp(normalizedEmail)
    if (!result.success) {
      setError(result.error || 'Failed to send OTP. Please try again.')
      return
    }
    setScreen('otp')
    setResendTimer(30)
    window.setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }, [email, sendOtp])

  const handleVerifyOtp = useCallback(
    async (otp: string) => {
      if (otp.length !== 6 || isVerifyingOtp) return
      setError('')
      const result = await verifyOtp(email, otp)
      if (!result.success) setError(result.error || 'Invalid OTP. Please try again.')
    },
    [email, isVerifyingOtp, verifyOtp],
  )

  useEffect(() => {
    void handleVerifyOtp(otpDigits.join(''))
  }, [handleVerifyOtp, otpDigits])

  const handleGoogleOAuth = async () => {
    setIsInitiatingGoogle(true)
    setError('')
    const result = await initiateGoogleOAuth()
    if (!result.success) {
      setError(result.error || 'Google sign-in failed. Please try again.')
      setIsInitiatingGoogle(false)
    }
  }

  const loading = isSendingOtp || isVerifyingOtp

  return (
    <main
      style={{
        backgroundColor: '#FFFFFF',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1B1B1B',
          borderRadius: '16px',
          padding: '28px 24px',
          width: 'min(520px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '30px',
          boxShadow: '0 4px 13px rgba(0, 0, 0, 0.2)',
        }}
      >
        <img src={logoWhite} alt="Prism" style={{ width: '31px', height: '31px' }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#FFFFFF', fontSize: '24px', margin: 0 }}>
            {screen === 'email' ? 'Sign in to Prism' : 'Verify your access'}
          </h1>
          <p style={{ color: '#D9D9D9', margin: '8px 0 0' }}>
            {screen === 'email'
              ? 'Access your legal documents and workspaces.'
              : `Enter the 6-digit code for ${email}`}
          </p>
        </div>

        {screen === 'email' ? (
          <div style={{ width: '100%', display: 'grid', gap: '12px' }}>
            <input
              aria-label="Email address"
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSendOtp()
              }}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={loading}
              style={primaryButtonStyle}
            >
              {isSendingOtp ? 'Sending...' : 'Get started'}
            </button>
            <div style={{ color: '#999999', textAlign: 'center', fontSize: '12px' }}>or</div>
            <button
              type="button"
              onClick={() => void handleGoogleOAuth()}
              disabled={isInitiatingGoogle}
              style={secondaryButtonStyle}
            >
              <img src={googleIcon} alt="" style={{ width: '24px', height: '24px' }} />
              {isInitiatingGoogle ? 'Redirecting...' : 'Continue with Google'}
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'grid', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '7px' }}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  aria-label={`OTP digit ${index + 1}`}
                  ref={(element) => {
                    inputRefs.current[index] = element
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, '').slice(-1)
                    setOtpDigits((current) =>
                      current.map((currentDigit, digitIndex) =>
                        digitIndex === index ? value : currentDigit,
                      ),
                    )
                    if (value && index < 5) inputRefs.current[index + 1]?.focus()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && !digit && index > 0) {
                      inputRefs.current[index - 1]?.focus()
                    }
                  }}
                  style={{ ...inputStyle, width: '52px', padding: '12px', textAlign: 'center' }}
                />
              ))}
            </div>
            <button
              type="button"
              disabled={loading || otpDigits.some((digit) => !digit)}
              onClick={() => void handleVerifyOtp(otpDigits.join(''))}
              style={primaryButtonStyle}
            >
              {isVerifyingOtp && (
                <img src={loadingSpinner} alt="" style={{ width: '18px', height: '18px' }} />
              )}
              {isVerifyingOtp ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => {
                setScreen('email')
                setOtpDigits(['', '', '', '', '', ''])
                setError('')
              }}
              style={linkButtonStyle}
            >
              <img src={editIcon} alt="" style={{ width: '16px', height: '16px' }} />
              Use another email
            </button>
            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={resendTimer > 0 || isSendingOtp}
              style={linkButtonStyle}
            >
              Resend{resendTimer > 0 ? ` in ${resendTimer}s` : ''}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" style={{ color: '#ff8a8a', fontSize: '14px', margin: 0 }}>
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

const inputStyle = {
  backgroundColor: '#2B2B2B',
  border: '1px solid transparent',
  borderRadius: '12px',
  height: '50px',
  padding: '15px',
  fontSize: '16px',
  color: '#F7F7F7',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily,
} as const

const primaryButtonStyle = {
  backgroundColor: '#FFFFFF',
  border: 'none',
  borderRadius: '12px',
  height: '48px',
  color: '#272727',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily,
} as const

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  backgroundColor: '#2B2B2B',
  color: '#F7F7F7',
} as const

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#D9D9D9',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontFamily,
} as const
