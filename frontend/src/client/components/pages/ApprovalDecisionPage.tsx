import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import {
  useDecidePublicApprovalRequestMutation,
  useGetPublicApprovalRequestQuery,
} from '../../store/api/approvalsApi'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export default function ApprovalDecisionPage() {
  const { token = '' } = useParams<{ token: string }>()
  const {
    currentData: data,
    isLoading,
    isError,
    refetch,
  } = useGetPublicApprovalRequestQuery(token, {
    skip: !token,
  })
  const [decide, { isLoading: isSubmitting }] = useDecidePublicApprovalRequestMutation()
  const [note, setNote] = useState('')
  const [decisionStatus, setDecisionStatus] = useState<'approved' | 'rejected' | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const pendingTokenRef = useRef<string | null>(null)
  const tokenRef = useRef(token)
  tokenRef.current = token
  const currentStatus = decisionStatus ?? data?.request.status

  useEffect(() => {
    setNote('')
    setDecisionStatus(null)
    setDecisionError(null)
    pendingTokenRef.current = null
  }, [token])

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (!token || isSubmitting || pendingTokenRef.current === token) return
    const targetToken = token
    pendingTokenRef.current = targetToken
    setDecisionError(null)
    try {
      const result = await decide({
        token,
        status,
        decision_note: note.trim() || undefined,
      }).unwrap()
      if (result.status !== 'approved' && result.status !== 'rejected') {
        throw new Error('The server did not confirm the approval decision.')
      }
      if (tokenRef.current !== targetToken) return
      setDecisionStatus(result.status)
      void refetch()
    } catch (requestError) {
      if (tokenRef.current === targetToken) {
        setDecisionError(
          getRequestErrorMessage(requestError, 'Could not submit the approval decision.'),
        )
      }
    } finally {
      if (pendingTokenRef.current === targetToken) pendingTokenRef.current = null
    }
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
        aria-label="Approval decision"
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDEDED',
          borderRadius: '8px',
          padding: '28px',
        }}
      >
        {isLoading ? (
          <p role="status" style={{ margin: 0, color: '#6B6B6B' }}>
            Loading approval request...
          </p>
        ) : isError || !data ? (
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', color: '#272727' }}>
              Approval request unavailable
            </h1>
            <p style={{ color: '#6B6B6B' }}>This link may be expired or invalid.</p>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 8px', color: '#6B6B6B', fontSize: '13px' }}>
              {data.request.role_label}
            </p>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 510, color: '#272727' }}>
              Approval requested
            </h1>
            <p style={{ margin: '10px 0 0', color: '#454545', lineHeight: '22px' }}>
              {data.request.approver_name}, please review the requested changes and submit your
              decision.
            </p>

            <div
              style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {data.items.map((item) => (
                <div
                  key={item.id}
                  style={{ border: '1px solid #EDEDED', borderRadius: '8px', padding: '12px' }}
                >
                  <h2 style={{ margin: 0, color: '#272727', fontSize: '15px' }}>
                    {item.title || 'Approval item'}
                  </h2>
                  {item.reason && (
                    <p style={{ margin: '6px 0 0', color: '#6B6B6B', fontSize: '13px' }}>
                      {item.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <textarea
              aria-label="Decision note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Decision note"
              style={{
                width: '100%',
                minHeight: '96px',
                marginTop: '18px',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                padding: '12px',
                fontFamily,
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            {decisionError && (
              <p
                role="alert"
                style={{
                  margin: '12px 0 0',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  color: '#B42318',
                  fontSize: '13px',
                  lineHeight: '18px',
                }}
              >
                {decisionError}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginTop: '18px',
              }}
            >
              <span
                role="status"
                style={{
                  color:
                    currentStatus === 'pending'
                      ? '#8A5A00'
                      : currentStatus === 'approved'
                        ? '#059669'
                        : '#B42318',
                  fontWeight: 510,
                }}
              >
                Status: {currentStatus}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleDecision('rejected')}
                  disabled={currentStatus !== 'pending' || isSubmitting}
                  style={{
                    height: '40px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#FDECEC',
                    color: '#B42318',
                    padding: '0 16px',
                    fontFamily,
                    fontWeight: 510,
                    cursor: currentStatus !== 'pending' || isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('approved')}
                  disabled={currentStatus !== 'pending' || isSubmitting}
                  style={{
                    height: '40px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#272727',
                    color: '#FFFFFF',
                    padding: '0 16px',
                    fontFamily,
                    fontWeight: 510,
                    cursor: currentStatus !== 'pending' || isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Approve
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
