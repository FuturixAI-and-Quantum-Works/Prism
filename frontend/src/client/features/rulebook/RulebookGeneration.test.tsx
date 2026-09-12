import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RulebookPage from './RulebookFeature'

const mocks = vi.hoisted(() => ({
  createWorkflow: vi.fn(() => ({
    unwrap: () =>
      Promise.resolve({
        id: 'workflow-1',
        title: 'NDA Rulebook',
      }),
  })),
  generateRulebook: vi.fn(() => ({
    unwrap: () =>
      Promise.resolve({
        title: 'NDA Rulebook',
        document_type: 'NDA',
        sample_document: null,
        faqs: [
          {
            id: 'faq-1',
            question: 'Is the confidentiality term defined?',
            column_name: 'Confidentiality term',
            prompt: 'Check whether the confidentiality term is defined.',
            format: 'yes_no',
            category: 'Confidentiality',
            severity: 'warning',
            rationale: 'Undefined terms create ambiguity.',
          },
        ],
        columns_config: [],
        source: 'llm',
      }),
  })),
}))

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock('../../store/api/workflowsApi', () => ({
  useGetWorkflowsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useCreateWorkflowMutation: () => [mocks.createWorkflow, { isLoading: false }],
  useDeleteWorkflowMutation: () => [vi.fn(), { isLoading: false }],
  usePatchWorkflowMutation: () => [vi.fn(), { isLoading: false }],
}))
vi.mock('../documents/documentsApi', () => ({
  useGetDocumentsQuery: () => ({ data: [], isLoading: false }),
}))
vi.mock('../documents/api/documentCoreApi', () => ({
  useGetDocumentsQuery: () => ({ data: [], isLoading: false }),
}))
vi.mock('../../store/api/tabularReviewApi', () => ({
  useCreateTabularReviewMutation: () => [vi.fn(), { isLoading: false }],
}))
vi.mock('../../store/api/rulebookApi', () => ({
  useGenerateRulebookMutation: () => [mocks.generateRulebook, { isLoading: false }],
}))

describe('rulebook generation', () => {
  it('turns generated FAQs into the persisted workflow columns', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <RulebookPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'New rulebook' }))
    await user.type(screen.getByRole('textbox', { name: 'Document type' }), 'NDA')
    await user.click(screen.getByRole('button', { name: 'Generate FAQs' }))

    expect(await screen.findByDisplayValue('NDA Rulebook')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Is the confidentiality term defined?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save rulebook' }))
    await waitFor(() =>
      expect(mocks.createWorkflow).toHaveBeenCalledWith({
        title: 'NDA Rulebook',
        type: 'tabular',
        prompt_md: '',
        practice: 'NDA',
        columns_config: [
          {
            id: 'faq-1',
            index: 0,
            name: 'Confidentiality term',
            prompt: 'Check whether the confidentiality term is defined.',
            format: 'yes_no',
            tags: undefined,
            width: 260,
            question: 'Is the confidentiality term defined?',
            category: 'Confidentiality',
            severity: 'warning',
            rationale: 'Undefined terms create ambiguity.',
          },
        ],
      }),
    )
  })
})
