import { describe, expect, it } from 'vitest'
import {
  countHighRisks,
  formatHighRiskCount,
  selectAnalysisResultState,
  type AnalysisData,
  type AnalysisResultState,
  type AnalysisRisk,
} from './analysisModel'

const completeAnalysis: AnalysisData = {
  summaries: [
    {
      id: 'summary-1',
      documentName: 'Agreement.pdf',
      purpose: 'Vendor agreement',
      mainPoints: ['Renews annually'],
    },
  ],
  risks: [
    {
      id: 'risk-1',
      title: 'Unlimited liability',
      category: 'Liability',
      description: 'The liability cap is missing.',
      severity: 'high',
    },
  ],
  clauses: [
    {
      id: 'clause-1',
      title: 'Termination',
      documentName: 'Agreement.pdf',
      type: 'Termination',
      content: 'Either party may terminate immediately.',
    },
  ],
}

const emptyAnalysis: AnalysisData = {
  summaries: [],
  risks: [],
  clauses: [],
}

type Selection = Parameters<typeof selectAnalysisResultState>[0]

describe('selectAnalysisResultState', () => {
  const precedenceCases: {
    name: string
    selection: Selection
    expectedKind: AnalysisResultState['kind']
  }[] = [
    {
      name: 'loading wins over risk errors and results',
      selection: {
        activeTab: 'risks',
        analysisData: completeAnalysis,
        isLoading: true,
        error: 'Analysis failed',
      },
      expectedKind: 'loading',
    },
    {
      name: 'loading wins over summary results and errors',
      selection: {
        activeTab: 'summaries',
        analysisData: completeAnalysis,
        isLoading: true,
        error: 'Analysis failed',
      },
      expectedKind: 'loading',
    },
    {
      name: 'loading wins over clause results and errors',
      selection: {
        activeTab: 'clause-analysis',
        analysisData: completeAnalysis,
        isLoading: true,
        error: 'Analysis failed',
      },
      expectedKind: 'loading',
    },
    {
      name: 'risk errors win over available results',
      selection: {
        activeTab: 'risks',
        analysisData: completeAnalysis,
        error: 'Analysis failed',
      },
      expectedKind: 'error',
    },
    {
      name: 'risk errors win over missing results',
      selection: {
        activeTab: 'risks',
        analysisData: null,
        error: 'Analysis failed',
      },
      expectedKind: 'error',
    },
    {
      name: 'risk errors win over analyzed-empty results',
      selection: {
        activeTab: 'risks',
        analysisData: emptyAnalysis,
        error: 'Analysis failed',
      },
      expectedKind: 'error',
    },
    {
      name: 'undefined risk data is unrequested',
      selection: { activeTab: 'risks' },
      expectedKind: 'unrequested',
    },
    {
      name: 'null risk data is unrequested',
      selection: { activeTab: 'risks', analysisData: null },
      expectedKind: 'unrequested',
    },
    {
      name: 'present but empty risk data is analyzed-empty',
      selection: { activeTab: 'risks', analysisData: emptyAnalysis },
      expectedKind: 'analyzed-empty',
    },
    {
      name: 'risk data produces risk results',
      selection: { activeTab: 'risks', analysisData: completeAnalysis },
      expectedKind: 'risks',
    },
    {
      name: 'undefined summary data is analyzed-empty despite errors',
      selection: { activeTab: 'summaries', error: 'Analysis failed' },
      expectedKind: 'analyzed-empty',
    },
    {
      name: 'null summary data is analyzed-empty despite errors',
      selection: { activeTab: 'summaries', analysisData: null, error: 'Analysis failed' },
      expectedKind: 'analyzed-empty',
    },
    {
      name: 'present but empty summary data is analyzed-empty despite errors',
      selection: {
        activeTab: 'summaries',
        analysisData: emptyAnalysis,
        error: 'Analysis failed',
      },
      expectedKind: 'analyzed-empty',
    },
    {
      name: 'summary data produces results despite errors',
      selection: {
        activeTab: 'summaries',
        analysisData: completeAnalysis,
        error: 'Analysis failed',
      },
      expectedKind: 'summaries',
    },
    {
      name: 'undefined clause data is analyzed-empty despite errors',
      selection: { activeTab: 'clause-analysis', error: 'Analysis failed' },
      expectedKind: 'analyzed-empty',
    },
    {
      name: 'null clause data is analyzed-empty despite errors',
      selection: {
        activeTab: 'clause-analysis',
        analysisData: null,
        error: 'Analysis failed',
      },
      expectedKind: 'analyzed-empty',
    },
    {
      name: 'present but empty clause data is analyzed-empty despite errors',
      selection: {
        activeTab: 'clause-analysis',
        analysisData: emptyAnalysis,
        error: 'Analysis failed',
      },
      expectedKind: 'analyzed-empty',
    },
    {
      name: 'clause data produces results despite errors',
      selection: {
        activeTab: 'clause-analysis',
        analysisData: completeAnalysis,
        error: 'Analysis failed',
      },
      expectedKind: 'clauses',
    },
    {
      name: 'an empty error does not replace risk results',
      selection: {
        activeTab: 'risks',
        analysisData: completeAnalysis,
        error: '',
      },
      expectedKind: 'risks',
    },
  ]

  it.each(precedenceCases)('$name', ({ selection, expectedKind }) => {
    expect(selectAnalysisResultState(selection).kind).toBe(expectedKind)
  })

  it('preserves the risk error message', () => {
    expect(
      selectAnalysisResultState({
        activeTab: 'risks',
        analysisData: completeAnalysis,
        error: 'Analysis service unavailable',
      }),
    ).toEqual({
      kind: 'error',
      tab: 'risks',
      message: 'Analysis service unavailable',
    })
  })

  it('preserves every risk in source order while counting only high severity', () => {
    const risks: AnalysisRisk[] = [
      { ...completeAnalysis.risks[0], id: 'low-1', severity: 'low' },
      { ...completeAnalysis.risks[0], id: 'high-1', severity: 'high' },
      { ...completeAnalysis.risks[0], id: 'medium-1', severity: 'medium' },
      { ...completeAnalysis.risks[0], id: 'high-2', severity: 'high' },
    ]

    const state = selectAnalysisResultState({
      activeTab: 'risks',
      analysisData: { ...emptyAnalysis, risks },
    })

    expect(state.kind).toBe('risks')
    if (state.kind !== 'risks') return
    expect(state.risks).toBe(risks)
    expect(state.risks.map((risk) => risk.id)).toEqual(['low-1', 'high-1', 'medium-1', 'high-2'])
    expect(state.highRiskCount).toBe(2)
  })
})

describe('high-risk count', () => {
  it('filters strictly by high severity and formats the count to at least two digits', () => {
    const risks: AnalysisRisk[] = [
      { ...completeAnalysis.risks[0], id: 'high', severity: 'high' },
      { ...completeAnalysis.risks[0], id: 'medium', severity: 'medium' },
      { ...completeAnalysis.risks[0], id: 'low', severity: 'low' },
    ]

    expect(countHighRisks(risks)).toBe(1)
    expect(formatHighRiskCount(0)).toBe('00')
    expect(formatHighRiskCount(countHighRisks(risks))).toBe('01')
    expect(formatHighRiskCount(12)).toBe('12')
    expect(formatHighRiskCount(100)).toBe('100')
  })
})
