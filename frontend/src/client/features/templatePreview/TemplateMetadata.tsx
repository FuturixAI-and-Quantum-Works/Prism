import calendarIcon from '../../assets/document-editor/calendar.svg'
import docIcon from '../../assets/document-editor/doc-icon.svg'

function formatUpdatedAt(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function TemplateMetadata({
  isEditorFocused,
  templateName,
  updatedAt,
}: {
  isEditorFocused: boolean
  templateName: string
  updatedAt: string
}) {
  const updatedAtLabel = formatUpdatedAt(updatedAt)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: isEditorFocused ? '0px' : '50px',
        padding: isEditorFocused ? '0 16px' : '6px 16px',
        backgroundColor: '#FFFFFF',
        borderBottom: isEditorFocused ? 'none' : '1px solid #EDEDED',
        overflow: 'hidden',
        transition: 'height 0.2s ease, padding 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', width: '19px', height: '19px' }}>
          <div
            style={{
              width: '19px',
              height: '19px',
              backgroundColor: '#D0D3D6',
              borderRadius: '4px',
              position: 'relative',
            }}
          >
            {[3.5, 8.5, 13.5].map((top) => (
              <div
                key={top}
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  left: '3.5px',
                  width: '12px',
                  height: '2px',
                  backgroundColor: '#FAFEFF',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>
          <img
            src={docIcon}
            alt=""
            style={{
              position: 'absolute',
              right: '-2px',
              bottom: '-2px',
              width: '11px',
              height: '11px',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.9px',
          }}
        >
          {templateName}
        </span>
        <div
          style={{
            backgroundColor: '#E8F4FE',
            borderRadius: '4px',
            padding: '2px 8px',
            marginLeft: '8px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 510,
              color: '#0AA2ED',
              letterSpacing: '-0.6px',
            }}
          >
            Template Preview
          </span>
        </div>
      </div>

      {updatedAtLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <img src={calendarIcon} alt="" style={{ width: '18px', height: '18px' }} />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
            }}
          >
            Updated {updatedAtLabel}
          </span>
        </div>
      )}
    </div>
  )
}
