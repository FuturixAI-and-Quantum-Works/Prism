import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { Button } from '../../components/ui/Button'
import { documentFontFamily } from './documentLibraryModel'
import type { DocumentsScreenSession } from './useDocumentsScreen'

export function DocumentShareDialog({ session }: { session: DocumentsScreenSession }) {
  const {
    selectedDocument,
    shareModalOpen,
    shareEmail,
    shareRole,
    shareError,
    shareNotice,
    documentSharesData,
    documentSharesLoading,
    isSendingInvite,
    isUpdatingShare,
    isRemovingShare,
    actions,
  } = session
  if (!selectedDocument) return null
  const shares = documentSharesData?.shares ?? []
  const pendingInvitations = documentSharesData?.pending_invitations ?? []

  return (
    <AccessibleDialog
      open={shareModalOpen}
      onClose={() => actions.setShareModalOpen(false)}
      labelledBy="share-document-title"
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        width: '560px',
        maxHeight: '84vh',
        overflowY: 'auto',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      <h3
        id="share-document-title"
        style={{
          margin: '0 0 8px',
          fontSize: '18px',
          fontWeight: 510,
          color: '#272727',
          fontFamily: documentFontFamily,
        }}
      >
        Share "{selectedDocument.title}"
      </h3>
      <p
        style={{
          margin: '0 0 18px',
          fontSize: '14px',
          color: '#666666',
          lineHeight: '20px',
          fontFamily: documentFontFamily,
        }}
      >
        Invite someone by email and choose whether they can edit or only view and comment.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '10px',
          alignItems: 'end',
          marginBottom: '14px',
        }}
      >
        <div>
          <label
            htmlFor="document-share-email"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              fontFamily: documentFontFamily,
            }}
          >
            Email address
          </label>
          <input
            id="document-share-email"
            type="email"
            value={shareEmail}
            onChange={(event) => actions.setShareEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void actions.submitShare()
              }
            }}
            placeholder="name@example.com"
            style={{
              width: '100%',
              height: '42px',
              padding: '0 12px',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#454545',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: documentFontFamily,
            }}
          />
        </div>
        <Button
          onClick={() => void actions.submitShare()}
          disabled={isSendingInvite || !shareEmail.trim()}
          style={{
            height: '42px',
            padding: '0 18px',
            backgroundColor: isSendingInvite || !shareEmail.trim() ? '#CCCCCC' : '#272727',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 510,
            color: '#FFFFFF',
            cursor: isSendingInvite || !shareEmail.trim() ? 'not-allowed' : 'pointer',
            fontFamily: documentFontFamily,
            whiteSpace: 'nowrap',
          }}
        >
          {isSendingInvite ? 'Sending...' : 'Send invite'}
        </Button>
      </div>

      <div
        role="group"
        aria-label="Invitation role"
        style={{
          display: 'inline-flex',
          border: '1px solid #EDEDED',
          borderRadius: '8px',
          padding: '3px',
          marginBottom: '14px',
        }}
      >
        {(['viewer', 'editor'] as const).map((role) => (
          <Button
            key={role}
            aria-pressed={shareRole === role}
            onClick={() => actions.setShareRole(role)}
            style={{
              height: '32px',
              minWidth: '86px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: shareRole === role ? '#272727' : 'transparent',
              color: shareRole === role ? '#FFFFFF' : '#454545',
              fontSize: '13px',
              fontWeight: 510,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: documentFontFamily,
            }}
          >
            {role}
          </Button>
        ))}
      </div>

      {shareNotice && (
        <div
          role="status"
          style={{
            marginBottom: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #EDEDED',
            backgroundColor: '#FAFAFA',
            color: '#454545',
            fontSize: '13px',
            lineHeight: '18px',
            fontFamily: documentFontFamily,
          }}
        >
          {shareNotice}
        </div>
      )}
      {shareError && (
        <div
          role="alert"
          style={{
            marginBottom: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #F2C7C3',
            backgroundColor: '#FFF7F6',
            color: '#C83A2D',
            fontSize: '13px',
            lineHeight: '18px',
            fontFamily: documentFontFamily,
          }}
        >
          {shareError}
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              fontFamily: documentFontFamily,
            }}
          >
            Collaborators
          </h4>
          {documentSharesLoading && (
            <span style={{ fontSize: '12px', color: '#999999', fontFamily: documentFontFamily }}>
              Loading...
            </span>
          )}
        </div>
        {shares.length === 0 ? (
          <div
            style={{
              padding: '14px',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              color: '#797979',
              fontSize: '13px',
              fontFamily: documentFontFamily,
            }}
          >
            No accepted collaborators yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shares.map((share) => (
              <div
                key={share.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 112px auto',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #EDEDED',
                  borderRadius: '8px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      fontFamily: documentFontFamily,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {share.email}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999999',
                      fontFamily: documentFontFamily,
                    }}
                  >
                    Accepted
                  </div>
                </div>
                <select
                  aria-label={`Role for ${share.email}`}
                  value={share.role}
                  disabled={isUpdatingShare}
                  onChange={(event) => {
                    const role = event.target.value
                    if (role === 'viewer' || role === 'editor') {
                      void actions.changeShareRole(share.id, role)
                    }
                  }}
                  style={{
                    height: '34px',
                    border: '1px solid #EDEDED',
                    borderRadius: '8px',
                    padding: '0 8px',
                    backgroundColor: '#FFFFFF',
                    color: '#454545',
                    fontFamily: documentFontFamily,
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <Button
                  onClick={() => void actions.removeShare(share.id)}
                  disabled={isRemovingShare}
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#FDECEC',
                    color: '#C83A2D',
                    fontSize: '13px',
                    fontWeight: 510,
                    cursor: isRemovingShare ? 'not-allowed' : 'pointer',
                    fontFamily: documentFontFamily,
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '18px' }}>
        <h4
          style={{
            marginTop: 0,
            display: 'block',
            marginBottom: '10px',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            fontFamily: documentFontFamily,
          }}
        >
          Pending invites
        </h4>
        {pendingInvitations.length === 0 ? (
          <div
            style={{
              padding: '14px',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              color: '#797979',
              fontSize: '13px',
              fontFamily: documentFontFamily,
            }}
          >
            No pending invites.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #EDEDED',
                  borderRadius: '8px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      fontFamily: documentFontFamily,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {invite.email}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999999',
                      fontFamily: documentFontFamily,
                    }}
                  >
                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#797979',
                    textTransform: 'capitalize',
                    fontFamily: documentFontFamily,
                  }}
                >
                  {invite.role}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#B7791F',
                    fontFamily: documentFontFamily,
                  }}
                >
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '22px',
        }}
      >
        <Button
          onClick={() => actions.setShareModalOpen(false)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F7F7F7',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            cursor: 'pointer',
            fontFamily: documentFontFamily,
          }}
        >
          Close
        </Button>
      </div>
    </AccessibleDialog>
  )
}
