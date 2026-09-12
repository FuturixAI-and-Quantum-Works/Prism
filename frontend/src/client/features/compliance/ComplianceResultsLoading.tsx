import type { ComplianceResultsTab } from './complianceModels'
import { complianceFontFamily } from './compliancePresentation'

export function ComplianceResultsLoading({ tab }: { tab: ComplianceResultsTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {tab === 'overview' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              style={{
                width: '234px',
                backgroundColor: '#F5F5F5',
                padding: '11px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <Shimmer width="100px" height="14px" />
              <Shimmer width="80px" height="36px" marginTop="4px" />
            </div>
          ))}
        </div>
      ) : tab === 'risk' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #EDEDED',
            }}
          >
            <Shimmer width="80px" height="20px" />
            <Shimmer width="60px" height="32px" borderRadius="6px" />
          </div>
          {[1, 2, 3].map((item) => (
            <div key={item} style={{ padding: '16px 0', borderBottom: '1px solid #EDEDED' }}>
              <Shimmer width="100%" height="16px" marginBottom="8px" />
              <Shimmer width="70%" height="16px" />
            </div>
          ))}
          <div style={{ marginTop: '16px' }}>
            <Shimmer width="100px" height="16px" marginBottom="12px" />
            {[1, 2, 3].map((item) => (
              <Shimmer key={item} width="90%" height="14px" marginBottom="10px" marginLeft="20px" />
            ))}
          </div>
        </div>
      ) : tab === 'clause' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                border: '1px solid #EDEDED',
              }}
            >
              <Shimmer width="24px" height="24px" borderRadius="50%" />
              <div style={{ flex: 1 }}>
                <Shimmer width="60%" height="14px" marginBottom="6px" />
                <Shimmer width="80%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'recommendations' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                padding: '16px',
                backgroundColor: '#F9F9F9',
                borderRadius: '10px',
                border: '1px solid #EDEDED',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <Shimmer width="50px" height="20px" borderRadius="10px" />
                <Shimmer width="150px" height="16px" />
              </div>
              <Shimmer width="100%" height="14px" marginBottom="6px" />
              <Shimmer width="85%" height="14px" />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: '1px solid #F3F3F3',
              }}
            >
              <Shimmer width="32px" height="32px" borderRadius="50%" />
              <div style={{ flex: 1 }}>
                <Shimmer width="70%" height="14px" marginBottom="4px" />
                <Shimmer width="40%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        role="status"
        aria-live="polite"
        style={{
          textAlign: 'center',
          padding: '20px',
          color: '#797979',
          fontSize: '14px',
          fontFamily: complianceFontFamily,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid #7C3AED',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          Analyzing documents...
        </span>
      </div>
    </div>
  )
}

function Shimmer({
  width,
  height,
  ...style
}: {
  width: string
  height: string
  borderRadius?: string
  marginTop?: string
  marginBottom?: string
  marginLeft?: string
}) {
  return <div className="skeleton-shimmer" style={{ width, height, ...style }} />
}
