import type { ChangeEvent, RefObject } from 'react'
import uploadBoxIcon from '../../../assets/upload-box-icon.svg'
import browseFilesIcon from '../../../assets/browse-files-icon.svg'
import { Button } from '../../../components/ui/Button'
import { panelFontFamily } from './panelStyles'

export function CompareFileInput({
  inputRef,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      aria-label="Upload documents for comparison"
      accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.webp,.bmp"
      onChange={onChange}
      multiple
      style={{ display: 'none' }}
    />
  )
}

export function CompareEmptyState({
  onBack,
  onBrowse,
}: {
  onBack: () => void
  onBrowse: () => void
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 0',
          marginBottom: '12px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="#454545"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
          }}
        >
          Back
        </span>
      </Button>

      <div
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: '#EDEDED',
              borderRadius: '66.92px',
              padding: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src={uploadBoxIcon} alt="Upload" style={{ width: '39px', height: '39px' }} />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: panelFontFamily,
                fontSize: '16px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                width: '219px',
              }}
            >
              No documents to compare
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: panelFontFamily,
                fontSize: '14px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
                width: '234px',
              }}
            >
              Add documents to start comparing key clauses and insights
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Button
              onClick={onBrowse}
              style={{
                width: '135px',
                height: '40px',
                backgroundColor: '#272727',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: panelFontFamily,
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#FFFFFF',
                  letterSpacing: '-0.7px',
                  lineHeight: '16px',
                }}
              >
                Upload
              </span>
            </Button>
            <Button
              onClick={onBrowse}
              style={{
                width: '135px',
                height: '40px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <img src={browseFilesIcon} alt="" style={{ width: '20px', height: '20px' }} />
              <span
                style={{
                  fontFamily: panelFontFamily,
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.7px',
                  lineHeight: '16px',
                }}
              >
                Browse Files
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
