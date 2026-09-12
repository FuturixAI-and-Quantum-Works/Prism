export interface AnalysisSummary {
  id: string
  documentName: string
  purpose: string
  mainPoints: string[]
}

export interface AnalysisRisk {
  id: string
  title: string
  category: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface AnalysisClause {
  id: string
  title: string
  documentName: string
  type: string
  content: string
}

export interface AnalysisData {
  summaries: AnalysisSummary[]
  risks: AnalysisRisk[]
  clauses: AnalysisClause[]
}

export type AnalysisTab = 'summaries' | 'risks' | 'clause-analysis'

export interface AnalysisPanelProps {
  workspaceId: string
  embedded?: boolean
  onClose?: () => void
  analysisData?: AnalysisData | null
  isLoading?: boolean
  error?: string | null
  onRequestAnalysis?: () => void
}

interface AnalysisTabMetadata {
  label: string
  indicator: {
    left: string
    width: string
  }
}

export const ANALYSIS_TAB_ORDER: readonly AnalysisTab[] = ['summaries', 'risks', 'clause-analysis']

export const ANALYSIS_TAB_METADATA: Readonly<Record<AnalysisTab, AnalysisTabMetadata>> = {
  summaries: {
    label: 'Summaries',
    indicator: { left: '20px', width: '128px' },
  },
  risks: {
    label: 'Risks',
    indicator: { left: '163px', width: '100px' },
  },
  'clause-analysis': {
    label: 'Clause Analysis',
    indicator: { left: '280px', width: '140px' },
  },
}

export type AnalysisResultState =
  | { kind: 'loading'; tab: AnalysisTab }
  | { kind: 'error'; tab: 'risks'; message: string }
  | { kind: 'unrequested'; tab: 'risks' }
  | { kind: 'analyzed-empty'; tab: AnalysisTab }
  | { kind: 'risks'; tab: 'risks'; risks: AnalysisRisk[]; highRiskCount: number }
  | { kind: 'summaries'; tab: 'summaries'; summaries: AnalysisSummary[] }
  | { kind: 'clauses'; tab: 'clause-analysis'; clauses: AnalysisClause[] }

interface AnalysisResultSelection {
  activeTab: AnalysisTab
  analysisData?: AnalysisData | null
  isLoading?: boolean
  error?: string | null
}

export function isAnalysisTab(value: string): value is AnalysisTab {
  return value === 'summaries' || value === 'risks' || value === 'clause-analysis'
}

export function countHighRisks(risks: readonly AnalysisRisk[]) {
  return risks.filter((risk) => risk.severity === 'high').length
}

export function formatHighRiskCount(count: number) {
  return String(count).padStart(2, '0')
}

export function selectAnalysisResultState({
  activeTab,
  analysisData,
  isLoading = false,
  error,
}: AnalysisResultSelection): AnalysisResultState {
  if (isLoading) {
    return { kind: 'loading', tab: activeTab }
  }

  if (activeTab === 'risks') {
    if (error) {
      return { kind: 'error', tab: activeTab, message: error }
    }

    const risks = analysisData?.risks || []
    if (risks.length === 0 && !analysisData) {
      return { kind: 'unrequested', tab: activeTab }
    }
    if (risks.length === 0) {
      return { kind: 'analyzed-empty', tab: activeTab }
    }
    return {
      kind: 'risks',
      tab: activeTab,
      risks,
      highRiskCount: countHighRisks(risks),
    }
  }

  if (activeTab === 'summaries') {
    const summaries = analysisData?.summaries || []
    if (summaries.length === 0) {
      return { kind: 'analyzed-empty', tab: activeTab }
    }
    return { kind: 'summaries', tab: activeTab, summaries }
  }

  const clauses = analysisData?.clauses || []
  if (clauses.length === 0) {
    return { kind: 'analyzed-empty', tab: activeTab }
  }
  return { kind: 'clauses', tab: activeTab, clauses }
}
