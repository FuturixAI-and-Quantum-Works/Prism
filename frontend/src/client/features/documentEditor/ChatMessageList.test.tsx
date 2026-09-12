import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { describe, expect, it, vi } from 'vitest'
import { ChatMessageList } from './ChatMessageList'

vi.mock('./editorUtilities', () => ({
  findTextMatchesInDoc: () => [
    { from: 1, to: 16 },
    { from: 30, to: 45 },
  ],
}))

describe('ChatMessageList', () => {
  it('renders assistant markdown, citations, and bottleneck navigation', () => {
    const navigate = vi.fn()
    const setMatchIndexes = vi.fn()
    const editor = { state: { doc: {} } } as Editor

    render(
      <ChatMessageList
        messages={[
          {
            role: 'assistant',
            content: `**Review complete.**

<CITATIONS>[{"ref":2,"doc_id":"document-1","page":7,"quote":"Quoted source"}]</CITATIONS>

{"bottlenecks":[{"bottleneck":"Repeated clause","reason":"Review this clause","heading":"Terms"}]}`,
          },
        ]}
        editor={editor}
        matchIndexes={{}}
        onNavigateBottleneck={navigate}
        setMatchIndexes={setMatchIndexes}
      />,
    )

    expect(screen.getByText('Review complete.')).toBeInTheDocument()
    expect(screen.getByTitle('Quoted source')).toHaveTextContent('[2]')
    expect(screen.getByText('Page 7')).toBeInTheDocument()
    expect(screen.queryByText(/bottlenecks/)).not.toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Review this clause'))
    expect(navigate).toHaveBeenCalledWith(
      {
        bottleneck: 'Repeated clause',
        reason: 'Review this clause',
        heading: 'Terms',
      },
      0,
    )

    fireEvent.click(screen.getByText('›'))
    const update = setMatchIndexes.mock.calls[0][0] as (
      previous: Record<string, number>,
    ) => Record<string, number>
    expect(update({ existing: 3 })).toEqual({
      existing: 3,
      'Repeated clause-0': 1,
    })
  })

  it('keeps user messages literal and disables missing bottlenecks', () => {
    render(
      <ChatMessageList
        messages={[
          { role: 'user', content: '**Keep literal**' },
          {
            role: 'assistant',
            content:
              'Check this.\n{"bottlenecks":[{"bottleneck":"Gone text","reason":"Missing","heading":"Old"}]}',
          },
        ]}
        editor={null}
        matchIndexes={{}}
        onNavigateBottleneck={vi.fn()}
        setMatchIndexes={vi.fn()}
      />,
    )

    expect(screen.getByText('**Keep literal**')).toBeInTheDocument()
    expect(screen.getByTitle('This section no longer exists')).toBeDisabled()
  })
})
