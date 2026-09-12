import { getFileTypeConfig } from './artifactDisplay'
import type { ChatSourceResultArtifact } from './artifactTypes'

interface SourceArtifactsProps {
  sources: ChatSourceResultArtifact[]
}

export function SourceArtifacts({ sources }: SourceArtifactsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sources.map((source, index) => {
        const fileConfig = getFileTypeConfig(source.filename ?? 'document')
        return (
          <div
            key={`${source.filename ?? 'source'}-${index}`}
            style={{
              backgroundColor: '#F7F7F7',
              border: '1px solid #EDEDED',
              borderRadius: '12px',
              padding: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '21px',
                  height: '21px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                  <path
                    d="M10 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V17C1 17.5304 1.21071 18.0391 1.58579 18.4142C1.96086 18.7893 2.46957 19 3 19H13C13.5304 19 14.0391 18.7893 14.4142 18.4142C14.7893 18.0391 15 17.5304 15 17V6L10 1Z"
                    fill={fileConfig.bgColor}
                    stroke={fileConfig.color}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 1V6H15"
                    stroke={fileConfig.color}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '5px',
                    fontWeight: 700,
                    color: '#fff',
                    backgroundColor: fileConfig.color,
                    padding: '1px 2px',
                    borderRadius: '2px',
                    lineHeight: 1,
                  }}
                >
                  {fileConfig.shortLabel}
                </span>
              </div>
              <div
                style={{
                  backgroundColor: '#EDEDED',
                  border: '1px solid #EDEDED',
                  borderRadius: '28px',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.6px',
                  }}
                >
                  {fileConfig.shortLabel}
                </span>
              </div>
              {typeof source.score === 'number' && (
                <div
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: '#EDEDED',
                    borderRadius: '28px',
                    padding: '2px 6px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 510, color: '#999' }}>
                    {Math.round(source.score * 100)}%
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 0' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.7px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {source.filename ?? 'Source'}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  fontWeight: 510,
                  color: '#999',
                  letterSpacing: '-0.6px',
                }}
              >
                Prism will reference attached files during this conversation.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div
                  style={{
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    border: '2px solid #D9D9D9',
                    backgroundColor: 'transparent',
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.6px',
                  }}
                >
                  {source.source_type === 'drive_file' ? 'Drive' : 'Document'}
                </span>
              </div>
              <div
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: '#D9D9D9',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.6px',
                }}
              >
                {source.page_number ? `Page ${source.page_number}` : 'Referenced'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
