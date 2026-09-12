import type { ComplianceReviewResponse, ComplianceRunEvent } from '../../store/api/complianceApi'
import type {
  ClauseValidation,
  ComplianceActivity,
  ComplianceRecommendation,
  ComplianceResults,
  RuleResult,
} from './complianceModels'

export interface ComplianceResultState {
  summary: ComplianceResults | null
  rules: RuleResult[]
  insights: string[]
  clauses: ClauseValidation[]
  recommendations: ComplianceRecommendation[]
  activity: ComplianceActivity[]
}

export type ComplianceResultProjection =
  | { type: 'reset' }
  | { type: 'hydrate'; data: ComplianceReviewResponse }
  | { type: 'sse'; event: ComplianceRunEvent }

export function emptyComplianceResultState(): ComplianceResultState {
  return {
    summary: null,
    rules: [],
    insights: [],
    clauses: [],
    recommendations: [],
    activity: [],
  }
}

export function projectComplianceResults(
  state: ComplianceResultState,
  projection: ComplianceResultProjection,
): ComplianceResultState {
  if (projection.type === 'reset') return emptyComplianceResultState()

  if (projection.type === 'hydrate') {
    const { data } = projection
    if (data.review.status !== 'completed') return emptyComplianceResultState()

    return {
      ...emptyComplianceResultState(),
      rules: data.rules
        .filter((rule) => rule.result?.summary)
        .map((rule) => ({
          id: rule.id,
          summary: rule.result?.summary ?? '',
          status: rule.status,
        })),
      summary: data.review.results
        ? {
            complianceScore: data.review.complianceScore,
            criticalIssues: data.review.results.criticalIssues,
            pendingItems: data.review.results.pendingItems,
            resolvedIssues: data.review.results.resolvedIssues,
          }
        : null,
      insights: data.review.aiInsights ?? [],
    }
  }

  const { event } = projection
  switch (event.type) {
    case 'rule_result':
      return {
        ...state,
        rules: [
          ...state.rules.filter((result) => result.id !== event.rule_id),
          {
            id: event.rule_id,
            summary: event.result?.summary || '',
            status: event.status,
          },
        ],
      }
    case 'insights_result':
      return { ...state, insights: event.insights || [] }
    case 'summary':
      return {
        ...state,
        summary: {
          complianceScore: event.compliance_score,
          criticalIssues: event.critical_issues,
          pendingItems: event.pending_items,
          resolvedIssues: event.resolved_issues,
        },
      }
    case 'clause_validation': {
      const id = event.clause_id || `clause-${event.clause}`
      return {
        ...state,
        clauses: [
          ...state.clauses.filter((result) => result.id !== id),
          {
            id,
            clause: event.clause || '',
            status: event.status,
            details: event.details || '',
          },
        ],
      }
    }
    case 'recommendation': {
      const id = event.recommendation_id || `recommendation-${event.title}`
      return {
        ...state,
        recommendations: [
          ...state.recommendations.filter((result) => result.id !== id),
          {
            id,
            title: event.title || '',
            description: event.description || '',
            priority: event.priority || 'medium',
          },
        ],
      }
    }
    case 'activity': {
      const id = event.activity_id || `activity-${event.action}-${event.timestamp}`
      return {
        ...state,
        activity: [
          ...state.activity.filter((result) => result.id !== id),
          {
            id,
            action: event.action || '',
            timestamp: event.timestamp || new Date().toLocaleString(),
            user: event.user || 'System',
          },
        ],
      }
    }
    default:
      return state
  }
}
