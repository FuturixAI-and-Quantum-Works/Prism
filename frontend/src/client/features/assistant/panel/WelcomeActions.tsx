import type { ReactNode } from 'react'
import morning from '../../../assets/morning.svg'
import create from '../../../assets/create.svg'
import uploadDoc from '../../../assets/upload.svg'
import compareDoc from '../../../assets/elements.svg'
import tabular from '../../../assets/grid.svg'
import plusIcon from '../../../assets/dashboard/plus-icon.svg'
import { Button } from '../../../components/ui/Button'
import { panelFontFamily } from './panelStyles'

export type AssistantActionId = 'create' | 'upload' | 'compare' | 'tabular'

const actionCards = [
  {
    id: 'create',
    title: 'Create Document',
    description: 'Draft, edit, or analyze a document using AI',
    icon: <img src={create} alt="" style={{ width: '21px', height: '21px' }} />,
  },
  {
    id: 'upload',
    title: 'Upload Document',
    description: 'Draft, edit, or analyze a document using AI',
    icon: <img src={uploadDoc} alt="" style={{ width: '30px', height: '30px' }} />,
  },
  {
    id: 'compare',
    title: 'Compare Documents',
    description: 'Draft, edit, or analyze a document using AI',
    icon: <img src={compareDoc} alt="" style={{ width: '24px', height: '24px' }} />,
  },
  {
    id: 'tabular',
    title: 'Tabular',
    description: 'Draft, edit, or analyze a document using AI',
    icon: <img src={tabular} alt="" style={{ width: '24px', height: '24px' }} />,
  },
] satisfies Array<{
  id: AssistantActionId
  title: string
  description: string
  icon: ReactNode
}>

const suggestionPrompts = [
  { id: 'summarize', text: 'Summarize all documents in this workspace', icon: '' },
  { id: 'risks', text: 'Identify potential risks across documents', icon: '' },
  { id: 'clauses', text: 'Find key clauses and obligations', icon: '' },
  { id: 'compare', text: 'Compare documents for inconsistencies', icon: '' },
  { id: 'timeline', text: 'Extract important dates and deadlines', icon: '' },
  { id: 'parties', text: 'List all parties and their responsibilities', icon: '' },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

interface WelcomeActionsProps {
  userName: string
  displayName?: string | null
  projectId?: string
  workspaceId?: string
  hideActionCards: boolean
  isProjectsEmpty: boolean
  onCreateProject?: () => void
  continueWorkingContent?: ReactNode
  onAction: (action: AssistantActionId) => void
  onSendPrompt: (prompt: string) => void
}

export function WelcomeActions({
  userName,
  displayName,
  projectId,
  workspaceId,
  hideActionCards,
  isProjectsEmpty,
  onCreateProject,
  continueWorkingContent,
  onAction,
  onSendPrompt,
}: WelcomeActionsProps) {
  const firstName = displayName ? displayName.split(' ')[0] : userName
  const isDetailView = !!(workspaceId || projectId)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src={morning} alt="" style={{ width: '24px', height: '24px' }} />
          <span
            style={{
              fontSize: '16px',
              fontWeight: 510,
              color: '#6B6B6B',
              letterSpacing: '-0.48px',
              lineHeight: '21px',
            }}
          >
            {getGreeting()}
          </span>
          <div
            style={{
              width: '1px',
              height: '12px',
              backgroundColor: '#C0C0C0',
              margin: '0 2px',
              transform: 'rotate(90deg)',
            }}
          />
          <span
            style={{
              fontSize: '16px',
              fontWeight: 510,
              color: '#6B6B6B',
              letterSpacing: '-0.48px',
              lineHeight: '21px',
            }}
          >
            {firstName}
          </span>
        </div>

        <h2
          style={{
            fontSize: '32px',
            fontWeight: 590,
            color: '#454545',
            letterSpacing: '-0.96px',
            lineHeight: '34px',
            margin: 0,
          }}
        >
          {projectId
            ? 'Ask about this project'
            : workspaceId
              ? 'Ask about this workspace'
              : 'How may i Help you ?'}
        </h2>
      </div>

      {isDetailView ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflow: 'auto',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              fontWeight: 510,
              color: '#6B6B6B',
              letterSpacing: '-0.5px',
              margin: '0 0 4px 0',
            }}
          >
            Try asking:
          </p>
          {suggestionPrompts.map((prompt) => (
            <Button
              key={prompt.id}
              onClick={() => onSendPrompt(prompt.text)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: '#F7F7F7',
                borderRadius: '12px',
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
              <span style={{ fontSize: '18px' }}>{prompt.icon}</span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 450,
                  color: '#454545',
                  letterSpacing: '-0.5px',
                  lineHeight: '18px',
                }}
              >
                {prompt.text}
              </span>
            </Button>
          ))}
        </div>
      ) : !hideActionCards ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '8px',
            overflow: 'auto',
          }}
        >
          {actionCards.map((card) => (
            <Button
              key={card.id}
              onClick={() => onAction(card.id)}
              style={{
                height: '130px',
                backgroundColor: '#F7F7F7',
                borderRadius: '16px',
                border: '1px solid #F7F7F7',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 20px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: panelFontFamily,
                width: '100%',
              }}
            >
              <span
                style={{
                  marginBottom: '8px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {card.icon}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '15px',
                  fontWeight: 510,
                  color: '#272727',
                  letterSpacing: '-0.75px',
                  lineHeight: '20px',
                  margin: '0 0 6px 0',
                }}
              >
                {card.title}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.65px',
                  lineHeight: '15px',
                  margin: 0,
                }}
              >
                {card.description}
              </span>
            </Button>
          ))}
        </div>
      ) : isProjectsEmpty ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'flex-start',
          }}
        >
          <p
            style={{
              fontFamily: panelFontFamily,
              fontSize: '16px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.8px',
              lineHeight: '21px',
              margin: 0,
              width: '227px',
            }}
          >
            Hey {firstName}! Looks like your workspace is empty right now.
          </p>
          <Button
            onClick={onCreateProject}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              width: '152px',
              height: '40px',
              padding: '6px 7px',
              backgroundColor: 'transparent',
              border: '1px solid #454545',
              borderRadius: '7px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = '#F7F7F7'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <img src={plusIcon} alt="" style={{ width: '10px', height: '10px' }} />
            <span
              style={{
                fontFamily: panelFontFamily,
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
                whiteSpace: 'nowrap',
              }}
            >
              Create a project
            </span>
          </Button>
        </div>
      ) : (
        continueWorkingContent || null
      )}
    </>
  )
}
