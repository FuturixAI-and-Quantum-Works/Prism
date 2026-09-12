import { Button } from '../../../components/ui/Button'
import { panelFontFamily } from './panelStyles'
import type { HistoryChat } from './types'

interface HistoryListProps {
  chats: HistoryChat[]
  isLoading: boolean
  onOpenChat: (chatId: string) => Promise<boolean>
  onClose: () => void
}

export function HistoryList({ chats, isLoading, onOpenChat, onClose }: HistoryListProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 590,
          color: '#272727',
          margin: '0 0 16px 0',
        }}
      >
        Chat History
      </h3>
      <div
        className="hide-scrollbar"
        aria-busy={isLoading}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#797979',
              fontSize: '14px',
            }}
          >
            Loading history...
          </div>
        ) : chats.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#797979',
              fontSize: '14px',
            }}
          >
            No chat history yet
          </div>
        ) : (
          chats.map((chat) => (
            <Button
              key={chat.id}
              onClick={async () => {
                if (await onOpenChat(chat.id)) onClose()
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '12px 14px',
                backgroundColor: '#F7F7F7',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                fontFamily: panelFontFamily,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#EFEFEF'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = '#F7F7F7'
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 510,
                  color: '#272727',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {chat.title || 'Untitled Chat'}
              </span>
              <span style={{ fontSize: '12px', color: '#797979' }}>
                {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </Button>
          ))
        )}
      </div>
    </div>
  )
}
