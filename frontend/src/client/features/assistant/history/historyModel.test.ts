import { describe, expect, it } from 'vitest'
import type { ChatSession } from '../../../store/api/chatApi'
import {
  buildAssistantHistory,
  buildConversationHistory,
  filterAndSortHistory,
} from './historyModel'

const sessions: ChatSession[] = [
  {
    id: 'session-1',
    title: '  Contract review  ',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-02T09:00:00.000Z',
    chats: [
      {
        id: 'chat-1',
        title: 'First pass',
        userId: 'user-1',
        projectId: null,
        createdAt: '2026-09-01T09:00:00.000Z',
        updatedAt: '2026-09-01T09:00:00.000Z',
      },
      {
        id: 'chat-2',
        title: 'Risk follow-up',
        userId: 'user-1',
        projectId: null,
        createdAt: '2026-09-02T09:00:00.000Z',
        updatedAt: '2026-09-02T09:00:00.000Z',
      },
    ],
  },
  {
    id: 'session-2',
    title: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
    chats: [
      {
        id: 'chat-3',
        title: 'Lease summary',
        userId: 'user-1',
        projectId: null,
        createdAt: '2026-08-01T09:00:00.000Z',
        updatedAt: '2026-08-01T09:00:00.000Z',
      },
    ],
  },
]

describe('assistant history model', () => {
  it('keeps one selectable item per native session', () => {
    expect(buildConversationHistory([...sessions, sessions[0]])).toEqual([
      {
        id: 'chat-1',
        title: 'Contract review',
        sessionId: 'session-1',
        chatCount: 2,
      },
      {
        id: 'chat-3',
        title: 'Lease summary',
        sessionId: 'session-2',
        chatCount: 1,
      },
    ])
  })

  it('keeps all chat ids when a session is deleted', () => {
    const item = buildAssistantHistory(sessions)[0]

    expect(item).toMatchObject({
      sessionId: 'session-1',
      activeChatId: 'chat-1',
      chatIds: ['chat-1', 'chat-2'],
      preview: 'First pass Risk follow-up',
    })
    expect(item).not.toHaveProperty('searchType')
  })

  it('filters and sorts without mutating the session projection', () => {
    const history = buildAssistantHistory(sessions)
    const result = filterAndSortHistory(history, 'risk', 'Oldest')

    expect(result.map((item) => item.sessionId)).toEqual(['session-1'])
    expect(history.map((item) => item.sessionId)).toEqual(['session-1', 'session-2'])
  })
})
