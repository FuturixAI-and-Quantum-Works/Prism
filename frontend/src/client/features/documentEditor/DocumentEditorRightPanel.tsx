import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from 'react'
import type { Editor } from '@tiptap/core'
import {
  type ChatSourceResultArtifact,
  type ChatToolCallArtifact,
} from '../assistant/stream/artifactTypes'
import prismLogoIcon from '../../assets/document-editor/prism-logo.svg'
import type { DocumentEditAnnotation } from '../documents/documentsApi'
import type { ProjectChatMessage } from '../projects/projectsApi'
import type { ParsedBottleneck } from './messageParsing'
import type { PlaceholderToolState } from './placeholderModel'
import type {
  CompareDocumentsToolState,
  ExtractClausesToolState,
  SuggestEditToolState,
} from './chatToolEvents'
import type { DocumentInsightsModel } from './useDocumentInsights'
import type { DocumentCommentsModel } from './useDocumentComments'
import type { DocumentAuditModel } from './useDocumentAudit'
import { InsightsPanel } from './InsightsPanel'
import { CommentsPanel } from './CommentsPanel'
import { AuditPanel } from './AuditPanel'
import { PrismChatPanel } from './PrismChatPanel'
import { Tab, TabList, Tabs } from '../../components/ui/Tabs'

interface StatusTab {
  id: string
  label: string
  icon: string | null
  activeColor: string
}
interface Suggestion {
  icon: string
  text: string
}

export interface DocumentEditorRightPanelProps {
  activeStatusTab: string
  audit: DocumentAuditModel
  bottleneckMatchIndexes: Record<string, number>
  bottleneckToast: string
  canCommentDocument: boolean
  canEditDocument: boolean
  canFillPlaceholders: boolean
  canResolveComments: boolean
  chatMessages: ProjectChatMessage[]
  cleanStreamingText: string
  commentsModel: DocumentCommentsModel
  dismissClauses: () => void
  dismissCompare: () => void
  dismissSuggestions: () => void
  editActionId: string | null
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  handleOpenFixRiskModal: Parameters<typeof InsightsPanel>[0]['onFixRisk']
  handlePlaceholderValueChange: (key: string, value: string) => void
  handleResolveTrackedEdit: (
    edit: DocumentEditAnnotation,
    mode: 'accept' | 'reject',
  ) => Promise<void>
  handleSavePlaceholderDetails: () => Promise<void>
  handleSendMessage: (input?: string) => Promise<void>
  inputText: string
  insights: DocumentInsightsModel
  isAnimating: boolean
  isResizing: boolean
  isSending: boolean
  isStreaming: boolean
  compareTool: CompareDocumentsToolState | null
  extractTool: ExtractClausesToolState | null
  suggestTool: SuggestEditToolState | null
  toolArtifacts: ChatToolCallArtifact[]
  messagesEndRef: RefObject<HTMLDivElement | null>
  placeholderIndex: number
  placeholderTool: PlaceholderToolState | null
  placeholderValues: Record<string, string>
  pendingDocumentEdits: DocumentEditAnnotation[]
  reasoningText: string
  resizeRef: RefObject<HTMLDivElement | null>
  rightPanelWidth: number
  scrollAndHighlightBottleneck: (bottleneck: ParsedBottleneck, matchIndex?: number) => void
  sessionContextLoading: boolean
  setActiveStatusTab: Dispatch<SetStateAction<string>>
  setBottleneckMatchIndexes: Dispatch<SetStateAction<Record<string, number>>>
  setInputText: Dispatch<SetStateAction<string>>
  setIsResizing: Dispatch<SetStateAction<boolean>>
  sourceResults: ChatSourceResultArtifact[]
  streamingText: string
  suggestions: Suggestion[]
  tiptapEditor: Editor | null
  userName: string
  uuid: string | undefined
  visibleStatusTabs: StatusTab[]
}

export function DocumentEditorRightPanel(props: DocumentEditorRightPanelProps) {
  const {
    activeStatusTab,
    audit,
    bottleneckToast,
    canCommentDocument,
    canResolveComments,
    commentsModel,
    handleOpenFixRiskModal,
    isResizing,
    resizeRef,
    rightPanelWidth,
    setActiveStatusTab,
    setInputText,
    setIsResizing,
    uuid,
    visibleStatusTabs,
  } = props
  return (
    <>
      <div
        style={{
          width: `${rightPanelWidth}px`,
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #EDEDED',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab}>
          <div
            ref={resizeRef}
            onMouseDown={() => setIsResizing(true)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: isResizing ? '#454545' : 'transparent',
              transition: 'background-color 0.15s ease',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (!isResizing) e.currentTarget.style.backgroundColor = '#E0E0E0'
            }}
            onMouseLeave={(e) => {
              if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent'
            }}
          />
          {bottleneckToast && (
            <div
              role="status"
              style={{
                position: 'absolute',
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 14px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#92400E',
                zIndex: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {bottleneckToast}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '49px',
              padding: '0 8px',
              borderBottom: '1px solid #EDEDED',
            }}
          >
            <TabList
              aria-label="Document assistant panels"
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '100%',
              }}
            >
              {visibleStatusTabs.map((tab) => {
                const isActive = activeStatusTab === tab.id
                return (
                  <Tab
                    key={tab.id}
                    value={tab.id}
                    controls={`document-panel-${tab.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0 10px',
                      height: '100%',
                      cursor: 'pointer',
                      borderBottom: isActive
                        ? `2px solid ${tab.activeColor}`
                        : '2px solid transparent',
                      transition: 'border-color 0.2s ease',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderTop: 'none',
                      backgroundColor: 'transparent',
                      fontFamily: 'inherit',
                    }}
                  >
                    {tab.id === 'prism' ? (
                      <img src={prismLogoIcon} alt="" style={{ width: '20px', height: '20px' }} />
                    ) : (
                      <img
                        src={tab.icon!}
                        alt=""
                        style={{
                          width: tab.id === 'insights' ? '20px' : '21px',
                          height: tab.id === 'insights' ? '20px' : '21px',
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: isActive ? 590 : 510,
                        color: isActive ? tab.activeColor : '#454545',
                        letterSpacing: '-0.8px',
                      }}
                    >
                      {tab.label}
                    </span>
                  </Tab>
                )
              })}
            </TabList>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              id="document-panel-prism"
              role="tabpanel"
              hidden={activeStatusTab !== 'prism'}
              style={{ display: activeStatusTab === 'prism' ? 'contents' : undefined }}
            >
              <PrismChatPanel {...props} />
            </div>

            <div
              id="document-panel-insights"
              role="tabpanel"
              hidden={activeStatusTab !== 'insights'}
              style={{ display: activeStatusTab === 'insights' ? 'contents' : undefined }}
            >
              <InsightsPanel
                active={activeStatusTab === 'insights'}
                documentId={uuid}
                model={props.insights}
                onAskPrism={(prompt) => {
                  setActiveStatusTab('prism')
                  setInputText(prompt)
                }}
                onFixRisk={handleOpenFixRiskModal}
              />
            </div>

            <div
              id="document-panel-comments"
              role="tabpanel"
              hidden={activeStatusTab !== 'comments'}
              style={{ display: activeStatusTab === 'comments' ? 'contents' : undefined }}
            >
              <CommentsPanel
                active={activeStatusTab === 'comments'}
                canComment={canCommentDocument}
                canResolve={canResolveComments}
                documentId={uuid}
                model={commentsModel}
              />
            </div>

            <div
              id="document-panel-audit"
              role="tabpanel"
              hidden={activeStatusTab !== 'audit'}
              style={{ display: activeStatusTab === 'audit' ? 'contents' : undefined }}
            >
              <AuditPanel active={activeStatusTab === 'audit'} model={audit} />
            </div>
          </div>
        </Tabs>
      </div>
    </>
  )
}
