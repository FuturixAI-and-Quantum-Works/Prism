import type { SuggestEditToolState } from './chatToolEvents'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface SuggestEditCardProps {
  model: SuggestEditToolState | null
  onDismiss: () => void
}

export function SuggestEditCard({ model, onDismiss }: SuggestEditCardProps) {
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
                  Suggested Edits
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#797979',
                    marginTop: '3px',
                  }}
                >
                  {model.suggestions.length} suggestion
                  {model.suggestions.length === 1 ? '' : 's'} for {model.filename}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 590,
                  color: model.status === 'error' ? '#C83A2D' : '#6B5E00',
                  backgroundColor: model.status === 'error' ? '#FDECEA' : '#FFF8E1',
                  borderRadius: '999px',
                  padding: '5px 8px',
                }}
              >
                {model.status === 'error' ? 'Error' : 'Suggestions'}
              </span>
            </div>

            {model.suggestions.length > 0 && (
              <div
                style={{
                  maxHeight: '350px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {model.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #EDEDED',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor:
                            suggestion.priority === 'high'
                              ? '#E53935'
                              : suggestion.priority === 'medium'
                                ? '#F57C00'
                                : '#9E9E9E',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {suggestion.priority}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#454545',
                          backgroundColor: '#F5F5F5',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {suggestion.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666666',
                        marginBottom: '8px',
                        lineHeight: '18px',
                      }}
                    >
                      {suggestion.reason}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginBottom: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#C83A2D',
                          textDecoration: 'line-through',
                          wordBreak: 'break-word',
                          backgroundColor: '#FDECEA',
                          padding: '6px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {suggestion.find}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#2F7D32',
                          wordBreak: 'break-word',
                          backgroundColor: '#EAF6EC',
                          padding: '6px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {suggestion.replace}
                      </div>
                    </div>
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
