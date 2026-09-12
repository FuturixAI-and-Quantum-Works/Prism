import type { ChangeEvent, RefObject } from 'react'
import {
  createFileAddOption,
  type AttachedFile,
  type PromptImprovementHandler,
} from '../composer/ChatInputConfig'
import { IconButton } from '../../../components/ui/Button'
import ChatInput, { type ChatInputRef } from '../composer/ChatInput'

interface ConversationComposerProps {
  inputText: string
  pendingFiles: AttachedFile[]
  chatError: string | null
  isLoading: boolean
  isImprovingPrompt: boolean
  isMobile: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  chatInputRef: RefObject<ChatInputRef | null>
  onInputChange: (value: string) => void
  onSend: () => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (fileId: string) => void
  onFileDrop: (file: AttachedFile) => void
  onImprovePrompt: PromptImprovementHandler
  onDismissError: () => void
}

export function ConversationComposer({
  inputText,
  pendingFiles,
  chatError,
  isLoading,
  isImprovingPrompt,
  isMobile,
  fileInputRef,
  chatInputRef,
  onInputChange,
  onSend,
  onFileChange,
  onRemoveFile,
  onFileDrop,
  onImprovePrompt,
  onDismissError,
}: ConversationComposerProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Attach files to conversation"
        multiple
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      {chatError && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'absolute',
            bottom: '200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '814px',
            maxWidth: `calc(100% - ${isMobile ? '20px' : '64px'})`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            zIndex: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#DC2626" strokeWidth="2" />
            <path d="M10 6V10.5" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="14" r="1" fill="#DC2626" />
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#DC2626', flex: 1 }}>
            {chatError}
          </span>
          <IconButton
            label="Dismiss error"
            onClick={onDismissError}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>
        </div>
      )}

      <div
        style={{
          position: 'relative',
          height: '170px',
          backgroundColor: '#F5F5F5',
          boxShadow: '0px -20px 40px 20px #F5F5F5',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '814px',
            maxWidth: `calc(100% - ${isMobile ? '20px' : '64px'})`,
          }}
        >
          <ChatInput
            ref={chatInputRef}
            value={inputText}
            onChange={onInputChange}
            onSend={onSend}
            isSending={isLoading}
            placeholders={['Ask anything about this document...']}
            animatePlaceholder={false}
            attachedFiles={pendingFiles}
            attachedFileVariant="preview-box"
            onRemoveFile={onRemoveFile}
            onFileDrop={onFileDrop}
            addOptions={[createFileAddOption(() => fileInputRef.current?.click())]}
            showCreateButton={false}
            showImprovePrompt
            onImprovePrompt={onImprovePrompt}
            isImprovingPrompt={isImprovingPrompt}
            variant="panel"
            minHeight={42}
          />
        </div>
      </div>
    </>
  )
}
