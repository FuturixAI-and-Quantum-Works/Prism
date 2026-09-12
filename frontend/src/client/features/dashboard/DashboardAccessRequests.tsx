import planetDotTiny from '../../assets/dashboard/icons/empty-approvals.svg'
import { Button } from '../../components/ui/Button'
import { dashboardFontFamily, formatDashboardRelativeTime } from './dashboardModel'
import type { DashboardSession } from './useDashboard'

function PermissionPlanetIllustration() {
  return (
    <div style={{ position: 'relative', width: '150px', height: '120px' }}>
      <img src={planetDotTiny} alt="" />
    </div>
  )
}

export function DashboardAccessRequests({ session }: { session: DashboardSession }) {
  const { actionableItems, actions } = session

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        minHeight: actionableItems.length > 0 ? '150px' : '355px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {actionableItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {actionableItems.map((item, index) => {
            const createdAt = item.metadata?.createdAt
            const timeAgo =
              typeof createdAt === 'string' ? formatDashboardRelativeTime(new Date(createdAt)) : ''

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px 24px',
                  borderBottom: index < actionableItems.length - 1 ? '1px solid #F5F5F5' : 'none',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#E8E8E8',
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0,
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontFamily: dashboardFontFamily,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#272727',
                      letterSpacing: '-0.14px',
                      lineHeight: '24px',
                    }}
                  >
                    {item.title}
                  </span>
                  {timeAgo && (
                    <>
                      <span
                        style={{
                          fontFamily: dashboardFontFamily,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#6B6B6B',
                          letterSpacing: '-0.14px',
                          lineHeight: '24px',
                        }}
                      >
                        ·
                      </span>
                      <span
                        style={{
                          fontFamily: dashboardFontFamily,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#6B6B6B',
                          letterSpacing: '-0.14px',
                          lineHeight: '24px',
                        }}
                      >
                        {timeAgo}
                      </span>
                    </>
                  )}
                </div>

                {(item.status === 'pending' || item.status === 'viewed') && (
                  <Button
                    onClick={() => actions.openReviewItem(item)}
                    style={{
                      fontFamily: dashboardFontFamily,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#338CE4',
                      letterSpacing: '-0.14px',
                      lineHeight: '24px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                    }}
                  >
                    Review Access
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            maxWidth: '283px',
            textAlign: 'center',
            margin: 'auto',
          }}
        >
          <PermissionPlanetIllustration />
          <p
            style={{
              fontFamily: dashboardFontFamily,
              fontSize: '16px',
              fontWeight: 510,
              color: '#272727',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              margin: 0,
            }}
          >
            Everything is up to date.
          </p>
          <p
            style={{
              fontFamily: dashboardFontFamily,
              fontSize: '14px',
              fontWeight: 510,
              color: '#6B6B6B',
              letterSpacing: '-0.7px',
              lineHeight: '16px',
              margin: 0,
            }}
          >
            No pending access requests or permission changes detected.
          </p>
        </div>
      )}
    </div>
  )
}
