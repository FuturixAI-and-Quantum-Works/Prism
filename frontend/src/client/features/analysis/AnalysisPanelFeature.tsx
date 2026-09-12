import { useState, type CSSProperties } from 'react'
import { TabPanel, Tabs } from '../../components/ui/Tabs'
import { AnalysisFilters } from './AnalysisFilters'
import { AnalysisPresentation } from './AnalysisPresentation'
import {
  isAnalysisTab,
  selectAnalysisResultState,
  type AnalysisPanelProps,
  type AnalysisTab,
} from './analysisModel'

export default function AnalysisPanelFeature({
  workspaceId: _workspaceId,
  embedded = false,
  onClose,
  analysisData,
  isLoading = false,
  error,
  onRequestAnalysis,
}: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('risks')
  const [expandedRisk, setExpandedRisk] = useState<string | null>('1')
  const resultState = selectAnalysisResultState({
    activeTab,
    analysisData,
    isLoading,
    error,
  })

  const containerStyle: CSSProperties = embedded
    ? {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FAFAFA',
        border: '1px solid #EDEDED',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#FAFAFA',
        border: '1px solid #EDEDED',
      }

  const bounceAnimation = `
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-4px); }
    }
  `

  const handleTabChange = (value: string) => {
    if (isAnalysisTab(value)) {
      setActiveTab(value)
    }
  }

  const handleRiskToggle = (riskId: string) => {
    setExpandedRisk((currentRisk) => (currentRisk === riskId ? null : riskId))
  }

  return (
    <div role="complementary" aria-label="Document analysis" style={containerStyle}>
      <style>{bounceAnimation}</style>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <AnalysisFilters activeTab={activeTab} />
        <TabPanel value={activeTab} style={{ flex: 1, overflow: 'auto' }}>
          <AnalysisPresentation
            state={resultState}
            expandedRisk={expandedRisk}
            onToggleRisk={handleRiskToggle}
            onRequestAnalysis={onRequestAnalysis}
          />
        </TabPanel>
      </Tabs>

      {embedded && onClose && (
        <button
          type="button"
          aria-label="Close analysis"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
