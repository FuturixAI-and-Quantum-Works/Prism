import { describe, expect, it } from 'vitest'
import type { Workflow } from '../../store/api/workflowsApi'
import {
  faqsFromWorkflow,
  selectRulebooks,
  toReviewColumns,
  toWorkflowColumns,
} from './rulebookModel'

function workflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'workflow-1',
    userId: 'user-1',
    title: 'NDA Review',
    type: 'tabular',
    promptMd: '',
    columnsConfig: [],
    practice: 'Contracts',
    isSystem: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    allow_edit: true,
    is_owner: true,
    ...overrides,
  }
}

describe('rulebook model', () => {
  it('normalizes persisted workflow columns into editable FAQs', () => {
    const [faq] = faqsFromWorkflow(
      workflow({
        columnsConfig: [
          {
            id: 'column-1',
            name: 'Liability',
            prompt: 'Check liability',
            format: 'unsupported',
            severity: 'critical',
          },
        ],
      }),
    )

    expect(faq).toMatchObject({
      id: 'column-1',
      question: 'Check liability',
      format: 'text',
      severity: 'info',
    })
  })

  it('builds workflow and review payload columns from the same FAQ order', () => {
    const faqs = faqsFromWorkflow(
      workflow({
        columnsConfig: [
          {
            id: 'column-1',
            name: 'Liability',
            question: 'Is liability capped?',
            prompt: '',
            format: 'yes_no',
          },
        ],
      }),
    )

    expect(toWorkflowColumns(faqs)[0]).toMatchObject({
      index: 0,
      name: 'Liability',
      prompt: 'Is liability capped?',
      width: 260,
    })
    expect(toReviewColumns(faqs)[0]).toMatchObject({
      index: 0,
      name: 'Liability',
      prompt: 'Is liability capped?',
    })
  })

  it('searches titles and practices case-insensitively', () => {
    const workflows = [
      workflow(),
      workflow({ id: 'workflow-2', title: 'Lease Audit', practice: 'Real Estate' }),
    ]

    expect(selectRulebooks(workflows, 'estate').map((item) => item.id)).toEqual(['workflow-2'])
  })
})
