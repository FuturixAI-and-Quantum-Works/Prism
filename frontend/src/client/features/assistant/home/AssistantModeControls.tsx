import { Button } from '../../../components/ui/Button'
import { TemplateCard } from '../../templates/TemplateCard'
import type { AssistantMode, AssistantTemplate } from './assistantHomeModel'
import { promptSuggestions } from './assistantHomeModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

function CreateDocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M9 1H3C2.44772 1 2 1.44772 2 2V14C2 14.5523 2.44772 15 3 15H13C13.5523 15 14 14.5523 14 14V6L9 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 1V6H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9V13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11H10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CompareDocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 2H2.5C2.22386 2 2 2.22386 2 2.5V13.5C2 13.7761 2.22386 14 2.5 14H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 2H13.5C13.7761 2 14 2.22386 14 2.5V13.5C14 13.7761 13.7761 14 13.5 14H10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 1V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SummarizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 8H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const modes: Array<{
  id: Exclude<AssistantMode, 'initial'>
  label: string
  icon: React.ReactNode
}> = [
  { id: 'create', label: 'Create Document', icon: <CreateDocumentIcon /> },
  { id: 'compare', label: 'Compare Document', icon: <CompareDocumentIcon /> },
  { id: 'summarize', label: 'Summarize', icon: <SummarizeIcon /> },
]

interface AssistantModeControlsProps {
  activeMode: AssistantMode
  isMobile: boolean
  templates: AssistantTemplate[]
  isLoadingTemplates: boolean
  onModeChange: (mode: AssistantMode) => void
  onPromptClick: (prompt: string) => void
}

export function AssistantModeControls({
  activeMode,
  isMobile,
  templates,
  isLoadingTemplates,
  onModeChange,
  onPromptClick,
}: AssistantModeControlsProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        {modes.map((mode) => {
          const active = activeMode === mode.id
          return (
            <Button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              aria-pressed={active}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: active ? '#272727' : '#FFFFFF',
                color: active ? '#FFFFFF' : '#454545',
                border: '1px solid',
                borderColor: active ? '#272727' : '#EDEDED',
                borderRadius: '100px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 510,
                letterSpacing: '-0.42px',
                fontFamily,
                transition: 'all 0.15s ease',
              }}
            >
              {mode.icon}
              {mode.label}
            </Button>
          )
        })}
      </div>

      {activeMode === 'create' && (
        <div
          style={{
            width: '100%',
            maxWidth: '1080px',
            marginTop: '16px',
            animation: 'slideUpFadeIn 0.3s ease-out',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.5px',
              marginBottom: '16px',
            }}
          >
            Sample Prompts
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '12px',
              width: '100%',
              maxWidth: '1080px',
            }}
          >
            {promptSuggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                onClick={() => onPromptClick(suggestion.prompt)}
                aria-label={`${suggestion.title}: ${suggestion.description}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #EDEDED',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = '#D0D0D0'
                  event.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = '#EDEDED'
                  event.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.4,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 12L12 4M12 4H6M12 4V10"
                      stroke="#454545"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 510,
                    color: '#272727',
                    margin: '0 0 4px 0',
                    letterSpacing: '-0.45px',
                    display: 'block',
                  }}
                >
                  {suggestion.title}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    color: '#797979',
                    margin: 0,
                    letterSpacing: '-0.4px',
                    lineHeight: '18px',
                    display: 'block',
                  }}
                >
                  {suggestion.description}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {activeMode === 'create' && (
        <div
          style={{
            width: '100%',
            maxWidth: '1080px',
            marginTop: '32px',
            animation: 'slideUpFadeIn 0.3s ease-out 0.1s both',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.5px',
              marginBottom: '16px',
            }}
          >
            Templates
          </h2>
          {isLoadingTemplates ? (
            <div
              role="status"
              aria-live="polite"
              style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}
            >
              <span style={{ fontSize: '14px', color: '#999' }}>Loading templates...</span>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                gap: isMobile ? '12px' : '16px',
              }}
            >
              {templates.slice(0, 10).map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  apiTemplate={template.apiTemplate}
                  onClick={() => onPromptClick(`Help me create a ${template.title}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
