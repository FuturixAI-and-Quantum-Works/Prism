import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../hooks/useAuth'
import { useChat } from '../../../hooks/useChat'
import { HistoryList } from './HistoryList'
import { HistoryToolbar } from './HistoryToolbar'
import {
  buildAssistantHistory,
  filterAndSortHistory,
  type AssistantHistoryItem,
  type HistorySort,
} from './historyModel'

export default function AssistantHistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<HistorySort>('Newest')
  const { sessions, isLoadingChats, deleteChat, refetchChats } = useChat()

  const historyItems = useMemo(() => buildAssistantHistory(sessions), [sessions])
  const filteredAndSortedItems = useMemo(
    () => filterAndSortHistory(historyItems, searchQuery, sortBy),
    [historyItems, searchQuery, sortBy],
  )

  const openAssistant = () => navigate('/assistant')
  const handleNewChat = () => {
    localStorage.removeItem('prism_assistant_active_chat')
    openAssistant()
  }
  const handleChatClick = (chatId: string) => {
    localStorage.setItem('prism_assistant_active_chat', chatId)
    openAssistant()
  }
  const handleDeleteSession = async (item: AssistantHistoryItem) => {
    const results = await Promise.all(item.chatIds.map((chatId) => deleteChat(chatId)))
    const failure = results.find((result) => !result.success)
    if (failure) {
      alert(failure.error || 'Failed to delete conversation')
      return
    }
    await refetchChats()
  }

  return (
    <Layout userName={user?.displayName || 'User'} activePage="assistant">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          backgroundColor: '#F5F5F5',
        }}
      >
        <HistoryToolbar
          searchQuery={searchQuery}
          sortBy={sortBy}
          onSearchQueryChange={setSearchQuery}
          onSortChange={setSortBy}
          onBack={openAssistant}
          onNewChat={handleNewChat}
        />
        <HistoryList
          items={filteredAndSortedItems}
          isLoading={isLoadingChats}
          searchQuery={searchQuery}
          onOpen={handleChatClick}
          onDelete={handleDeleteSession}
        />
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}
        </style>
      </div>
    </Layout>
  )
}
