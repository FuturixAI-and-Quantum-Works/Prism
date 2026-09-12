import type { ProductShareRole } from '../documents/documentsApi'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { getAvatarColor, getInitials } from './commentsModel'
import type { DocumentSharingModel } from './useDocumentSharing'

interface SharingDialogProps {
  canManage: boolean
  model: DocumentSharingModel
}

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export function SharingDialog({ canManage, model }: SharingDialogProps) {
  const {
    changeRole: changeShareRole,
    data,
    email,
    error,
    invite: sendInvite,
    isFetching,
    isInviting,
    isRemoving,
    isUpdating,
    notice,
    open,
    remove: removeShare,
    role,
    setEmail,
    setOpen,
    setRole,
  } = model

  return (
    <AccessibleDialog
      open={open}
      onClose={() => setOpen(false)}
      labelledBy="share-document-title"
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        width: '560px',
        maxWidth: 'calc(100vw - 32px)',
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
          fontFamily,
        }}
      >
        Share document
      </h3>
      <p
        style={{
          margin: '0 0 18px',
          fontSize: '14px',
          color: '#666666',
          lineHeight: '20px',
          fontFamily,
        }}
      >
        Invite someone by email and choose whether they can edit or only view and comment.
      </p>

      {!canManage ? (
        <p style={{ margin: 0, fontSize: '14px', color: '#797979', fontFamily }}>
          Only the document owner or an admin can manage sharing.
        </p>
      ) : (
        <>
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
                  fontFamily,
                }}
              >
                Email address
              </label>
              <input
                id="document-share-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void sendInvite()
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
                  fontFamily,
                }}
              />
            </div>
            <button
              onClick={sendInvite}
              disabled={!email.trim() || isInviting}
              style={{
                height: '42px',
                padding: '0 18px',
                backgroundColor: email.trim() && !isInviting ? '#272727' : '#CCCCCC',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#FFFFFF',
                cursor: email.trim() && !isInviting ? 'pointer' : 'not-allowed',
                fontFamily,
                whiteSpace: 'nowrap',
              }}
            >
              {isInviting ? 'Sending...' : 'Send invite'}
            </button>
          </div>

          <div
            style={{
              display: 'inline-flex',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '14px',
            }}
          >
            {(['viewer', 'editor'] satisfies ProductShareRole[]).map((shareRole) => (
              <button
                key={shareRole}
                onClick={() => setRole(shareRole)}
                style={{
                  height: '32px',
                  minWidth: '86px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: role === shareRole ? '#272727' : 'transparent',
                  color: role === shareRole ? '#FFFFFF' : '#454545',
                  fontSize: '13px',
                  fontWeight: 510,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily,
                }}
              >
                {shareRole}
              </button>
            ))}
          </div>

          {notice && (
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
                fontFamily,
              }}
            >
              {notice}
            </div>
          )}
          {error && (
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
                fontFamily,
              }}
            >
              {error}
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
              <label style={{ fontSize: '14px', fontWeight: 510, color: '#454545', fontFamily }}>
                Collaborators
              </label>
              {isFetching && (
                <span style={{ fontSize: '12px', color: '#999999', fontFamily }}>Loading...</span>
              )}
            </div>
            {(data?.shares ?? []).length === 0 ? (
              <div
                style={{
                  padding: '14px',
                  border: '1px solid #EDEDED',
                  borderRadius: '8px',
                  color: '#797979',
                  fontSize: '13px',
                  fontFamily,
                }}
              >
                No accepted collaborators yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(data?.shares ?? []).map((share) => (
                  <div
                    key={share.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr 112px auto',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '10px',
                      border: '1px solid #EDEDED',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(share.user_id || share.email),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 510, color: '#FFFFFF' }}>
                        {getInitials(null, share.email)}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 510,
                          color: '#454545',
                          fontFamily,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {share.email}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999999', fontFamily }}>Accepted</div>
                    </div>
                    <select
                      aria-label={`Role for ${share.email}`}
                      value={share.role}
                      disabled={isUpdating}
                      onChange={(e) =>
                        void changeShareRole(share.id, e.target.value as ProductShareRole)
                      }
                      style={{
                        height: '34px',
                        border: '1px solid #EDEDED',
                        borderRadius: '8px',
                        padding: '0 8px',
                        backgroundColor: '#FFFFFF',
                        color: '#454545',
                        fontFamily,
                      }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={() => void removeShare(share.id)}
                      disabled={isRemoving}
                      style={{
                        height: '34px',
                        padding: '0 10px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: '#FDECEC',
                        color: '#C83A2D',
                        fontSize: '13px',
                        fontWeight: 510,
                        cursor: isRemoving ? 'not-allowed' : 'pointer',
                        fontFamily,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '18px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                fontFamily,
              }}
            >
              Pending invites
            </label>
            {(data?.pending_invitations ?? []).length === 0 ? (
              <div
                style={{
                  padding: '14px',
                  border: '1px solid #EDEDED',
                  borderRadius: '8px',
                  color: '#797979',
                  fontSize: '13px',
                  fontFamily,
                }}
              >
                No pending invites.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(data?.pending_invitations ?? []).map((invite) => (
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
                          fontFamily,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {invite.email}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999999', fontFamily }}>
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#797979',
                        textTransform: 'capitalize',
                        fontFamily,
                      }}
                    >
                      {invite.role}
                    </span>
                    <span style={{ fontSize: '12px', color: '#B7791F', fontFamily }}>Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '22px',
        }}
      >
        <button
          onClick={() => setOpen(false)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F7F7F7',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            cursor: 'pointer',
            fontFamily,
          }}
        >
          Close
        </button>
      </div>
    </AccessibleDialog>
  )
}
