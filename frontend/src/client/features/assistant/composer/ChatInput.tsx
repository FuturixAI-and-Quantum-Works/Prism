import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import {
  defaultPlaceholders,
  PROMPT_IMPROVEMENT_FAILURE_MESSAGE,
  type AddOption,
  type AttachedFile,
  type PromptImprovementHandler,
} from './ChatInputConfig'
import { AttachedDocument, AttachedDocumentPreviewBox } from './ChatInputAttachments'
import { ChatInputToolbar } from './ChatInputToolbar'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isSending?: boolean
  disabled?: boolean
  placeholders?: string[]
  animatePlaceholder?: boolean
  minHeight?: number
  maxHeight?: number

  attachedFiles?: AttachedFile[]
  onRemoveFile?: (fileId: string) => void
  onFileDrop?: (file: AttachedFile) => void
  attachedFileVariant?: 'default' | 'preview-box'
  attachedFileSize?: 'default' | 'small'

  addOptions?: readonly AddOption[]

  showCreateButton?: boolean
  onCreateClick?: () => void
  createActive?: boolean

  showImprovePrompt?: boolean
  onImprovePrompt?: PromptImprovementHandler
  isImprovingPrompt?: boolean

  variant?: 'default' | 'panel' | 'minimal'
  dropdownPosition?: 'top' | 'bottom'
}

export interface ChatInputRef {
  focus: () => void
  clear: () => void
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      value,
      onChange,
      onSend,
      isSending = false,
      disabled = false,
      placeholders = defaultPlaceholders,
      animatePlaceholder = true,
      minHeight = 40,
      maxHeight = 120,

      attachedFiles = [],
      onRemoveFile,
      onFileDrop,
      attachedFileVariant = 'default',
      attachedFileSize = 'default',

      addOptions = [],

      showCreateButton = true,
      onCreateClick,
      createActive = false,

      showImprovePrompt = false,
      onImprovePrompt,
      isImprovingPrompt = false,

      variant = 'default',
      dropdownPosition = 'bottom',
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const addDropdownRef = useRef<HTMLDivElement>(null)
    const addTriggerRef = useRef<HTMLButtonElement>(null)
    const addDropdownId = useId()

    const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false)
    const [placeholderIndex, setPlaceholderIndex] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)
    const [promptImprovementError, setPromptImprovementError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => onChange(''),
    }))

    useEffect(() => {
      if (!animatePlaceholder || placeholders.length <= 1) return

      const interval = setInterval(() => {
        setIsAnimating(true)
        setTimeout(() => {
          setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
          setIsAnimating(false)
        }, 300)
      }, 3000)

      return () => clearInterval(interval)
    }, [animatePlaceholder, placeholders.length])

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        if (addDropdownRef.current && !addDropdownRef.current.contains(target)) {
          setIsAddDropdownOpen(false)
        }
      }
      if (isAddDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isAddDropdownOpen])

    useEffect(() => {
      if (!isAddDropdownOpen) return

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return

        event.preventDefault()
        setIsAddDropdownOpen(false)
        addTriggerRef.current?.focus()
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isAddDropdownOpen])

    useEffect(() => {
      if (isAddDropdownOpen) {
        addDropdownRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
      }
    }, [isAddDropdownOpen])

    useEffect(() => {
      setPromptImprovementError(null)
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!disabled && !isSending && value.trim()) {
          onSend()
        }
      }
    }

    const handleAddOptionSelect = (option: AddOption) => {
      option.onSelect()
      setIsAddDropdownOpen(false)
      addTriggerRef.current?.focus()
    }

    const handleMenuKeyDown = (
      event: React.KeyboardEvent<HTMLDivElement>,
      closeMenu: () => void,
    ) => {
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
      )
      const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)

      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
        return
      }
      if (event.key === 'Tab') {
        closeMenu()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || items.length === 0) {
        return
      }

      event.preventDefault()
      const nextIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : event.key === 'ArrowDown'
              ? (currentIndex + 1) % items.length
              : (currentIndex - 1 + items.length) % items.length
      items[nextIndex]?.focus()
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0 && onFileDrop) {
        Array.from(files).forEach((file) => {
          onFileDrop({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            source: { kind: 'local-file', file },
          })
        })
      }
    }

    const handlePromptImprovement = async (text: string) => {
      if (!onImprovePrompt) return

      try {
        const result = await onImprovePrompt(text)
        if (result.kind === 'improved') {
          setPromptImprovementError(null)
          onChange(result.text)
          return
        }
        setPromptImprovementError(result.message)
      } catch {
        setPromptImprovementError(PROMPT_IMPROVEMENT_FAILURE_MESSAGE)
      }
    }

    const dropdownPositionStyle =
      dropdownPosition === 'top'
        ? { bottom: '100%', marginBottom: '4px' }
        : { top: '100%', marginTop: '4px' }

    const containerStyle: React.CSSProperties =
      variant === 'panel'
        ? {
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #EDEDED',
            padding: '16px',
            boxShadow: '0px 0px 16px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }
        : {
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #EDEDED',
            padding: '16px',
            boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }

    return (
      <div
        style={{ width: '100%' }}
        aria-busy={isSending || isImprovingPrompt}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {isImprovingPrompt ? 'Improving prompt' : isSending ? 'Sending message' : ''}
        </span>
        {attachedFiles.length > 0 && onRemoveFile && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: attachedFileSize === 'small' ? '6px' : '8px',
              marginBottom: attachedFileSize === 'small' ? '8px' : '12px',
              width: attachedFileVariant === 'preview-box' ? 'auto' : '100%',
            }}
          >
            {attachedFiles.map((file) =>
              attachedFileVariant === 'preview-box' ? (
                <AttachedDocumentPreviewBox
                  key={file.id}
                  file={file}
                  onRemove={() => onRemoveFile(file.id)}
                  size={attachedFileSize}
                />
              ) : (
                <AttachedDocument
                  key={file.id}
                  file={file}
                  onRemove={() => onRemoveFile(file.id)}
                />
              ),
            )}
          </div>
        )}

        <div
          style={{
            ...containerStyle,
            ...(isDragOver
              ? {
                  backgroundColor: variant === 'panel' ? '#F0F7FF' : '#F8FBFF',
                }
              : {}),
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: `${minHeight}px`,
              marginBottom: variant === 'panel' ? 0 : '16px',
            }}
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isImprovingPrompt}
              aria-label="Message Prism"
              aria-busy={isImprovingPrompt}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                fontWeight: 400,
                color: isImprovingPrompt ? 'transparent' : '#272727',
                backgroundColor: 'transparent',
                fontFamily,
                resize: 'none',
                minHeight: `${minHeight}px`,
                maxHeight: `${maxHeight}px`,
                letterSpacing: '-0.8px',
                lineHeight: '21px',
                position: 'relative',
                zIndex: 1,
              }}
            />
            {isImprovingPrompt && value && (
              <div
                className="shimmer-text"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  fontSize: '16px',
                  fontWeight: 400,
                  fontFamily,
                  letterSpacing: '-0.8px',
                  lineHeight: '21px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  pointerEvents: 'none',
                }}
              >
                {value}
              </div>
            )}
            {!value && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '21px',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#9CA3AF',
                    fontFamily,
                    letterSpacing: '-0.8px',
                    lineHeight: '21px',
                    transform: isAnimating ? 'translateY(-100%)' : 'translateY(0)',
                    opacity: isAnimating ? 0 : 1,
                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                  }}
                >
                  {placeholders[placeholderIndex]}
                </div>
              </div>
            )}
          </div>

          <ChatInputToolbar
            value={value}
            onSend={onSend}
            isSending={isSending}
            disabled={disabled}
            addOptions={addOptions}
            isAddDropdownOpen={isAddDropdownOpen}
            addDropdownRef={addDropdownRef}
            addTriggerRef={addTriggerRef}
            addDropdownId={addDropdownId}
            onToggleAddDropdown={() => {
              setIsAddDropdownOpen(!isAddDropdownOpen)
            }}
            onCloseAddDropdown={() => {
              setIsAddDropdownOpen(false)
              addTriggerRef.current?.focus()
            }}
            onAddOptionSelect={handleAddOptionSelect}
            showCreateButton={showCreateButton}
            onCreateClick={onCreateClick}
            createActive={createActive}
            showImprovePrompt={showImprovePrompt}
            onImprovePrompt={handlePromptImprovement}
            isImprovingPrompt={isImprovingPrompt}
            dropdownPositionStyle={dropdownPositionStyle}
            onMenuKeyDown={handleMenuKeyDown}
          />
        </div>

        {promptImprovementError && (
          <p
            role="alert"
            style={{
              color: '#B91C1C',
              fontFamily,
              fontSize: '13px',
              lineHeight: '18px',
              margin: '8px 4px 0',
            }}
          >
            {promptImprovementError}
          </p>
        )}

        <style>
          {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          .shimmer-text {
            background: linear-gradient(
              90deg,
              #272727 25%,
              #6366f1 50%,
              #272727 75%
            );
            background-size: 200% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 1.5s infinite linear;
          }
        `}
        </style>
      </div>
    )
  },
)

ChatInput.displayName = 'ChatInput'

export default ChatInput
