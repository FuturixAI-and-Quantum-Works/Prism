import { useEffect, useRef } from 'react'
import FileTypeIcon from '../../components/FileTypeIcon'
import { complianceFontFamily } from './compliancePresentation'

interface PrimaryDocumentPanelProps {
  documentName: string
  uploadTime: string
  isLoading: boolean
  onHeightChange: (height: number) => void
}

export function PrimaryDocumentPanel({
  documentName,
  uploadTime,
  isLoading,
  onHeightChange,
}: PrimaryDocumentPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) onHeightChange(entry.contentRect.height)
    })
    resizeObserver.observe(panelRef.current)
    return () => resizeObserver.disconnect()
  }, [isLoading, onHeightChange])

  return (
    <div
      style={{
        width: '50%',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #EDEDED',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '11px',
      }}
    >
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <span style={{ fontSize: '14px', color: '#999999' }}>Loading...</span>
        </div>
      ) : (
        <div
          ref={panelRef}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDEDED',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '11px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 6px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                fontFamily: complianceFontFamily,
              }}
            >
              Primary Document 01
            </p>
            <span
              aria-hidden="true"
              style={{
                background: 'none',
                padding: '4px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#999999',
                letterSpacing: '2px',
              }}
            >
              •••
            </span>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EDEDED',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                backgroundColor: '#F5F5F5',
                borderRadius: '11px',
                height: '100px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  width: '202px',
                  padding: '23px 21px',
                  boxShadow: '0px 0px 16px 0px rgba(248, 248, 248, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  position: 'absolute',
                  top: '17.5px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    fontWeight: 590,
                    color: '#454545',
                    letterSpacing: '-0.6px',
                    lineHeight: '21px',
                    fontFamily: complianceFontFamily,
                  }}
                >
                  {documentName}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '8px',
                    fontWeight: 510,
                    color: '#666666',
                    letterSpacing: '-0.4px',
                    lineHeight: '12px',
                    fontFamily: complianceFontFamily,
                  }}
                >
                  The agreement is generally structured well, but there are a few areas that should
                  be reviewed before signing. The lack of a clearly defined termination clause could
                  limit your flexibility, and the liability terms appear to be weighted more heavily
                  against you.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '25px',
                  height: '25px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <FileTypeIcon filename={documentName} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 510,
                    color: '#454545',
                    letterSpacing: '-0.8px',
                    lineHeight: '21px',
                    fontFamily: complianceFontFamily,
                  }}
                >
                  {documentName}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#666666',
                    letterSpacing: '-0.7px',
                    lineHeight: '16px',
                    fontFamily: complianceFontFamily,
                  }}
                >
                  {uploadTime}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
