import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appRoutes } from '../../appRoutes'
import LoginScreen from '../LoginScreen'
import { useAuth } from '../../hooks/useAuth'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  useAcceptInvitationMutation,
  useGetInvitationQuery,
  type InvitationInfo,
} from '../../store/api/invitationsApi'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

function invitationDestination(invitation: Pick<InvitationInfo, 'resource_id' | 'resource_type'>) {
  if (!invitation.resource_id) return null
  switch (invitation.resource_type) {
    case 'document':
      return appRoutes.document(invitation.resource_id)
    case 'project':
      return appRoutes.project(invitation.resource_id)
    case 'workspace':
      return appRoutes.workspace(invitation.resource_id)
  }
}

export default function ShareAcceptPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError, refetch } = useGetInvitationQuery(token, { skip: !token })
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation()
  const [message, setMessage] = useState('')

  const destination = useMemo(() => {
    return data ? invitationDestination(data) : null
  }, [data])

  const handleAccept = async () => {
    if (!token || !data || isAccepting) return
    setMessage('')
    try {
      const accepted = await acceptInvitation({ kind: 'token', token }).unwrap()
      const acceptedDestination = invitationDestination(accepted)
      if (acceptedDestination) {
        navigate(acceptedDestination)
      } else {
        setMessage('Invitation accepted, but its destination is unavailable.')
      }
    } catch (error) {
      setMessage(getRequestErrorMessage(error, 'Could not accept this invitation.'))
      refetch()
    }
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F9F9F9',
        fontFamily,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDEDED',
          borderRadius: '8px',
          padding: '28px',
        }}
      >
        {isLoading ? (
          <p role="status" style={{ margin: 0, color: '#797979' }}>
            Loading invitation...
          </p>
        ) : isError || !data ? (
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', color: '#272727' }}>
              Invitation unavailable
            </h1>
            <p style={{ color: '#797979', lineHeight: '22px' }}>
              This link may be expired, revoked, or invalid.
            </p>
          </div>
        ) : (
          <>
            <p
              style={{
                margin: '0 0 8px',
                color: '#6B6B6B',
                fontSize: '13px',
                textTransform: 'capitalize',
              }}
            >
              {data.resource_type} invitation
            </p>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 510, color: '#272727' }}>
              Accept access to {data.resource_name}
            </h1>
            <p style={{ margin: '10px 0 0', color: '#454545', lineHeight: '22px' }}>
              You were invited as {data.role === 'editor' ? 'an Editor' : 'a Viewer'}.
            </p>

            {data.status !== 'pending' && (
              <div
                role="status"
                style={{
                  marginTop: '18px',
                  padding: '12px',
                  border: '1px solid #EDEDED',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '8px',
                  color: '#454545',
                  fontSize: '14px',
                }}
              >
                Status: {data.status}
              </div>
            )}

            {message && (
              <div
                role="alert"
                style={{
                  marginTop: '18px',
                  padding: '12px',
                  border: '1px solid #F2C7C3',
                  backgroundColor: '#FFF7F6',
                  borderRadius: '8px',
                  color: '#C83A2D',
                  fontSize: '14px',
                }}
              >
                {message}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '24px',
              }}
            >
              {data.status === 'accepted' && destination && (
                <button
                  type="button"
                  onClick={() => navigate(destination)}
                  style={{
                    height: '40px',
                    border: '1px solid #272727',
                    borderRadius: '8px',
                    backgroundColor: '#272727',
                    color: '#FFFFFF',
                    padding: '0 16px',
                    fontFamily,
                    cursor: 'pointer',
                  }}
                >
                  Open
                </button>
              )}
              {data.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isAccepting}
                  style={{
                    height: '40px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: !isAccepting ? '#272727' : '#CCCCCC',
                    color: '#FFFFFF',
                    padding: '0 16px',
                    fontFamily,
                    fontWeight: 510,
                    cursor: !isAccepting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isAccepting ? 'Accepting...' : 'Accept invite'}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
