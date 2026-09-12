import { AccessibleDialog } from '../../components/ui/AccessibleDialog'

interface ApprovalDialogsProps {
  approvalError: string
  approvalModalOpen: boolean
  canOwnerReviewApproval: boolean
  canSendForApproval: boolean
  handleOwnerApproveDocument: () => Promise<void>
  handleOwnerRejectDocument: () => Promise<void>
  handleSendForApproval: () => Promise<void>
  isSendingForApproval: boolean
  ownerApprovalError: string
  ownerApproveModalOpen: boolean
  ownerRejectAnchor: string
  ownerRejectModalOpen: boolean
  ownerRejectNote: string
  ownerRejectPage: string
  ownerRejectSection: string
  setApprovalModalOpen: (open: boolean) => void
  setOwnerApprovalError: (error: string) => void
  setOwnerApproveModalOpen: (open: boolean) => void
  setOwnerRejectAnchor: (value: string) => void
  setOwnerRejectModalOpen: (open: boolean) => void
  setOwnerRejectNote: (value: string) => void
  setOwnerRejectPage: (value: string) => void
  setOwnerRejectSection: (value: string) => void
}

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export function ApprovalDialogs({
  approvalError,
  approvalModalOpen,
  canOwnerReviewApproval,
  canSendForApproval,
  handleOwnerApproveDocument,
  handleOwnerRejectDocument,
  handleSendForApproval,
  isSendingForApproval,
  ownerApprovalError,
  ownerApproveModalOpen,
  ownerRejectAnchor,
  ownerRejectModalOpen,
  ownerRejectNote,
  ownerRejectPage,
  ownerRejectSection,
  setApprovalModalOpen,
  setOwnerApprovalError,
  setOwnerApproveModalOpen,
  setOwnerRejectAnchor,
  setOwnerRejectModalOpen,
  setOwnerRejectNote,
  setOwnerRejectPage,
  setOwnerRejectSection,
}: ApprovalDialogsProps) {
  return (
    <>
      {approvalModalOpen && (
        <AccessibleDialog
          open={approvalModalOpen}
          labelledBy="send-approval-title"
          onClose={() => {
            if (!isSendingForApproval) setApprovalModalOpen(false)
          }}
          contentStyle={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '460px',
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          <h3
            id="send-approval-title"
            style={{
              margin: '0 0 8px',
              fontSize: '18px',
              fontWeight: 510,
              color: '#272727',
              fontFamily,
            }}
          >
            Send for approval?
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
            This will lock the document for editing and move it to Pending Approval.
          </p>

          {approvalError && (
            <div
              role="alert"
              style={{
                marginBottom: '14px',
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
              {approvalError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setApprovalModalOpen(false)}
              disabled={isSendingForApproval}
              style={{
                padding: '10px 18px',
                backgroundColor: '#F7F7F7',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                cursor: isSendingForApproval ? 'not-allowed' : 'pointer',
                fontFamily,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSendForApproval()}
              disabled={!canSendForApproval || isSendingForApproval}
              style={{
                padding: '10px 18px',
                backgroundColor:
                  canSendForApproval && !isSendingForApproval ? '#272727' : '#CCCCCC',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#FFFFFF',
                cursor: canSendForApproval && !isSendingForApproval ? 'pointer' : 'not-allowed',
                fontFamily,
              }}
            >
              {isSendingForApproval ? 'Sending...' : 'Send for approval'}
            </button>
          </div>
        </AccessibleDialog>
      )}

      {ownerApproveModalOpen && (
        <AccessibleDialog
          open={ownerApproveModalOpen}
          labelledBy="approve-document-title"
          onClose={() => {
            if (!isSendingForApproval) setOwnerApproveModalOpen(false)
          }}
          contentStyle={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '460px',
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          <h3
            id="approve-document-title"
            style={{
              margin: '0 0 8px',
              fontSize: '18px',
              fontWeight: 510,
              color: '#272727',
              fontFamily,
            }}
          >
            Approve document?
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
            This will mark the document as Done and keep it locked from further edits.
          </p>

          {ownerApprovalError && (
            <div
              role="alert"
              style={{
                marginBottom: '14px',
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
              {ownerApprovalError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setOwnerApproveModalOpen(false)}
              disabled={isSendingForApproval}
              style={{
                padding: '10px 18px',
                backgroundColor: '#F7F7F7',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                cursor: isSendingForApproval ? 'not-allowed' : 'pointer',
                fontFamily,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleOwnerApproveDocument()}
              disabled={!canOwnerReviewApproval || isSendingForApproval}
              style={{
                padding: '10px 18px',
                backgroundColor:
                  canOwnerReviewApproval && !isSendingForApproval ? '#272727' : '#CCCCCC',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#FFFFFF',
                cursor: canOwnerReviewApproval && !isSendingForApproval ? 'pointer' : 'not-allowed',
                fontFamily,
              }}
            >
              {isSendingForApproval ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </AccessibleDialog>
      )}

      {ownerRejectModalOpen && (
        <AccessibleDialog
          open={ownerRejectModalOpen}
          labelledBy="reject-document-title"
          onClose={() => {
            if (!isSendingForApproval) {
              setOwnerRejectModalOpen(false)
              setOwnerApprovalError('')
            }
          }}
          contentStyle={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          <h3
            id="reject-document-title"
            style={{
              margin: '0 0 8px',
              fontSize: '18px',
              fontWeight: 510,
              color: '#272727',
              fontFamily,
            }}
          >
            Reject document?
          </h3>
          <p
            style={{
              margin: '0 0 14px',
              fontSize: '14px',
              color: '#666666',
              lineHeight: '20px',
              fontFamily,
            }}
          >
            Add a reason to send the document back for revision. You can also flag the page or
            section that needs work.
          </p>
          <textarea
            aria-label="Reason for rejection"
            value={ownerRejectNote}
            onChange={(e) => {
              setOwnerRejectNote(e.target.value)
              if (ownerApprovalError) setOwnerApprovalError('')
            }}
            placeholder="Reason for rejection"
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #EDEDED',
              borderRadius: '8px',
              resize: 'vertical',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#454545',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily,
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: '10px',
              marginTop: '12px',
            }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 590,
                color: '#666666',
                fontFamily,
              }}
            >
              Page
              <input
                type="number"
                min={1}
                value={ownerRejectPage}
                onChange={(e) => setOwnerRejectPage(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '10px 11px',
                  border: '1px solid #EDEDED',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#454545',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily,
                }}
              />
            </label>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 590,
                color: '#666666',
                fontFamily,
              }}
            >
              Section reference
              <input
                type="text"
                value={ownerRejectSection}
                onChange={(e) => setOwnerRejectSection(e.target.value)}
                placeholder="Clause 4.2, payment terms, etc."
                style={{
                  width: '100%',
                  padding: '10px 11px',
                  border: '1px solid #EDEDED',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#454545',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily,
                }}
              />
            </label>
          </div>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '12px',
              fontSize: '12px',
              fontWeight: 590,
              color: '#666666',
              fontFamily,
            }}
          >
            Anchor text
            <textarea
              value={ownerRejectAnchor}
              onChange={(e) => setOwnerRejectAnchor(e.target.value)}
              placeholder="Paste exact text from the section to help the editor jump there"
              rows={2}
              style={{
                width: '100%',
                padding: '10px 11px',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                resize: 'vertical',
                fontSize: '14px',
                lineHeight: '19px',
                color: '#454545',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily,
              }}
            />
          </label>

          {ownerApprovalError && (
            <div
              role="alert"
              style={{
                marginTop: '12px',
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
              {ownerApprovalError}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '18px',
            }}
          >
            <button
              onClick={() => {
                setOwnerRejectModalOpen(false)
                setOwnerApprovalError('')
              }}
              disabled={isSendingForApproval}
              style={{
                padding: '10px 18px',
                backgroundColor: '#F7F7F7',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                cursor: isSendingForApproval ? 'not-allowed' : 'pointer',
                fontFamily,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleOwnerRejectDocument()}
              disabled={!canOwnerReviewApproval || isSendingForApproval || !ownerRejectNote.trim()}
              style={{
                padding: '10px 18px',
                backgroundColor:
                  canOwnerReviewApproval && !isSendingForApproval && ownerRejectNote.trim()
                    ? '#C83A2D'
                    : '#CCCCCC',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#FFFFFF',
                cursor:
                  canOwnerReviewApproval && !isSendingForApproval && ownerRejectNote.trim()
                    ? 'pointer'
                    : 'not-allowed',
                fontFamily,
              }}
            >
              {isSendingForApproval ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </AccessibleDialog>
      )}
    </>
  )
}
