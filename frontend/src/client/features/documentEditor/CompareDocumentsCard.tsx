import type { CompareDocumentsToolState } from './chatToolEvents'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface CompareDocumentsCardProps {
  model: CompareDocumentsToolState | null
  onDismiss: () => void
}

export function CompareDocumentsCard({ model, onDismiss }: CompareDocumentsCardProps) {
  return (
    <>
      {model && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #EDEDED',
              boxShadow: '0 1px 8px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 590,
                    color: '#272727',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Document Comparison
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#797979',
                    marginTop: '3px',
                  }}
                >
                  {model.docA.filename} vs {model.docB.filename}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 590,
                  color:
                    model.status === 'complete'
                      ? '#2F7D32'
                      : model.status === 'error'
                        ? '#C83A2D'
                        : '#454545',
                  backgroundColor:
                    model.status === 'complete'
                      ? '#EAF6EC'
                      : model.status === 'error'
                        ? '#FDECEA'
                        : '#F7F7F7',
                  borderRadius: '999px',
                  padding: '5px 8px',
                }}
              >
                {model.status === 'loading'
                  ? 'Comparing...'
                  : model.status === 'complete'
                    ? 'Complete'
                    : 'Error'}
              </span>
            </div>

            {model.status === 'complete' && (
              <>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#EAF6EC',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#2F7D32',
                      }}
                    >
                      {model.summary.added}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2F7D32' }}>Added</div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#FDECEA',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#C83A2D',
                      }}
                    >
                      {model.summary.removed}
                    </div>
                    <div style={{ fontSize: '11px', color: '#C83A2D' }}>Removed</div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#FFF8E1',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#F57C00',
                      }}
                    >
                      {model.summary.modified}
                    </div>
                    <div style={{ fontSize: '11px', color: '#F57C00' }}>Modified</div>
                  </div>
                </div>

                {model.differences.length > 0 && (
                  <div
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {model.differences.slice(0, 10).map((diff, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor:
                            diff.type === 'added'
                              ? '#EAF6EC'
                              : diff.type === 'removed'
                                ? '#FDECEA'
                                : '#FFF8E1',
                          fontSize: '12px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 590,
                            color: '#666666',
                            marginBottom: '4px',
                          }}
                        >
                          Line {diff.lineNumber} -{' '}
                          {diff.type.charAt(0).toUpperCase() + diff.type.slice(1)}
                        </div>
                        {diff.type === 'modified' ? (
                          <>
                            <div
                              style={{
                                color: '#C83A2D',
                                textDecoration: 'line-through',
                                wordBreak: 'break-word',
                              }}
                            >
                              {diff.before}
                            </div>
                            <div
                              style={{
                                color: '#2F7D32',
                                wordBreak: 'break-word',
                              }}
                            >
                              {diff.after}
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              color: diff.type === 'added' ? '#2F7D32' : '#C83A2D',
                              wordBreak: 'break-word',
                            }}
                          >
                            {diff.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {model.message && (
              <div style={{ fontSize: '12px', color: '#C83A2D' }}>{model.message}</div>
            )}

            <button
              onClick={onDismiss}
              style={{
                height: '34px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#454545',
                fontFamily,
                fontSize: '12px',
                fontWeight: 590,
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  )
}
