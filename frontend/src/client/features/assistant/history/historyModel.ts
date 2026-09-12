import type { ChatSession } from '../../../store/api/chatApi'

export type HistorySort = 'Newest' | 'Oldest' | 'A-Z' | 'Z-A'

export interface ConversationHistoryItem {
  id: string
  title: string
  sessionId: string
  chatCount: number
}

export interface AssistantHistoryItem {
  sessionId: string
  chatIds: string[]
  activeChatId: string
  title: string
  date: string
  preview: string
}

function sessionTitle(session: ChatSession) {
  return session.title?.trim() || session.chats[0]?.title?.trim() || 'Untitled conversation'
}

export function buildConversationHistory(sessions: ChatSession[]): ConversationHistoryItem[] {
  const seen = new Set<string>()

  return sessions.flatMap((session) => {
    const firstChat = session.chats[0]
    if (!firstChat || seen.has(session.id)) return []
    seen.add(session.id)
    return [
      {
        id: firstChat.id,
        title: sessionTitle(session),
        sessionId: session.id,
        chatCount: session.chats.length,
      },
    ]
  })
}

export function buildAssistantHistory(sessions: ChatSession[]): AssistantHistoryItem[] {
  return sessions.flatMap((session) => {
    const firstChat = session.chats[0]
    if (!firstChat) return []

    return [
      {
        sessionId: session.id,
        chatIds: session.chats.map((chat) => chat.id),
        activeChatId: firstChat.id,
        title: sessionTitle(session),
        date: session.updatedAt,
        preview: session.chats
          .map((chat) => chat.title?.trim())
          .filter(Boolean)
          .join(' '),
      },
    ]
  })
}

export function filterAndSortHistory(
  history: AssistantHistoryItem[],
  searchQuery: string,
  sortBy: HistorySort,
) {
  const query = searchQuery.trim().toLowerCase()
  const filtered = history.filter((item) => {
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.preview.toLowerCase().includes(query)
    return matchesQuery
  })

  return filtered.sort((left, right) => {
    switch (sortBy) {
      case 'Newest':
        return new Date(right.date).getTime() - new Date(left.date).getTime()
      case 'Oldest':
        return new Date(left.date).getTime() - new Date(right.date).getTime()
      case 'A-Z':
        return left.title.localeCompare(right.title)
      case 'Z-A':
        return right.title.localeCompare(left.title)
    }
  })
}
