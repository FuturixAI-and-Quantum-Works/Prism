import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComplianceOverviewResults } from './ComplianceOverviewResults'

describe('ComplianceOverviewResults', () => {
  it('shows unavailable score separately from real zero counts', () => {
    render(
      <ComplianceOverviewResults
        results={{
          complianceScore: null,
          criticalIssues: 0,
          pendingItems: 0,
          resolvedIssues: 0,
        }}
      />,
    )

    expect(screen.getByText('Not scored')).toBeInTheDocument()
    expect(screen.getAllByText('00')).toHaveLength(3)
    expect(screen.queryByText('Audit Score')).not.toBeInTheDocument()
    expect(screen.queryByText('Feedback Received')).not.toBeInTheDocument()
  })

  it('renders a real zero score as zero percent', () => {
    render(
      <ComplianceOverviewResults
        results={{
          complianceScore: 0,
          criticalIssues: 1,
          pendingItems: 2,
          resolvedIssues: 3,
        }}
      />,
    )

    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
