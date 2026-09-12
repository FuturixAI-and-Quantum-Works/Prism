import type { DocumentVersion } from '../documents/documentsApi'
import { type VersionComparisonRow, versionLabel } from './versionComparison'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

function formatVersionDate(value?: string | null) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function VersionComparisonTable({
  currentVersion,
  comparisons,
  loading,
  error,
  selectedVersionId,
  previousVersionCount,
  onSelectVersion,
  onRefresh,
}: {
  currentVersion: DocumentVersion | null
  comparisons: VersionComparisonRow[]
  loading: boolean
  error: string
  selectedVersionId: string | null
  previousVersionCount: number
  onSelectVersion: (versionId: string) => void
  onRefresh: () => void
}) {
  const selected =
    comparisons.find((row) => row.version.id === selectedVersionId) ?? comparisons[0] ?? null

  return (
    <div
      aria-busy={loading}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F8F9FA',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #EDEDED',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 590,
              color: '#272727',
              letterSpacing: '-0.4px',
            }}
          >
            Tabular version review
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#777', lineHeight: 1.4 }}>
            Comparing {previousVersionCount} previous saved version
            {previousVersionCount === 1 ? '' : 's'} against {versionLabel(currentVersion)}.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            height: '34px',
            padding: '0 14px',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            backgroundColor: loading ? '#F2F2F2' : '#FFFFFF',
            color: '#454545',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 510,
            fontFamily,
          }}
        >
          {loading ? 'Comparing...' : 'Refresh'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              height: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#777',
              fontSize: '14px',
            }}
          >
            Comparing saved versions...
          </div>
        ) : error ? (
          <div
            role="alert"
            style={{
              height: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B42318',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        ) : comparisons.length === 0 ? (
          <div
            style={{
              height: '260px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#777',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 590, color: '#454545' }}>
              No previous versions yet
            </div>
            <div style={{ fontSize: '13px' }}>
              Use "Save as a Version" after edits to build a comparison history.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <table
                aria-label="Saved version comparison"
                style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
              >
                <caption
                  style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                  }}
                >
                  Select a previous version to inspect its differences from the current version.
                </caption>
                <thead>
                  <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #EDEDED' }}>
                    {[
                      'Previous version',
                      'Saved',
                      'Source',
                      'Added',
                      'Removed',
                      'Changed',
                      'Lines',
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        style={{
                          padding: '11px 12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 590,
                          color: '#666',
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row) => {
                    const isSelected = selected?.version.id === row.version.id
                    return (
                      <tr
                        key={row.version.id}
                        style={{
                          borderBottom: '1px solid #F1F1F1',
                          backgroundColor: isSelected ? '#F5F5F5' : '#FFFFFF',
                        }}
                      >
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            fontWeight: 590,
                            color: '#272727',
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`Compare ${versionLabel(row.version)}`}
                            aria-pressed={isSelected}
                            onClick={() => onSelectVersion(row.version.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              color: 'inherit',
                              font: 'inherit',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {versionLabel(row.version)}
                          </button>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                          {formatVersionDate(row.version.created_at)}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: '#666',
                            textTransform: 'capitalize',
                          }}
                        >
                          {row.version.source.replace(/_/g, ' ')}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: '#047857',
                            fontWeight: 590,
                          }}
                        >
                          {row.added}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: '#B42318',
                            fontWeight: 590,
                          }}
                        >
                          {row.removed}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: '#B54708',
                            fontWeight: 590,
                          }}
                        >
                          {row.changed}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                          {row.previousLineCount} to {row.currentLineCount}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {selected && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDEDED',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 590, color: '#272727' }}>
                      Highlights from {versionLabel(selected.version)}
                    </h3>
                    <p style={{ margin: '4px 0 0', color: '#777', fontSize: '12px' }}>
                      Showing the first notable paragraph-level differences.
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#047857',
                        backgroundColor: '#ECFDF5',
                        borderRadius: '999px',
                        padding: '4px 8px',
                      }}
                    >
                      +{selected.added}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#B42318',
                        backgroundColor: '#FEF3F2',
                        borderRadius: '999px',
                        padding: '4px 8px',
                      }}
                    >
                      -{selected.removed}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#B54708',
                        backgroundColor: '#FFFAEB',
                        borderRadius: '999px',
                        padding: '4px 8px',
                      }}
                    >
                      {selected.changed} changed
                    </span>
                  </div>
                </div>

                {selected.samples.length === 0 ? (
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: '#F7F7F7',
                      borderRadius: '8px',
                      color: '#666',
                      fontSize: '13px',
                    }}
                  >
                    No paragraph-level differences were detected.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selected.samples.map((sample, index) => (
                      <div
                        key={`${sample.type}-${sample.lineNumber}-${index}`}
                        style={{
                          border: '1px solid #F1F1F1',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 10px',
                            backgroundColor: '#FAFAFA',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 590,
                              color: '#454545',
                              textTransform: 'capitalize',
                            }}
                          >
                            {sample.type}
                          </span>
                          <span style={{ fontSize: '12px', color: '#999' }}>
                            Paragraph {sample.lineNumber}
                          </span>
                        </div>
                        {sample.before && (
                          <div
                            style={{
                              padding: '10px',
                              borderTop: '1px solid #F1F1F1',
                              color: '#B42318',
                              fontSize: '13px',
                              lineHeight: 1.45,
                            }}
                          >
                            {sample.before}
                          </div>
                        )}
                        {sample.after && (
                          <div
                            style={{
                              padding: '10px',
                              borderTop: '1px solid #F1F1F1',
                              color: '#047857',
                              fontSize: '13px',
                              lineHeight: 1.45,
                            }}
                          >
                            {sample.after}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
