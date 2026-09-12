import send from '../../assets/send.svg'
import { IconButton } from '../../components/ui/Button'

interface ChatComposerToolbarProps {
  inputText: string
  isSending: boolean
  onSend: () => void
}

export function ChatComposerToolbar({ inputText, isSending, onSend }: ChatComposerToolbarProps) {
  const sendDisabled = isSending || !inputText.trim()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <IconButton
        label={isSending ? 'Sending message' : 'Send message'}
        onClick={onSend}
        disabled={sendDisabled}
        aria-busy={isSending}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          backgroundColor: '#272727',
          border: 'none',
          borderRadius: '50%',
          cursor: sendDisabled ? 'not-allowed' : 'pointer',
          padding: 0,
          opacity: sendDisabled ? 0.7 : 1,
        }}
      >
        {isSending ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle
              cx="10"
              cy="10"
              r="8"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="50"
              strokeDashoffset="20"
            />
          </svg>
        ) : (
          <img src={send} alt="" style={{ width: '20px', height: '20px' }} />
        )}
      </IconButton>
    </div>
  )
}
