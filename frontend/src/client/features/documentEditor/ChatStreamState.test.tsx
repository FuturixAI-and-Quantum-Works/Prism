import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatStreamState } from './ChatStreamState'

describe('ChatStreamState', () => {
  it('shows the waiting indicator only before raw stream text arrives', () => {
    const { container, rerender } = render(
      <ChatStreamState cleanText="" isSending isStreaming={false} rawText="" />,
    )

    expect(container.querySelectorAll('span')).toHaveLength(3)

    rerender(<ChatStreamState cleanText="" isSending isStreaming rawText="incoming" />)
    expect(container.querySelectorAll('span')).toHaveLength(0)
  })

  it('renders cleaned markdown only while streaming', () => {
    const { rerender } = render(
      <ChatStreamState
        cleanText="## Draft response"
        isSending={false}
        isStreaming
        rawText="## Draft response"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Draft response', level: 2 })).toBeInTheDocument()

    rerender(
      <ChatStreamState
        cleanText="## Draft response"
        isSending={false}
        isStreaming={false}
        rawText="## Draft response"
      />,
    )
    expect(screen.queryByRole('heading', { name: 'Draft response' })).not.toBeInTheDocument()
  })
})
