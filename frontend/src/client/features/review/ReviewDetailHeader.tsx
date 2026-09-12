import reviewSearchIcon from '../../assets/review/search-icon.svg'
import reviewNewIcon from '../../assets/review/new-icon.svg'
import reviewTemplateIcon from '../../assets/review/template-icon.svg'
import reviewExportIcon from '../../assets/review/export-icon.svg'
import { reviewFontFamily as fontFamily } from './reviewModel'

interface ReviewDetailHeaderProps {
  title: string
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  columnCount: number
  documentCount: number
  generating: boolean
  selectedCount: number
  generationError: string
  onBack: () => void
  onAddColumn: () => void
  onManageDocuments: () => void
  onGenerate: () => void
  onCancel: () => void
  onClearResults: () => void
  onRemoveDocuments: () => void
}

export function ReviewDetailHeader({
  title,
  searchQuery,
  onSearchQueryChange,
  columnCount,
  documentCount,
  generating,
  selectedCount,
  generationError,
  onBack,
  onAddColumn,
  onManageDocuments,
  onGenerate,
  onCancel,
  onClearResults,
  onRemoveDocuments,
}: ReviewDetailHeaderProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          borderBottom: '1px solid #EDEDED',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onBack()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'transparent',
                color: '#6B6B6B',
                cursor: 'pointer',
                fontFamily,
                fontSize: '14px',
                fontWeight: 500,
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="3"
                  width="12"
                  height="10"
                  rx="1.5"
                  stroke="#797979"
                  strokeWidth="1.2"
                />
                <path d="M2 6H14" stroke="#797979" strokeWidth="1.2" />
                <path d="M5 6V13" stroke="#797979" strokeWidth="1.2" />
              </svg>
              Reviews
            </button>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: '#C4C4C4' }}
            >
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 4H13M3 8H10M3 12H7"
                  stroke="#454545"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.5px',
                  lineHeight: '21px',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '320px',
              height: '32px',
              backgroundColor: '#F7F7F7',
              borderRadius: '8px',
              padding: '0 10px',
            }}
          >
            <img
              src={reviewSearchIcon}
              alt=""
              style={{ width: '17px', height: '17px', transform: 'scaleX(-1)' }}
            />
            <input
              data-global-search
              type="text"
              aria-label="Search documents in this review"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search documents in this review"
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                color: '#454545',
                outline: 'none',
                fontFamily,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onAddColumn()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '36px',
              padding: '0 11px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            <img src={reviewNewIcon} alt="" style={{ width: '13px', height: '13px' }} />
            <span style={{ fontSize: '12px', fontWeight: 510, color: '#454545' }}>Column</span>
          </button>
          <button
            type="button"
            onClick={() => onManageDocuments()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '36px',
              padding: '0 11px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            <img src={reviewTemplateIcon} alt="" style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '12px', fontWeight: 510, color: '#454545' }}>Documents</span>
          </button>
          <button
            type="button"
            aria-live="polite"
            aria-busy={generating}
            onClick={generating ? onCancel : onGenerate}
            disabled={!generating && (columnCount === 0 || documentCount === 0)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '36px',
              padding: '0 11px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '9px',
              cursor:
                !generating && (columnCount === 0 || documentCount === 0) ? 'default' : 'pointer',
              opacity: !generating && (columnCount === 0 || documentCount === 0) ? 0.5 : 1,
              fontFamily,
            }}
          >
            <img src={reviewExportIcon} alt="" style={{ width: '18px', height: '18px' }} />
            <span style={{ fontSize: '12px', fontWeight: 510, color: '#454545' }}>
              {generating ? 'Cancel' : 'Run'}
            </span>
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div
          style={{
            height: '40px',
            borderBottom: '1px solid #EDEDED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '0 18px',
          }}
        >
          <span
            role="status"
            aria-live="polite"
            style={{ marginRight: 'auto', fontSize: '13px', color: '#797979' }}
          >
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={onClearResults}
            style={{
              height: '30px',
              border: 'none',
              borderRadius: '8px',
              padding: '0 10px',
              backgroundColor: '#F7F7F7',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            Clear results
          </button>
          <button
            type="button"
            onClick={onRemoveDocuments}
            style={{
              height: '30px',
              border: 'none',
              borderRadius: '8px',
              padding: '0 10px',
              backgroundColor: '#FDECEC',
              color: '#E53935',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            Remove documents
          </button>
        </div>
      )}

      {generationError && (
        <div
          role="alert"
          style={{
            minHeight: '36px',
            borderBottom: '1px solid #F4D7D7',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 18px',
            fontSize: '13px',
            lineHeight: '18px',
          }}
        >
          {generationError}
        </div>
      )}
    </>
  )
}
