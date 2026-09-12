import type { ChangeEvent, RefObject } from 'react'
import {
  createFileAddOption,
  type AttachedFile,
  type PromptImprovementHandler,
} from '../composer/ChatInputConfig'
import ChatInput from '../composer/ChatInput'

export function AssistantFileInput({
  inputRef,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      aria-label="Upload documents to the assistant"
      multiple
      accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.webp,.bmp"
      onChange={onChange}
      style={{ display: 'none' }}
    />
  )
}

interface AssistantComposerProps {
  inputText: string
  onInputChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  attachedFiles: AttachedFile[]
  onRemoveFile: (fileId: string) => void
  onAddFiles: () => void
  onFileDrop: (file: AttachedFile) => void
  onImprovePrompt: PromptImprovementHandler
  isImprovingPrompt: boolean
}

export function AssistantComposer({
  inputText,
  onInputChange,
  onSend,
  isSending,
  attachedFiles,
  onRemoveFile,
  onAddFiles,
  onFileDrop,
  onImprovePrompt,
  isImprovingPrompt,
}: AssistantComposerProps) {
  return (
    <div style={{ flexShrink: 0, paddingTop: '16px' }}>
      <ChatInput
        value={inputText}
        onChange={onInputChange}
        onSend={onSend}
        isSending={isSending}
        attachedFiles={attachedFiles}
        attachedFileVariant="preview-box"
        attachedFileSize="small"
        onRemoveFile={onRemoveFile}
        onFileDrop={onFileDrop}
        addOptions={[createFileAddOption(onAddFiles)]}
        showCreateButton={false}
        showImprovePrompt={true}
        onImprovePrompt={onImprovePrompt}
        isImprovingPrompt={isImprovingPrompt}
        variant="panel"
        dropdownPosition="top"
        minHeight={60}
      />
    </div>
  )
}
