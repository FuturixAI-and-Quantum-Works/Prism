import newIcon from '../../../assets/conversation/new-icon.svg'
import clockIcon from '../../../assets/conversation/clock-icon.svg'
import messageIcon from '../../../assets/conversation/message-icon.svg'
import { Button } from '../../../components/ui/Button'
import type { Template } from '../../templates/templatesApi'
import type { ConversationHistoryItem } from '../history/historyModel'
import type { ConversationTab } from './conversationModel'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const TemplateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M13 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2Z"
      stroke="#454545"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M5 5H11" stroke="#454545" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5 8H11" stroke="#454545" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5 11H8" stroke="#454545" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4.5" stroke="#999999" strokeWidth="1.2" />
    <path d="M9.5 9.5L12.5 12.5" stroke="#999999" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

interface ConversationSidebarProps {
  activeTab: ConversationTab
  selectedHistoryId: string | null
  search: string
  historyItems: ConversationHistoryItem[]
  templates: Template[]
  isLoadingHistory: boolean
  isLoadingTemplates: boolean
  onNewChat: () => void
  onSearchChange: (value: string) => void
  onTabChange: (tab: ConversationTab) => void
  onHistoryClick: (item: ConversationHistoryItem) => void
  onNewTemplate: () => void
}

export function ConversationSidebar({
  activeTab,
  selectedHistoryId,
  search,
  historyItems,
  templates,
  isLoadingHistory,
  isLoadingTemplates,
  onNewChat,
  onSearchChange,
  onTabChange,
  onHistoryClick,
  onNewTemplate,
}: ConversationSidebarProps) {
  return (
    <div
      style={{
        width: '200px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRight: '0.5px solid #EDEDED',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 0',
        gap: '8px',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '0 8px' }}>
        <Button
          onClick={onNewChat}
          aria-pressed={activeTab === 'new'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            height: '36px',
            backgroundColor: activeTab === 'new' ? '#F7F7F7' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <img src={newIcon} alt="" style={{ width: '16px', height: '16px' }} />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
            }}
          >
            New Chat
          </span>
        </Button>
      </div>

      <div style={{ padding: '0 8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '32px',
            padding: '0 10px',
            backgroundColor: '#F7F7F7',
            borderRadius: '8px',
          }}
        >
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            aria-label="Search chats and templates"
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '12px',
              color: '#454545',
              outline: 'none',
              fontFamily,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', padding: '0 8px' }}>
        <Button
          onClick={() => onTabChange('history')}
          aria-pressed={activeTab === 'history'}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            height: '32px',
            backgroundColor: activeTab === 'history' ? '#F7F7F7' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <img src={clockIcon} alt="" style={{ width: '14px', height: '14px' }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: activeTab === 'history' ? 510 : 400,
              color: activeTab === 'history' ? '#272727' : '#797979',
              letterSpacing: '-0.65px',
            }}
          >
            Chats
          </span>
        </Button>

        <Button
          onClick={() => onTabChange('templates')}
          aria-pressed={activeTab === 'templates'}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            height: '32px',
            backgroundColor: activeTab === 'templates' ? '#F7F7F7' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <TemplateIcon />
          <span
            style={{
              fontSize: '13px',
              fontWeight: activeTab === 'templates' ? 510 : 400,
              color: activeTab === 'templates' ? '#272727' : '#797979',
              letterSpacing: '-0.65px',
            }}
          >
            Templates
          </span>
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto', flex: 1 }}>
        {activeTab === 'history' || activeTab === 'new' ? (
          <>
            {isLoadingHistory ? (
              <div
                role="status"
                aria-label="Loading chat history"
                style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 8px',
                      borderTop: '1px solid #EDEDED',
                      borderBottom: '1px solid #EDEDED',
                      marginBottom: '-1px',
                    }}
                  >
                    <div
                      className="skeleton-item"
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      className="skeleton-item"
                      style={{
                        height: '12px',
                        flex: 1,
                        maxWidth: `${70 + (item % 3) * 15}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : historyItems.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#797979',
                  lineHeight: '16px',
                }}
              >
                {search ? 'No matching chats found.' : 'No chat history yet.'}
              </div>
            ) : (
              historyItems.map((item, index) => (
                <Button
                  key={item.id}
                  className="history-item-animated"
                  onClick={() => onHistoryClick(item)}
                  aria-current={selectedHistoryId === item.id ? 'page' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderTop: '1px solid #EDEDED',
                    borderBottom: '1px solid #EDEDED',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    backgroundColor: selectedHistoryId === item.id ? '#F7F7F7' : 'transparent',
                    transition: 'background-color 0.15s ease',
                    animationDelay: `${index * 0.05}s`,
                    width: '100%',
                    textAlign: 'left',
                    fontFamily,
                    borderLeft: 'none',
                    borderRight: 'none',
                  }}
                  onMouseEnter={(event) => {
                    if (selectedHistoryId !== item.id) {
                      event.currentTarget.style.backgroundColor = '#FAFAFA'
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (selectedHistoryId !== item.id) {
                      event.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <img src={messageIcon} alt="" style={{ width: '12px', height: '12px' }} />
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.6px',
                      lineHeight: '16px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {item.title}
                  </span>
                </Button>
              ))
            )}
          </>
        ) : (
          <>
            <div style={{ padding: '4px 8px 8px' }}>
              <Button
                onClick={onNewTemplate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  height: '36px',
                  backgroundColor: '#272727',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1V11M1 6H11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 510,
                    color: '#FFFFFF',
                    letterSpacing: '-0.65px',
                  }}
                >
                  New Template
                </span>
              </Button>
            </div>

            {isLoadingTemplates ? (
              <div
                role="status"
                aria-label="Loading templates"
                style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderTop: '1px solid #EDEDED',
                      borderBottom: '1px solid #EDEDED',
                      marginBottom: '-1px',
                    }}
                  >
                    <div
                      className="skeleton-item"
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      className="skeleton-item"
                      style={{
                        height: '12px',
                        flex: 1,
                        maxWidth: `${60 + (item % 3) * 15}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#797979',
                  lineHeight: '16px',
                }}
              >
                {search ? 'No matching templates found.' : 'No templates yet. Create one!'}
              </div>
            ) : (
              templates.map((template, index) => (
                <div
                  key={template.id}
                  className="history-item-animated"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderTop: '1px solid #EDEDED',
                    borderBottom: '1px solid #EDEDED',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.15s ease',
                    animationDelay: `${index * 0.05}s`,
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = '#FAFAFA'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <TemplateIcon />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 510,
                        color: '#454545',
                        letterSpacing: '-0.6px',
                        lineHeight: '16px',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {template.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 400,
                        color: '#999999',
                        letterSpacing: '-0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {template.category}
                    </span>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
