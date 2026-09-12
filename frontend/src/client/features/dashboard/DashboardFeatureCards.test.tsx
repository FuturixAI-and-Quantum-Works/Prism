import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardFeatureCards } from './DashboardFeatureCards'

describe('DashboardFeatureCards', () => {
  it('describes capabilities without unsupported timing claims', () => {
    const { container } = render(
      <DashboardFeatureCards
        session={{
          aiPanelCollapsed: false,
          isMobile: false,
          isTablet: false,
          actions: { openFeature: vi.fn() },
        }}
      />,
    )

    expect(container).toHaveTextContent(
      'Detect risky clauses, missing obligations, and legal inconsistencies.',
    )
    expect(container).toHaveTextContent(
      'Generate concise summaries for contracts, agreements, and policies.',
    )
    expect(container).not.toHaveTextContent(/\b(?:instantly|in seconds)\b/i)
  })
})
