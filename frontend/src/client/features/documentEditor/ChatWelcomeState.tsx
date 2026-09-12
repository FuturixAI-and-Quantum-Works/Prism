import prismLogoIcon from '../../assets/document-editor/prism-logo.svg'
import { Button } from '../../components/ui/Button'

interface Suggestion {
  icon: string
  text: string
}

interface ChatWelcomeStateProps {
  onSelectSuggestion: (text: string) => void
  suggestions: Suggestion[]
  userName: string
}

export function ChatWelcomeState({
  onSelectSuggestion,
  suggestions,
  userName,
}: ChatWelcomeStateProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <img src={prismLogoIcon} alt="" style={{ width: '49px', height: '49px' }} />
        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 590,
              color: '#454545',
              margin: 0,
              letterSpacing: '-0.96px',
              lineHeight: '1.05',
            }}
          >
            Hey!! {userName}
          </h1>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 590,
              color: '#454545',
              margin: 0,
              letterSpacing: '-0.96px',
              lineHeight: '1.05',
            }}
          >
            Whats on Your Mind ?
          </h1>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.text}
            onClick={() => onSelectSuggestion(suggestion.text)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              backgroundColor: '#F7F7F7',
              border: '1px solid #EDEDED',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              width: '100%',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = '#EEEEEE')}
            onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = '#F7F7F7')}
          >
            <img src={suggestion.icon} alt="" style={{ width: '18px', height: '18px' }} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#454545',
                letterSpacing: '-0.7px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {suggestion.text}
            </span>
          </Button>
        ))}
      </div>
    </>
  )
}
