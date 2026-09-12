import type { ExtractClausesToolState } from './chatToolEvents'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface ExtractClausesCardProps {
  model: ExtractClausesToolState | null
  onDismiss: () => void
}

export function ExtractClausesCard({ model, onDismiss }: ExtractClausesCardProps) {
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
                  Extracted Clauses
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#6B6B6B',
                    marginTop: '3px',
                  }}
                >
                  {model.clauses.length} clause
                  {model.clauses.length === 1 ? '' : 's'} found in {model.filename}
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
                  ? 'Extracting...'
                  : model.status === 'complete'
                    ? 'Complete'
                    : 'Error'}
              </span>
            </div>

            {model.clauses.length > 0 && (
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {model.clauses.map((clause, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#F7F7F7',
                      border: '1px solid #EDEDED',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#454545',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {clause.type.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '10px', color: '#666666' }}>{clause.location}</span>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 590,
                        color: '#272727',
                        marginBottom: '4px',
                      }}
                    >
                      {clause.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666666',
                        lineHeight: '18px',
                      }}
                    >
                      {clause.content}
                    </div>
                    {clause.keyTerms.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                          marginTop: '8px',
                        }}
                      >
                        {clause.keyTerms.map((term, termIdx) => (
                          <span
                            key={termIdx}
                            style={{
                              fontSize: '10px',
                              color: '#454545',
                              backgroundColor: '#F5F5F5',
                              borderRadius: '4px',
                              padding: '2px 6px',
                            }}
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
