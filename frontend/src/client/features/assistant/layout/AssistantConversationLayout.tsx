import clockIcon from '../../../assets/conversation/clock-icon.svg'
import newPlusIcon from '../../../assets/library/new-plus-icon.svg'
import type { AttachedFile } from '../composer/ChatInputConfig'
import { Button } from '../../../components/ui/Button'
import ConversationScreen from '../conversation/ConversationScreen'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface AssistantConversationLayoutProps {
  currentChatId: string | null
  initialMessage: string | undefined
  initialFile: AttachedFile | null | undefined
  initialFiles: AttachedFile[]
  userName: string
  onBack: () => void
  onNewChat: () => void
  onHistory: () => void
  onChatNotFound: () => void
}

export function AssistantConversationLayout({
  currentChatId,
  initialMessage,
  initialFile,
  initialFiles,
  userName,
  onBack,
  onNewChat,
  onHistory,
  onChatNotFound,
}: AssistantConversationLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ position: 'relative', maxHeight: '90px', display: 'flex', maxWidth: '250px' }}>
        <Button
          onClick={onNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            left: 10,
            top: 10,
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            fontFamily,
            zIndex: 99,
          }}
        >
          <img src={newPlusIcon} alt="" style={{ width: '12px', height: '12px' }} />
          New Chat
        </Button>
        <Button
          onClick={onHistory}
          style={{
            display: 'flex',
            position: 'absolute',
            right: 40,
            top: 10,
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            fontFamily,
            zIndex: 99,
          }}
        >
          <img src={clockIcon} alt="" style={{ width: '16px', height: '16px' }} />
          History
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', width: '100%' }}>
        <ConversationScreen
          onBack={onBack}
          chatId={currentChatId}
          initialMessage={initialMessage}
          initialFile={initialFile}
          initialFiles={initialFiles}
          showBackButton={false}
          showWelcome={false}
          showSidebar={false}
          userName={userName}
          onChatNotFound={onChatNotFound}
        />
      </div>
    </div>
  )
}
