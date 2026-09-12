import type { AttachedFile } from '../composer/ChatInputConfig'
import { NewTemplateModal } from '../dialogs/NewTemplateModal'
import { ConversationComposer } from './ConversationComposer'
import { ConversationLayout } from './ConversationLayout'
import { ConversationMessageList } from './ConversationMessageList'
import { ConversationSidebar } from './ConversationSidebar'
import { useConversationController } from './useConversationController'

export interface ConversationScreenProps {
  onBack?: () => void
  initialMessage?: string
  initialFile?: AttachedFile | null
  initialFiles?: AttachedFile[]
  chatId?: string | null
  showBackButton?: boolean
  showWelcome?: boolean
  showSidebar?: boolean
  userName?: string
  onChatNotFound?: () => void
}

export default function ConversationScreen({
  onBack,
  initialMessage,
  initialFile,
  initialFiles,
  chatId,
  showBackButton = true,
  showWelcome = false,
  showSidebar = true,
  userName = 'there',
  onChatNotFound,
}: ConversationScreenProps) {
  const controller = useConversationController({
    onBack,
    initialMessage,
    initialFile,
    initialFiles,
    chatId,
    onChatNotFound,
  })

  return (
    <ConversationLayout
      showSidebar={showSidebar}
      showBackButton={showBackButton}
      isLoading={controller.isLoading}
      onBack={controller.handleBackToDashboard}
      sidebar={
        <ConversationSidebar
          activeTab={controller.activeTab}
          selectedHistoryId={controller.selectedHistoryId}
          search={controller.sidebarSearch}
          historyItems={controller.filteredHistoryItems}
          templates={controller.filteredTemplates}
          isLoadingHistory={controller.isLoadingChats}
          isLoadingTemplates={controller.isLoadingTemplates}
          onNewChat={controller.handleNewChat}
          onSearchChange={controller.setSidebarSearch}
          onTabChange={controller.setActiveTab}
          onHistoryClick={controller.handleHistoryClick}
          onNewTemplate={() => controller.setNewTemplateModalOpen(true)}
        />
      }
      overlays={
        controller.newTemplateModalOpen ? (
          <NewTemplateModal
            onClose={() => controller.setNewTemplateModalOpen(false)}
            onCreate={controller.handleCreateTemplate}
            isCreating={controller.isCreatingTemplate}
            error={controller.templateError}
          />
        ) : null
      }
    >
      <ConversationMessageList
        messages={controller.messages}
        attachedFiles={controller.attachedFiles}
        isLoading={controller.isLoading}
        isMobile={controller.isMobile}
        showWelcome={showWelcome}
        userName={userName}
        messagesContainerRef={controller.messagesContainerRef}
        messagesEndRef={controller.messagesEndRef}
        onFollowUpClick={controller.setInputText}
      />
      <ConversationComposer
        inputText={controller.inputText}
        pendingFiles={controller.pendingFiles}
        chatError={controller.chatError}
        isLoading={controller.isLoading}
        isImprovingPrompt={controller.isImprovingPrompt}
        isMobile={controller.isMobile}
        fileInputRef={controller.fileInputRef}
        chatInputRef={controller.chatInputRef}
        onInputChange={controller.setInputText}
        onSend={controller.handleSend}
        onFileChange={controller.handleFileChange}
        onRemoveFile={controller.handleRemovePendingFile}
        onFileDrop={controller.handleFileDrop}
        onImprovePrompt={controller.handleImprovePrompt}
        onDismissError={() => controller.setChatError(null)}
      />
    </ConversationLayout>
  )
}
