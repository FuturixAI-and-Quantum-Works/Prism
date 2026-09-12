import { ChatComposerPresentation } from './ChatComposerPresentation'
import { ChatComposerToolbar } from './ChatComposerToolbar'
import { getComposerStatusText, type ChatComposerProps } from './chatComposerModel'

export function ChatComposer({
  handleKeyDown,
  handleSendMessage,
  inputText,
  isAnimating,
  isSending,
  isStreaming,
  placeholderIndex,
  setInputText,
}: ChatComposerProps) {
  const toolbar = (
    <ChatComposerToolbar
      inputText={inputText}
      isSending={isSending}
      onSend={() => handleSendMessage()}
    />
  )

  return (
    <ChatComposerPresentation
      handleKeyDown={handleKeyDown}
      inputText={inputText}
      isAnimating={isAnimating}
      isBusy={isSending || isStreaming}
      onInputChange={setInputText}
      placeholderIndex={placeholderIndex}
      statusText={getComposerStatusText(isSending, isStreaming)}
      toolbar={toolbar}
    />
  )
}
