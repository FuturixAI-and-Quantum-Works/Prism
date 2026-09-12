import courseIcon from '../../assets/analysis/course-icon.svg'
import warningIcon from '../../assets/analysis/warning-icon.svg'
import clockIcon from '../../assets/analysis/clock-icon.svg'
import { Tab, TabList } from '../../components/ui/Tabs'
import { ANALYSIS_TAB_METADATA, ANALYSIS_TAB_ORDER, type AnalysisTab } from './analysisModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const tabIcons: Record<AnalysisTab, string> = {
  summaries: courseIcon,
  risks: warningIcon,
  'clause-analysis': clockIcon,
}

export function AnalysisFilters({ activeTab }: { activeTab: AnalysisTab }) {
  const indicator = ANALYSIS_TAB_METADATA[activeTab].indicator

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '52px',
        backgroundColor: 'white',
        borderBottom: '1px solid #EDEDED',
        position: 'relative',
      }}
    >
      <TabList
        aria-label="Analysis views"
        style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '0 20px' }}
      >
        {ANALYSIS_TAB_ORDER.map((tabId) => {
          const tab = ANALYSIS_TAB_METADATA[tabId]
          return (
            <Tab
              key={tabId}
              value={tabId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '32px',
                padding: '10px 8px',
                backgroundColor: 'white',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <img src={tabIcons[tabId]} alt="" style={{ width: '16px', height: '16px' }} />
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                  lineHeight: '21px',
                  fontFamily,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </span>
            </Tab>
          )
        })}
      </TabList>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '0',
          left: indicator.left,
          width: indicator.width,
          height: '2px',
          backgroundColor: '#F36A33',
          transition: 'left 0.2s ease, width 0.2s ease',
        }}
      />
    </div>
  )
}
