import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SuggestEditCard } from './SuggestEditCard'

describe('SuggestEditCard', () => {
  it('presents unpersisted suggestions without fake resolution controls', () => {
    render(
      <SuggestEditCard
        model={{
          status: 'pending',
          docId: 'document-1',
          filename: 'Agreement.docx',
          suggestions: [
            {
              id: 'suggestion-1',
              find: 'old wording',
              replace: 'new wording',
              reason: 'Clearer language',
              category: 'clarity',
              priority: 'medium',
            },
          ],
        }}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('old wording')).toBeInTheDocument()
    expect(screen.getByText('new wording')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })
})
