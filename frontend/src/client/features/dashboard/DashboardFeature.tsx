import searchIcon from '../../assets/dashboard/search-icon.svg'
import Layout from '../../components/Layout'
import { DashboardAccessRequests } from './DashboardAccessRequests'
import { DashboardActivityPanels } from './DashboardActivityPanels'
import { DashboardAssistant } from './DashboardAssistant'
import { DashboardFeatureCards } from './DashboardFeatureCards'
import { dashboardFontFamily } from './dashboardModel'
import { DashboardReviewDialog } from './DashboardReviewDialog'
import { useDashboard } from './useDashboard'

export default function DashboardFeature() {
  const session = useDashboard()

  return (
    <Layout userName={session.userName} activePage="home">
      {({ onAddProject }) => (
        <>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: session.isMobile ? '16px' : '24px',
              background: '#F5F5F5',
              overflow: 'auto',
              marginRight: session.isMobile
                ? 0
                : session.aiPanelCollapsed
                  ? '48px'
                  : `${session.aiPanelWidth}px`,
              transition: 'margin-right 0.2s ease',
            }}
          >
            {session.actionError && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  color: '#B42318',
                  fontFamily: dashboardFontFamily,
                  fontSize: '13px',
                }}
              >
                {session.actionError}
              </p>
            )}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '8px',
                padding: '7px 10px',
                width: session.isMobile ? '100%' : '429px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <img src={searchIcon} alt="" style={{ width: '17px', height: '17px' }} />
              <input
                aria-label="Search dashboard"
                type="text"
                placeholder="Search for Contract, case, Anything"
                value={session.searchQuery}
                onChange={(event) => session.actions.setSearchQuery(event.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontFamily: dashboardFontFamily,
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.7px',
                  lineHeight: '16px',
                  width: '100%',
                  background: 'transparent',
                }}
              />
            </div>

            <DashboardFeatureCards session={session} />
            <DashboardActivityPanels session={session} />
            <DashboardAccessRequests session={session} />
          </div>

          <DashboardReviewDialog session={session} />
          <DashboardAssistant session={session} onAddProject={onAddProject} />
        </>
      )}
    </Layout>
  )
}
