import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import type { AttachedFile } from './composer/ChatInputConfig'
import { useAuth } from '../../hooks/useAuth'
import { AssistantHome } from './home/AssistantHome'
import { AssistantConversationLayout } from './layout/AssistantConversationLayout'

interface LocationState {
  initialMessage?: string
  initialFile?: AttachedFile | null
}

export default function AssistantPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const userName = user?.displayName || 'User'
  const state = location.state as LocationState | null
  const initialMessage = state?.initialMessage
  const initialFile = state?.initialFile
  const [isConversationActive, setIsConversationActive] = useState(false)
  const [conversationInitialMessage, setConversationInitialMessage] = useState<string | undefined>(
    initialMessage,
  )
  const [conversationInitialFiles, setConversationInitialFiles] = useState<AttachedFile[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(() =>
    localStorage.getItem('prism_assistant_active_chat'),
  )

  useEffect(() => {
    if (!initialMessage) return
    setIsConversationActive(true)
    setConversationInitialMessage(initialMessage)
  }, [initialMessage])

  useEffect(() => {
    if (currentChatId) setIsConversationActive(true)
  }, [currentChatId])

  useEffect(() => {
    if (currentChatId) localStorage.setItem('prism_assistant_active_chat', currentChatId)
  }, [currentChatId])

  const handleBack = () => {
    localStorage.removeItem('prism_assistant_active_chat')
    setCurrentChatId(null)
    setIsConversationActive(false)
    setConversationInitialMessage(undefined)
    setConversationInitialFiles([])
  }

  return (
    <Layout userName={userName} activePage="assistant">
      {isConversationActive ? (
        <AssistantConversationLayout
          currentChatId={currentChatId}
          initialMessage={conversationInitialMessage}
          initialFile={initialFile}
          initialFiles={conversationInitialFiles}
          userName={userName}
          onBack={handleBack}
          onNewChat={() => {
            localStorage.removeItem('prism_assistant_active_chat')
            navigate('/assistant')
            setIsConversationActive(false)
          }}
          onHistory={() => navigate('/assistant/history')}
          onChatNotFound={() => {
            localStorage.removeItem('prism_assistant_active_chat')
            setCurrentChatId(null)
            setIsConversationActive(false)
          }}
        />
      ) : (
        <AssistantHome
          onHistory={() => navigate('/assistant/history')}
          onStartConversation={({ message, files }) => {
            setConversationInitialFiles([...files])
            setConversationInitialMessage(message)
            setIsConversationActive(true)
          }}
        />
      )}
    </Layout>
  )
}
