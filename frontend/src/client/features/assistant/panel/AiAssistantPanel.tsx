import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useResponsive } from '../../../hooks'
import geminiIcon from '../../../assets/models/gemini-icon.png'
import { AssistantComposer, AssistantFileInput } from './AssistantComposer'
import { AssistantMessageList } from './AssistantMessageList'
import { CompareEmptyState, CompareFileInput } from './CompareFlow'
import { HistoryList } from './HistoryList'
import { CollapsedPanel, PanelFrame, PanelHeader } from './PanelChrome'
import { CreateDocumentDialog } from './PanelDialogs'
import { visuallyHiddenStyle } from './panelStyles'
import { useAssistantComposer } from './useAssistantComposer'
import { useAssistantRuntime } from './useAssistantRuntime'
import { useCompareFlow } from './useCompareFlow'
import { useResizablePanel } from './useResizablePanel'
import { WelcomeActions, type AssistantActionId } from './WelcomeActions'
import type { AIModel, AiAssistantPanelProps } from './types'

const aiModels: AIModel[] = [{ id: 'gemini', name: 'Gemini 3.1', icon: geminiIcon }]

export default function AiAssistantPanel({
  userName = 'User',
  collapsed,
  onToggle,
  width,
  onWidthChange,
  minWidth = 320,
  maxWidth = 800,
  projectId,
  workspaceId,
  displayedDocument,
  displayedFile,
  onRefetch,
  hideActionCards = false,
  isProjectsEmpty = false,
  onCreateProject,
  continueWorkingContent,
}: AiAssistantPanelProps) {
  const navigate = useNavigate()
  const { isTablet } = useResponsive()
  const { user } = useAuth()
  const [selectedModel] = useState<AIModel>(aiModels[0])
  const [showHistory, setShowHistory] = useState(false)
  const [showCreateDocumentModal, setShowCreateDocumentModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelWidth = width || (isTablet ? 360 : 480)
  const runtime = useAssistantRuntime({
    projectId,
    workspaceId,
    displayedDocument,
    displayedFile,
    onRefetch,
  })
  const composer = useAssistantComposer()
  const compare = useCompareFlow(() => navigate('/review'))
  const resize = useResizablePanel({ panelWidth, minWidth, maxWidth, onWidthChange })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [runtime.messages])

  const handleSendMessage = async (messageOverride?: string) => {
    const text = messageOverride ?? composer.inputText
    if (!text.trim() || runtime.isSending) return

    const files = [...composer.attachedFiles]
    composer.clearMessage()
    await runtime.sendMessage({ text, files, modelId: selectedModel.id })
  }

  const handleAction = (action: AssistantActionId) => {
    if (action === 'upload') composer.fileInputRef.current?.click()
    if (action === 'compare') compare.open()
    if (action === 'tabular') {
      navigate('/review')
    } else if (action === 'create') {
      navigate('/documents/new')
    }
  }

  if (collapsed) {
    return (
      <CollapsedPanel
        showHistory={showHistory}
        onShowHistory={() => {
          setShowHistory(true)
          onToggle()
        }}
        onToggle={onToggle}
      />
    )
  }

  return (
    <>
      <AssistantFileInput inputRef={composer.fileInputRef} onChange={composer.handleFileChange} />
      <CompareFileInput inputRef={compare.fileInputRef} onChange={compare.handleFileChange} />
      <span role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {runtime.isSending ? 'Assistant is responding' : ''}
      </span>
      <CreateDocumentDialog
        open={showCreateDocumentModal}
        projectId={projectId}
        workspaceId={workspaceId}
        onClose={() => setShowCreateDocumentModal(false)}
        onContinue={(documentId) => navigate(`/documents/${documentId}`)}
      />
      <PanelFrame
        panelWidth={panelWidth}
        isTablet={isTablet}
        isSending={runtime.isSending}
        isResizing={resize.isResizing}
        resizable={onWidthChange !== undefined}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onResizeMouseDown={resize.handleMouseDown}
        onResizeKeyDown={resize.handleKeyDown}
      >
        {compare.isOpen && compare.documents.length === 0 && (
          <CompareEmptyState
            onBack={compare.close}
            onBrowse={() => compare.fileInputRef.current?.click()}
          />
        )}

        {!compare.isOpen && (
          <>
            <PanelHeader
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory((current) => !current)}
              onTogglePanel={onToggle}
            />

            {showHistory ? (
              <HistoryList
                chats={runtime.historyChats}
                isLoading={runtime.isLoadingHistory}
                onOpenChat={runtime.loadHistoryChat}
                onClose={() => setShowHistory(false)}
              />
            ) : (
              <>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '32px',
                    overflow: 'hidden',
                    minHeight: 0,
                  }}
                >
                  {runtime.messages.length > 0 ? (
                    <AssistantMessageList
                      messages={runtime.messages}
                      isSending={runtime.isSending}
                      endRef={messagesEndRef}
                      onCompleteWizard={runtime.completeWizard}
                      onCancelWizard={runtime.cancelWizard}
                      onGenerateDocument={(prompt) => {
                        void handleSendMessage(prompt)
                      }}
                    />
                  ) : (
                    <WelcomeActions
                      userName={userName}
                      displayName={user?.displayName}
                      projectId={projectId}
                      workspaceId={workspaceId}
                      hideActionCards={hideActionCards}
                      isProjectsEmpty={isProjectsEmpty}
                      onCreateProject={onCreateProject}
                      continueWorkingContent={continueWorkingContent}
                      onAction={handleAction}
                      onSendPrompt={(prompt) => {
                        void handleSendMessage(prompt)
                      }}
                    />
                  )}
                </div>
                <AssistantComposer
                  inputText={composer.inputText}
                  onInputChange={composer.setInputText}
                  onSend={() => {
                    void handleSendMessage()
                  }}
                  isSending={runtime.isSending}
                  attachedFiles={composer.attachedFiles}
                  onRemoveFile={composer.removeFile}
                  onAddFiles={() => composer.fileInputRef.current?.click()}
                  onFileDrop={composer.addDroppedFile}
                  onImprovePrompt={composer.improvePrompt}
                  isImprovingPrompt={composer.isImprovingPrompt}
                />
              </>
            )}
          </>
        )}
      </PanelFrame>
    </>
  )
}

export type { AiAssistantPanelProps } from './types'
