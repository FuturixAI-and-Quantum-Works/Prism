import { useState } from 'react'
import logoWhite from '../assets/logo-white.svg'
import { useAuth } from '../hooks/useAuth'

const ROLES = [
  { id: 'lawyer', label: 'Lawyer' },
  { id: 'in-house', label: 'In-house Counsel' },
  { id: 'student', label: 'Law Student' },
  { id: 'legal-ops', label: 'Legal Ops' },
]

const JURISDICTIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Germany',
  'France',
  'Singapore',
  'Other',
]

export default function ProfileOnboardingScreen() {
  const { user, completeProfile, isCompletingProfile, logout } = useAuth()
  const [fullName, setFullName] = useState(user?.displayName || '')
  const [professionalRole, setProfessionalRole] = useState('')
  const [country, setCountry] = useState('')
  const [organization, setOrganization] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    if (!fullName.trim() || !country || !organization.trim()) {
      setError('Name, country, and organization are required.')
      return
    }
    setError('')
    const result = await completeProfile({
      fullName: fullName.trim(),
      country,
      jurisdiction: country,
      organization: organization.trim(),
      professionalRole: professionalRole || null,
    })
    if (!result.success) setError(result.error || 'Failed to complete your profile.')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'grid',
        placeItems: 'center',
        padding: '20px',
      }}
    >
      <section
        style={{
          width: 'min(520px, 100%)',
          background: '#1B1B1B',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px 24px',
          display: 'grid',
          gap: '24px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <img src={logoWhite} alt="Prism" width="31" height="31" />
          <h1 style={{ fontSize: '24px', margin: '16px 0 8px' }}>Complete your profile</h1>
          <p style={{ color: '#D9D9D9', margin: 0 }}>
            Tell Prism enough to tailor your legal workspace.
          </p>
        </div>
        <label style={labelStyle}>
          Full name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            style={inputStyle}
          />
        </label>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: '8px' }}>Professional role</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                aria-pressed={professionalRole === role.id}
                onClick={() => setProfessionalRole(role.id)}
                style={{
                  ...roleButtonStyle,
                  borderColor: professionalRole === role.id ? '#F36A33' : 'transparent',
                }}
              >
                {role.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label style={labelStyle}>
          Country or jurisdiction
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            style={inputStyle}
          >
            <option value="">Select a country</option>
            {JURISDICTIONS.map((jurisdiction) => (
              <option key={jurisdiction} value={jurisdiction}>
                {jurisdiction}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Organization
          <input
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            style={inputStyle}
          />
        </label>
        {error && (
          <p role="alert" style={{ color: '#ff8a8a', margin: 0 }}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isCompletingProfile}
          style={buttonStyle}
        >
          {isCompletingProfile ? 'Setting up...' : 'Continue'}
        </button>
        <button type="button" onClick={() => void logout()} style={secondaryButtonStyle}>
          Sign out
        </button>
      </section>
    </main>
  )
}

const labelStyle = {
  display: 'grid',
  gap: '8px',
  color: '#D9D9D9',
} as const

const inputStyle = {
  width: '100%',
  height: '48px',
  boxSizing: 'border-box',
  border: 0,
  borderRadius: '12px',
  background: '#2B2B2B',
  color: '#F7F7F7',
  padding: '0 14px',
  fontSize: '16px',
} as const

const roleButtonStyle = {
  ...inputStyle,
  cursor: 'pointer',
  border: '2px solid transparent',
} as const

const buttonStyle = {
  height: '48px',
  border: 0,
  borderRadius: '12px',
  background: '#FFFFFF',
  color: '#272727',
  fontSize: '16px',
  cursor: 'pointer',
} as const

const secondaryButtonStyle = {
  ...buttonStyle,
  background: 'transparent',
  color: '#D9D9D9',
} as const
