import { ChatMarkdown } from './ChatMarkdown'

interface ChatStreamStateProps {
  cleanText: string
  isSending: boolean
  isStreaming: boolean
  rawText: string
}

function StreamingText({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div
        style={{
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: '16px 16px 16px 4px',
          backgroundColor: '#F7F7F7',
          color: '#454545',
        }}
      >
        <ChatMarkdown>{text}</ChatMarkdown>
      </div>
    </div>
  )
}

function WaitingIndicator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '16px 16px 16px 4px',
          backgroundColor: '#F7F7F7',
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 0.2, 0.4].map((delay) => (
            <span
              key={delay}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#999',
                animation: `bounce 1.4s ease-in-out${delay ? ` ${delay}s` : ''} infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatStreamState({
  cleanText,
  isSending,
  isStreaming,
  rawText,
}: ChatStreamStateProps) {
  return (
    <>
      {isStreaming && cleanText.length > 0 && <StreamingText text={cleanText} />}
      {isSending && !rawText && <WaitingIndicator />}
    </>
  )
}
