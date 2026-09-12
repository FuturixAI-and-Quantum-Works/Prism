import { describe, expect, it } from 'vitest'
import type { LocalChatMessage } from '../../../hooks/chatMessageModel'
import {
  filterToolCallContent,
  generateFollowUps,
  getActionVisibility,
  getGreeting,
  getWelcomeMessage,
  isImageAttachment,
  toConversationMessages,
  welcomeMessages,
} from './conversationModel'

describe('conversationModel', () => {
  it('maps chat state into the conversation view without dropping artifacts', () => {
    const messages: LocalChatMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Review complete',
        createdAt: '2026-09-02T12:00:00.000Z',
        isStreaming: false,
        reasoning: 'Checked the clauses',
        sources: [{ filename: 'Agreement', document_url: '/agreement' }],
        documents: [
          { status: 'ready', id: 'document-1', filename: 'Review.docx', action: 'created' },
        ],
      },
    ]

    const [message] = toConversationMessages(messages, { 'assistant-1': true })

    expect(message).toMatchObject({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Review complete',
      showActions: true,
      isStopped: true,
      reasoning: 'Checked the clauses',
      sources: [{ filename: 'Agreement', document_url: '/agreement' }],
      documents: [
        { status: 'ready', id: 'document-1', filename: 'Review.docx', action: 'created' },
      ],
    })
    expect(message.timestamp).toBe(
      new Date(messages[0].createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    )
  })

  it('removes transport-only tool lines from rendered assistant content', () => {
    const content = [
      'Useful answer.',
      '[Tool: search] running',
      '{"tool": "search", "status": "complete"}',
      '',
      '',
      'Final detail.',
    ].join('\n')

    expect(filterToolCallContent(content)).toBe('Useful answer.\n\nFinal detail.')
  })

  it('keeps follow-up ordering, uniqueness, and the four-item limit', () => {
    expect(
      generateFollowUps(
        'The contract has liability risk, compliance terms, payment fees, and a summary.',
        'Compare and summarize it',
      ),
    ).toEqual([
      'How can I mitigate these risks?',
      'Suggest alternative language for risky clauses',
      'Compare with industry standard clauses',
      'Explain any complex terms used',
    ])
  })

  it('derives response controls from the same prompt and response signals', () => {
    expect(
      getActionVisibility('Can you review this?', 'According to section 2, there is risk.'),
    ).toEqual({
      showExportAndEditor: false,
      showCopyShareDownload: false,
      showFollowUps: true,
      showSources: true,
    })
  })

  it('recognizes image attachments by MIME type or extension', () => {
    expect(isImageAttachment({ name: 'scan.bin', type: 'image/png' })).toBe(true)
    expect(isImageAttachment({ name: 'scan.WEBP', type: '' })).toBe(true)
    expect(isImageAttachment({ name: 'terms.pdf', type: 'application/pdf' })).toBe(false)
  })

  it('selects greetings and welcome copy deterministically when given time', () => {
    expect(getGreeting(new Date(2026, 8, 2, 9))).toBe('Good Morning')
    expect(getGreeting(new Date(2026, 8, 2, 13))).toBe('Good Afternoon')
    expect(getGreeting(new Date(2026, 8, 2, 20))).toBe('Good Evening')
    expect(getWelcomeMessage(0)).toBe(welcomeMessages[0])
    expect(getWelcomeMessage(60000)).toBe(welcomeMessages[1])
  })
})
