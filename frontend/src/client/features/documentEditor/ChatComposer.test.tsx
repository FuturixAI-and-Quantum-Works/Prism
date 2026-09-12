import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChatComposer } from './ChatComposer'
import type { ChatComposerProps } from './chatComposerModel'

const composerSources = import.meta.glob(['./ChatComposer*.tsx', './chatComposerModel.ts'], {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

interface ChatComposerHarnessProps {
  initialInput?: string
  isSending?: boolean
  isStreaming?: boolean
  onSend?: () => void
}

function ChatComposerHarness({
  initialInput = 'Review this agreement',
  isSending = false,
  isStreaming = false,
  onSend = vi.fn(),
}: ChatComposerHarnessProps) {
  const [inputText, setInputText] = useState(initialInput)

  const props: ChatComposerProps = {
    handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        onSend()
      }
    },
    handleSendMessage: async () => onSend(),
    inputText,
    isAnimating: false,
    isSending,
    isStreaming,
    placeholderIndex: 0,
    setInputText,
  }

  return <ChatComposer {...props} />
}

describe('ChatComposer', () => {
  it('keeps composer production modules below 500 lines', () => {
    for (const [path, source] of Object.entries(composerSources)) {
      if (path.includes('.test.')) continue
      expect(source.split(/\r?\n/).length, path).toBeLessThanOrEqual(500)
    }
  })

  it('preserves input, status, and send behavior without fake attachment controls', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatComposerHarness onSend={onSend} />)

    const input = screen.getByRole('textbox', { name: 'Message Prism' })
    expect(input).toHaveValue('Review this agreement')
    expect(screen.queryByRole('button', { name: 'Add files or sources' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('')

    await user.click(screen.getByRole('button', { name: 'Send message' }))
    expect(onSend).toHaveBeenCalledOnce()
  })

  it('preserves busy announcements and excludes model selection from the composer', () => {
    const { rerender } = render(<ChatComposerHarness initialInput=" " isSending />)

    expect(screen.getByRole('status')).toHaveTextContent('Sending message')
    expect(screen.getByRole('button', { name: 'Sending message' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: /AI model:/, hidden: true }),
    ).not.toBeInTheDocument()

    rerender(<ChatComposerHarness isSending isStreaming />)
    expect(screen.getByRole('status')).toHaveTextContent('Assistant is responding')
  })

  it('does not present blank input as actionable', () => {
    render(<ChatComposerHarness initialInput=" " />)

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })
})
