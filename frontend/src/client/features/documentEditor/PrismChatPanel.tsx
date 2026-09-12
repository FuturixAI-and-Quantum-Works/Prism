import { ChatStreamArtifacts as ChatArtifacts } from '../assistant/stream/ChatStreamArtifacts'
import type { DocumentEditorRightPanelProps } from './DocumentEditorRightPanel'
import { ChatComposer } from './ChatComposer'
import { ChatActionCards } from './ChatActionCards'
import { ChatMessageList } from './ChatMessageList'
import { ChatStreamState } from './ChatStreamState'
import { ChatWelcomeState } from './ChatWelcomeState'

function SessionLoadingState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        className="loading-spinner"
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid #EDEDED',
          borderTopColor: '#454545',
          borderRadius: '50%',
        }}
      />
      <span style={{ fontSize: '14px', color: '#797979', fontWeight: 500 }}>Loading...</span>
    </div>
  )
}

export function PrismChatPanel(props: DocumentEditorRightPanelProps) {
  if (props.activeStatusTab !== 'prism') return null

  const hasConversation =
    props.chatMessages.length > 0 ||
    !!props.placeholderTool ||
    props.pendingDocumentEdits.length > 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {props.sessionContextLoading && props.uuid ? (
        <SessionLoadingState />
      ) : (
        <>
          <div
            className="doc-editor-scroll"
            style={{
              flex: 1,
              padding: '20px',
              paddingBottom: '0',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              overflowY: 'auto',
            }}
          >
            {hasConversation ? (
              <div
                className="doc-editor-panel"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  paddingRight: '4px',
                }}
              >
                <ChatMessageList
                  messages={props.chatMessages}
                  editor={props.tiptapEditor}
                  matchIndexes={props.bottleneckMatchIndexes}
                  onNavigateBottleneck={props.scrollAndHighlightBottleneck}
                  setMatchIndexes={props.setBottleneckMatchIndexes}
                />
                <ChatActionCards
                  actionId={props.editActionId}
                  canEdit={props.canEditDocument}
                  canFill={props.canFillPlaceholders}
                  compareTool={props.compareTool}
                  documentId={props.uuid}
                  edits={props.pendingDocumentEdits}
                  extractTool={props.extractTool}
                  onChangePlaceholder={props.handlePlaceholderValueChange}
                  onDismissClauses={props.dismissClauses}
                  onDismissCompare={props.dismissCompare}
                  onDismissSuggestions={props.dismissSuggestions}
                  onResolveEdit={props.handleResolveTrackedEdit}
                  onSavePlaceholders={props.handleSavePlaceholderDetails}
                  placeholderTool={props.placeholderTool}
                  placeholderValues={props.placeholderValues}
                  suggestTool={props.suggestTool}
                />
                <ChatArtifacts
                  reasoning={props.reasoningText}
                  sources={props.sourceResults}
                  tools={props.toolArtifacts}
                />
                <ChatStreamState
                  cleanText={props.cleanStreamingText}
                  isSending={props.isSending}
                  isStreaming={props.isStreaming}
                  rawText={props.streamingText}
                />
                <div ref={props.messagesEndRef} />
              </div>
            ) : (
              <ChatWelcomeState
                onSelectSuggestion={(text) => {
                  props.setInputText(text)
                  props.handleSendMessage(text)
                }}
                suggestions={props.suggestions}
                userName={props.userName}
              />
            )}
          </div>
          <ChatComposer {...props} />
        </>
      )}
    </div>
  )
}
