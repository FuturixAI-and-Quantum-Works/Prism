import type { RiskFixWorkflowModel } from './useRiskFixWorkflow'
import closeIcon from '../../assets/document-editor/close-icon.svg'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { IconButton } from '../../components/ui/Button'

interface FixRiskDialogProps {
  model: RiskFixWorkflowModel
}

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export function FixRiskDialog({ model }: FixRiskDialogProps) {
  const {
    accept: handleAcceptRiskFix,
    changePrompt: setFixRiskPrompt,
    close: handleCloseFixRiskModal,
    reject: handleRejectRiskFix,
    run: handleFixRisk,
    state: {
      error: fixRiskError,
      open: fixRiskModalOpen,
      phase: fixRiskModalState,
      prompt: fixRiskPrompt,
      result: fixRiskEditResult,
      risk: selectedRiskToFix,
    },
  } = model

  return (
    <AccessibleDialog
      open={fixRiskModalOpen}
      onClose={handleCloseFixRiskModal}
      labelledBy="fix-risk-title"
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        width: '550px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          id="fix-risk-title"
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 510,
            color: '#272727',
            fontFamily,
          }}
        >
          Fix Risk
        </h3>
        <IconButton
          label="Close risk dialog"
          onClick={handleCloseFixRiskModal}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <img src={closeIcon} alt="" style={{ width: '20px', height: '20px' }} />
        </IconButton>
      </div>

      {selectedRiskToFix && (
        <div
          style={{
            padding: '12px',
            backgroundColor:
              selectedRiskToFix.severity === 'high'
                ? '#FEF2F2'
                : selectedRiskToFix.severity === 'medium'
                  ? '#FFFBEB'
                  : '#F5F5F5',
            borderRadius: '8px',
            borderLeft: `3px solid ${selectedRiskToFix.severity === 'high' ? '#DC2626' : selectedRiskToFix.severity === 'medium' ? '#D97706' : '#6B7280'}`,
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#272727', fontFamily }}>
              {selectedRiskToFix.title}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color:
                  selectedRiskToFix.severity === 'high'
                    ? '#DC2626'
                    : selectedRiskToFix.severity === 'medium'
                      ? '#D97706'
                      : '#6B7280',
                backgroundColor:
                  selectedRiskToFix.severity === 'high'
                    ? '#FEE2E2'
                    : selectedRiskToFix.severity === 'medium'
                      ? '#FEF3C7'
                      : '#F3F4F6',
                padding: '2px 6px',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              {selectedRiskToFix.severity}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#454545', margin: 0, fontFamily }}>
            {selectedRiskToFix.description}
          </p>
        </div>
      )}

      {fixRiskModalState === 'prompt' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="fix-risk-prompt"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                fontFamily,
              }}
            >
              Edit the prompt below to customize how the risk should be fixed:
            </label>
            <textarea
              id="fix-risk-prompt"
              value={fixRiskPrompt}
              onChange={(e) => setFixRiskPrompt(e.target.value)}
              style={{
                width: '100%',
                height: '150px',
                padding: '12px',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#454545',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily,
                lineHeight: '1.5',
              }}
            />
          </div>
          {fixRiskError && (
            <p
              role="alert"
              style={{ margin: '0 0 16px', fontSize: '13px', color: '#E53935', fontFamily }}
            >
              {fixRiskError}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={handleCloseFixRiskModal}
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
              Cancel
            </button>
            <button
              onClick={handleFixRisk}
              disabled={!fixRiskPrompt.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: fixRiskPrompt.trim() ? '#272727' : '#CCCCCC',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#FFFFFF',
                cursor: fixRiskPrompt.trim() ? 'pointer' : 'not-allowed',
                fontFamily,
              }}
            >
              Fix
            </button>
          </div>
        </>
      )}

      {fixRiskModalState === 'processing' && (
        <div role="status" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #EDEDED',
              borderTopColor: '#272727',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
          <p style={{ fontSize: '14px', color: '#454545', margin: 0, fontFamily }}>
            Analyzing and fixing the risk...
          </p>
        </div>
      )}

      {fixRiskModalState === 'result' && fixRiskEditResult && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                fontFamily,
              }}
            >
              Proposed Changes:
            </label>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px',
                border: '1px solid #EDEDED',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {fixRiskEditResult.annotations.length > 0 ? (
                fixRiskEditResult.annotations.map((annotation, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: annotation.kind === 'del' ? '#FEE2E2' : '#DCFCE7',
                      color: annotation.kind === 'del' ? '#DC2626' : '#166534',
                      textDecoration: annotation.kind === 'del' ? 'line-through' : 'none',
                      padding: '1px 2px',
                      borderRadius: '2px',
                      fontFamily,
                      fontSize: '13px',
                      lineHeight: '1.6',
                    }}
                  >
                    {annotation.text}
                  </span>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: '#666', margin: 0, fontFamily }}>
                  The document has been updated. Review the changes in the editor.
                </p>
              )}
            </div>
          </div>
          {fixRiskError && (
            <p
              role="alert"
              style={{ margin: '0 0 16px', fontSize: '13px', color: '#E53935', fontFamily }}
            >
              {fixRiskError}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={handleRejectRiskFix}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FEE2E2',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#DC2626',
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Reject
            </button>
            <button
              onClick={handleAcceptRiskFix}
              style={{
                padding: '10px 20px',
                backgroundColor: '#166534',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 510,
                color: '#FFFFFF',
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Accept
            </button>
          </div>
        </>
      )}
    </AccessibleDialog>
  )
}
