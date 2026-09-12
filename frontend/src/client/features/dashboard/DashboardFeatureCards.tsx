import contractReviewIcon from '../../assets/dashboard/icons/sq-1.svg'
import summarizationSparkle from '../../assets/dashboard/icons/sq-2.svg'
import policySparkleTop from '../../assets/dashboard/icons/sq-3.svg'
import { Button } from '../../components/ui/Button'
import { dashboardFontFamily } from './dashboardModel'
import type { DashboardSession } from './useDashboard'

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path
        d="M4.64934 0.431379C4.79134 -0.143823 5.60905 -0.143823 5.75105 0.431379C6.26456 2.51151 7.8887 4.13565 9.96883 4.64916C10.544 4.79116 10.544 5.60886 9.96883 5.75086C7.8887 6.26438 6.26456 7.88852 5.75105 9.96865C5.60905 10.5438 4.79134 10.5438 4.64934 9.96865C4.13583 7.88852 2.51169 6.26438 0.431562 5.75086C-0.143639 5.60886 -0.143639 4.79116 0.431562 4.64916C2.51169 4.13565 4.13583 2.51151 4.64934 0.431379Z"
        fill="url(#paint0_linear_1_8523)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_1_8523"
          x1="5.01209"
          y1="12.2"
          x2="5.3883"
          y2="-1.79999"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#129FF6" />
          <stop offset="0.442308" stopColor="#A4DCFF" />
          <stop offset="0.951923" stopColor="#AE98FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const cards = [
  {
    id: 'contract-review',
    title: 'Contract Review',
    description: 'Detect risky clauses, missing obligations, and legal inconsistencies.',
    icon: contractReviewIcon,
    path: '/review',
  },
  {
    id: 'smart-summarization',
    title: 'Smart Summarization',
    description: 'Generate concise summaries for contracts, agreements, and policies.',
    icon: summarizationSparkle,
    path: '/assistant',
  },
  {
    id: 'policy-generation',
    title: 'Policy Generation',
    description:
      'Create AI-assisted drafts for compliance policies, agreements, and legal frameworks.',
    icon: policySparkleTop,
    path: '/assistant',
  },
]

type DashboardFeatureCardsSession = Pick<
  DashboardSession,
  'aiPanelCollapsed' | 'isMobile' | 'isTablet'
> & {
  actions: Pick<DashboardSession['actions'], 'openFeature'>
}

export function DashboardFeatureCards({ session }: { session: DashboardFeatureCardsSession }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: !session.aiPanelCollapsed ? 'space-between' : 'start',
          width: '100%',
        }}
      >
        {cards.map((card) => (
          <Button
            key={card.id}
            onClick={() => session.actions.openFeature(card.path)}
            style={{
              background: '#FFFFFF',
              border: '2px solid #EDEDED',
              borderRadius: '12px',
              padding: '27px 22px',
              width: session.isMobile
                ? '100%'
                : session.isTablet
                  ? 'calc(50% - 6px)'
                  : 'calc(33.33% - 8px)',
              minWidth: session.isMobile ? 'auto' : '280px',
              maxWidth: '330px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              textAlign: 'left',
              fontFamily: dashboardFontFamily,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = '#D0D0D0'
              event.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = '#EDEDED'
              event.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ position: 'relative', display: 'inline-grid' }}>
              <div style={{ left: 40, position: 'absolute' }}>
                <SparkleIcon />
              </div>
              <img
                src={card.icon}
                alt=""
                style={{ width: '45px', height: '45px', marginTop: '2px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p
                style={{
                  fontFamily: dashboardFontFamily,
                  fontSize: '18px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.9px',
                  lineHeight: '21px',
                  margin: 0,
                }}
              >
                {card.title}
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
                {card.description}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
