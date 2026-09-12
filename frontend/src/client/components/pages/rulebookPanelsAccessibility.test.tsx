import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import AnalysisPanel from '../../features/analysis/AnalysisPanelFeature'
import RulebookPanel from './RulebookPanel'

const mocks = vi.hoisted(() => ({
  workflows: [
    {
      id: 'rulebook-1',
      title: 'Vendor policy',
      practice: 'Commercial',
      columnsConfig: [{ id: 'check-1', name: 'Termination', index: 0 }],
      is_owner: true,
      allow_edit: true,
    },
  ],
}))

vi.mock('../../store/api/workflowsApi', () => ({
  useGetWorkflowsQuery: () => ({
    data: mocks.workflows,
    isLoading: false,
    isError: false,
  }),
}))

describe('rulebook and analysis panel accessibility', () => {
  it('selects a rulebook from the keyboard without axe violations', async () => {
    const user = userEvent.setup()
    const onRulebookSelect = vi.fn()
    const { container } = render(
      <RulebookPanel workspaceId="workspace-1" onRulebookSelect={onRulebookSelect} />,
    )

    const rulebook = screen.getByRole('button', { name: /Vendor policy/ })
    rulebook.focus()
    await user.keyboard('{Enter}')

    expect(rulebook).toHaveAttribute('aria-pressed', 'true')
    expect(onRulebookSelect).toHaveBeenCalledWith(mocks.workflows[0])
    expect(await axe(container)).toHaveNoViolations()
  })

  it('navigates analysis tabs and expands risks from the keyboard', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <AnalysisPanel
        workspaceId="workspace-1"
        analysisData={{
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
          clauses: [],
        }}
      />,
    )

    const risksTab = screen.getByRole('tab', { name: 'Risks' })
    const indicator = container.querySelector<HTMLElement>('[aria-hidden="true"]')
    expect(indicator).toHaveStyle({ left: '163px', width: '100px' })
    risksTab.focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Summaries' })).toHaveAttribute('aria-selected', 'true')
    expect(indicator).toHaveStyle({ left: '20px', width: '128px' })

    await user.keyboard('{ArrowRight}')
    expect(risksTab).toHaveAttribute('aria-selected', 'true')
    expect(indicator).toHaveStyle({ left: '163px', width: '100px' })

    const risk = screen.getByRole('button', { name: /Unlimited liability/ })
    risk.focus()
    await user.keyboard('{Enter}')
    expect(risk).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('The liability cap is missing.')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('preserves risk result precedence, source order, and disclosure behavior', async () => {
    const user = userEvent.setup()
    const analysisData = {
      summaries: [],
      risks: [
        {
          id: '1',
          title: 'Medium first',
          category: 'Liability',
          description: '',
          severity: 'medium' as const,
        },
        {
          id: '2',
          title: 'High second',
          category: 'Termination',
          description: 'Termination is immediate.',
          severity: 'high' as const,
        },
        {
          id: '3',
          title: 'Low third',
          category: 'Renewal',
          description: 'Renewal is automatic.',
          severity: 'low' as const,
        },
      ],
      clauses: [],
    }
    const { rerender } = render(
      <AnalysisPanel
        workspaceId="workspace-1"
        analysisData={analysisData}
        isLoading
        error="Analysis service unavailable"
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Analyzing risks...')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(
      <AnalysisPanel
        workspaceId="workspace-1"
        analysisData={analysisData}
        error="Analysis service unavailable"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Analysis failed')
    expect(screen.queryByText('Medium first')).not.toBeInTheDocument()

    rerender(<AnalysisPanel workspaceId="workspace-1" analysisData={analysisData} />)
    expect(screen.getByText('High Risk (01)')).toBeInTheDocument()
    expect(
      screen
        .getAllByText(/^(Medium first|High second|Low third)$/)
        .map((element) => element.textContent),
    ).toEqual(['Medium first', 'High second', 'Low third'])

    const mediumRisk = screen.getByRole('button', { name: /Medium first/ })
    const highRisk = screen.getByRole('button', { name: /High second/ })
    const lowRisk = screen.getByRole('button', { name: /Low third/ })
    expect(mediumRisk).toHaveAttribute('aria-expanded', 'true')
    expect(mediumRisk).toHaveAttribute('aria-controls', 'analysis-risk-1')
    expect(mediumRisk.querySelector('img')?.getAttribute('src')).toBe(
      lowRisk.querySelector('img')?.getAttribute('src'),
    )
    expect(highRisk.querySelector('img')?.getAttribute('src')).not.toBe(
      mediumRisk.querySelector('img')?.getAttribute('src'),
    )
    expect(document.getElementById('analysis-risk-1')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fix the clauses' })).not.toBeInTheDocument()

    await user.click(highRisk)
    expect(mediumRisk).toHaveAttribute('aria-expanded', 'false')
    expect(highRisk).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Termination is immediate.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fix the clauses' })).not.toBeInTheDocument()
  })

  it('distinguishes unrequested and analyzed-empty risks while errors remain risk-only', async () => {
    const user = userEvent.setup()
    const onRequestAnalysis = vi.fn()
    const emptyAnalysis = { summaries: [], risks: [], clauses: [] }
    const { container, rerender } = render(
      <AnalysisPanel workspaceId="workspace-1" onRequestAnalysis={onRequestAnalysis} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('No risks analyzed yet')
    await user.click(screen.getByRole('button', { name: 'Generate Analysis' }))
    expect(onRequestAnalysis).toHaveBeenCalledOnce()

    rerender(<AnalysisPanel workspaceId="workspace-1" analysisData={emptyAnalysis} />)
    expect(screen.getByRole('status')).toHaveTextContent('No risks identified')

    rerender(
      <AnalysisPanel workspaceId="workspace-1" error="Analysis service unavailable" isLoading />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Analyzing risks...')

    await user.click(screen.getByRole('tab', { name: 'Summaries' }))
    expect(screen.getByRole('status')).toHaveTextContent('Analyzing documents...')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Clause Analysis' }))
    expect(screen.getByRole('status')).toHaveTextContent('Analyzing clauses...')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(container.querySelector<HTMLElement>('[aria-hidden="true"]')).toHaveStyle({
      left: '280px',
      width: '140px',
    })

    rerender(<AnalysisPanel workspaceId="workspace-1" error="Analysis service unavailable" />)
    expect(screen.getByRole('status')).toHaveTextContent('No clause analysis yet')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Summaries' }))
    expect(screen.getByRole('status')).toHaveTextContent('No summaries yet')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('preserves embedded framing and the close action', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AnalysisPanel workspaceId="workspace-1" embedded onClose={onClose} />)

    expect(screen.getByRole('complementary', { name: 'Document analysis' })).toHaveStyle({
      height: '100%',
    })
    await user.click(screen.getByRole('button', { name: 'Close analysis' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
