import emptyBoxIllustration from '../../assets/documents/empty-box-illustration.svg'
import emptyEllipseLarge from '../../assets/documents/ellipse-large.svg'
import emptyEllipseSmall from '../../assets/documents/ellipse-small.svg'
import emptyUploadIcon from '../../assets/documents/upload-icon.svg'
import emptyTemplateIcon from '../../assets/documents/template-icon.svg'
import { Button } from '../../components/ui/Button'
import { documentFontFamily } from './documentLibraryModel'

interface DocumentsEmptyStateProps {
  onUpload: () => void
  onUseTemplate: () => void
  onCreateDocument: () => void
  isShared: boolean
}

export function DocumentsEmptyState({
  onUpload,
  onUseTemplate,
  onCreateDocument,
  isShared,
}: DocumentsEmptyStateProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: '500px',
      }}
    >
      <img
        src={emptyEllipseLarge}
        alt=""
        style={{
          position: 'absolute',
          width: '57px',
          height: '57px',
          top: '50%',
          left: '50%',
          transform: 'translate(37px, -100px)',
          opacity: 0.6,
        }}
      />
      <img
        src={emptyEllipseSmall}
        alt=""
        style={{
          position: 'absolute',
          width: '29px',
          height: '29px',
          top: '50%',
          left: '50%',
          transform: 'translate(17px, -120px)',
          opacity: 0.6,
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '134px',
          height: '90px',
          marginBottom: '16px',
        }}
      >
        <img src={emptyBoxIllustration} alt="" style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', left: '-20px', top: '35px' }}>
          {[0, 1, 2, 3].map((line) => (
            <div
              key={line}
              style={{
                width: '25px',
                height: '3px',
                backgroundColor: '#BDC1C6',
                marginBottom: line < 3 ? '7px' : undefined,
                borderRadius: '1px',
              }}
            />
          ))}
        </div>
        <div style={{ position: 'absolute', right: '-35px', top: '55px' }}>
          {[0, 1].map((line) => (
            <div
              key={line}
              style={{
                width: '48px',
                height: '3px',
                backgroundColor: '#BDC1C6',
                marginBottom: line === 0 ? '7px' : undefined,
                borderRadius: '1px',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
          textAlign: 'center',
          width: '429px',
          marginBottom: '16px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 590,
            color: '#454545',
            letterSpacing: '-0.24px',
            lineHeight: '32px',
            fontFamily: documentFontFamily,
          }}
        >
          No {isShared ? 'shared' : 'saved'} documents yet
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 510,
            color: '#8D8D8D',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            width: '301px',
            fontFamily: documentFontFamily,
          }}
        >
          Store reusable agreements, approved contracts, and important legal references in one
          place.
        </p>
      </div>

      {!isShared && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Button
            onClick={onUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '40px',
              padding: '10px',
              backgroundColor: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: documentFontFamily,
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.boxShadow = 'none'
            }}
          >
            <img src={emptyUploadIcon} alt="" style={{ width: '14px', height: '14px' }} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
                whiteSpace: 'nowrap',
              }}
            >
              Upload a Document
            </span>
          </Button>

          <Button
            onClick={onUseTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '40px',
              padding: '10px',
              backgroundColor: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: documentFontFamily,
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.boxShadow = 'none'
            }}
          >
            <img src={emptyTemplateIcon} alt="" style={{ width: '20px', height: '20px' }} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
                whiteSpace: 'nowrap',
              }}
            >
              Use a template
            </span>
          </Button>

          <Button
            onClick={onCreateDocument}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '42px',
              width: '148px',
              padding: '10px',
              backgroundColor: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: documentFontFamily,
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#000000',
                letterSpacing: '-0.28px',
                lineHeight: '32px',
                whiteSpace: 'nowrap',
              }}
            >
              Create Document
            </span>
          </Button>
        </div>
      )}
    </div>
  )
}
