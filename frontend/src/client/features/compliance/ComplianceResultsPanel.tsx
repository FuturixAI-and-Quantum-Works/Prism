import { useState } from 'react'
import overviewIcon from '../../assets/docs-compliance/overview-icon.svg'
import playCircleBoldIcon from '../../assets/docs-compliance/play-circle-bold-icon.svg'
import riskThreatsIcon from '../../assets/docs-compliance/risk-threats-icon.svg'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import type { ComplianceResultState } from './complianceResultsModel'
import type { ComplianceResultsTab } from './complianceModels'
import { complianceFontFamily } from './compliancePresentation'
import { ComplianceOverviewResults } from './ComplianceOverviewResults'
import {
  ActivityResults,
  ClauseValidationResults,
  RecommendationResults,
} from './ComplianceResultDetails'
import { ComplianceResultsLoading } from './ComplianceResultsLoading'
import { ComplianceRiskResults } from './ComplianceRiskResults'

interface ComplianceResultsPanelProps {
  results: ComplianceResultState
  isRunning: boolean
}

const resultTabs: Array<{
  id: ComplianceResultsTab
  label: string
  icon: string
  iconStyle?: React.CSSProperties
}> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: overviewIcon,
    iconStyle: { transform: 'rotate(180deg) scaleX(-1)' },
  },
  {
    id: 'risk',
    label: 'Risk Threats',
    icon: riskThreatsIcon,
    iconStyle: { transform: 'rotate(-90deg)', width: '12px', height: '12px' },
  },
  { id: 'clause', label: 'Clause Validation', icon: playCircleBoldIcon },
  { id: 'recommendations', label: 'Recommendations', icon: playCircleBoldIcon },
  { id: 'activity', label: 'Activity & Audit', icon: playCircleBoldIcon },
]

function isResultsTab(value: string): value is ComplianceResultsTab {
  return resultTabs.some((tab) => tab.id === value)
}

export function ComplianceResultsPanel({ results, isRunning }: ComplianceResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ComplianceResultsTab>('overview')

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (isResultsTab(value)) setActiveTab(value)
      }}
    >
      <section
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDEDED',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TabList
          aria-label="Compliance result views"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            padding: '5px 15px',
            borderBottom: '1px solid #EDEDED',
          }}
        >
          {resultTabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '32px',
                padding: '8px 14px',
                background: 'none',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                position: 'relative',
                fontFamily: complianceFontFamily,
              }}
            >
              <img
                src={tab.icon}
                alt=""
                style={{ width: '16px', height: '16px', ...tab.iconStyle }}
              />
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
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-5px',
                    left: '14px',
                    right: '14px',
                    height: '4px',
                    backgroundColor: '#F36A33',
                    borderRadius: '16px',
                  }}
                />
              )}
            </Tab>
          ))}
        </TabList>

        <TabPanel
          value={activeTab}
          aria-busy={isRunning}
          className="custom-scrollbar"
          style={{ padding: '12px 18px', flex: 1, overflowY: 'auto' }}
        >
          {isRunning ? (
            <ComplianceResultsLoading tab={activeTab} />
          ) : activeTab === 'overview' ? (
            <ComplianceOverviewResults results={results.summary} />
          ) : activeTab === 'risk' ? (
            <ComplianceRiskResults
              results={results.rules}
              insights={results.insights}
              isRunning={isRunning}
            />
          ) : activeTab === 'clause' ? (
            <ClauseValidationResults clauses={results.clauses} />
          ) : activeTab === 'recommendations' ? (
            <RecommendationResults recommendations={results.recommendations} />
          ) : (
            <ActivityResults activity={results.activity} />
          )}
        </TabPanel>
      </section>
    </Tabs>
  )
}
