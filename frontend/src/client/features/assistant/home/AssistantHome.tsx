import { useMemo, useRef, useState } from 'react'
import clockIcon from '../../../assets/conversation/clock-icon.svg'
import logoDark from '../../../assets/logo.svg'
import { createFileAddOption, type AttachedFile } from '../composer/ChatInputConfig'
import { Button } from '../../../components/ui/Button'
import { useResponsive } from '../../../hooks'
import { useGetTemplatesQuery } from '../../templates/templatesApi'
import ChatInput, { type ChatInputRef } from '../composer/ChatInput'
import { CompareDocuments } from '../compare/CompareDocuments'
import { AssistantModeControls } from './AssistantModeControls'
import {
  createInitialCompareDocuments,
  mapAssistantTemplates,
  type AssistantConversationRequest,
  type AssistantMode,
  type CompareDocument,
} from './assistantHomeModel'
import { usePromptImprovement } from '../composer/usePromptImprovement'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface AssistantHomeProps {
  onHistory: () => void
  onStartConversation: (request: AssistantConversationRequest) => void
}

export function AssistantHome({ onHistory, onStartConversation }: AssistantHomeProps) {
  const { isMobile } = useResponsive()
  const inputRef = useRef<ChatInputRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inputText, setInputText] = useState('')
  const [activeMode, setActiveMode] = useState<AssistantMode>('initial')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [compareDocuments, setCompareDocuments] = useState<CompareDocument[]>(
    createInitialCompareDocuments,
  )
  const { data: apiTemplates, isLoading: isLoadingTemplates } = useGetTemplatesQuery({
    type: 'system',
  })
  const { improvePrompt, isImprovingPrompt } = usePromptImprovement()

  const templates = useMemo(() => mapAssistantTemplates(apiTemplates), [apiTemplates])

  const handleModeChange = (mode: AssistantMode) => {
    if (activeMode === mode) {
      setActiveMode('initial')
      return
    }

    if (activeMode === 'compare') {
      setCompareDocuments((current) => {
        current.forEach((document) => {
          if (document.previewUrl) URL.revokeObjectURL(document.previewUrl)
        })
        return createInitialCompareDocuments()
      })
    } else {
      attachedFiles.forEach((file) => {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl)
      })
      setAttachedFiles([])
    }

    setActiveMode(mode)
    if (mode === 'summarize') {
      setInputText('Summarize the key points and important terms from my document')
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files?.length) {
      const newFiles: AttachedFile[] = Array.from(files).map((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        const isImage =
          file.type.startsWith('image/') ||
          ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
        return {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: file.name,
          size: file.size,
          type: file.type || `image/${ext}`,
          source: { kind: 'local-file', file },
          previewUrl: isImage ? URL.createObjectURL(file) : null,
        }
      })
      setAttachedFiles((current) => [...current, ...newFiles])
    }
    event.target.value = ''
  }

  const handleSend = () => {
    const message = inputText.trim()
    if (!message) return

    const files: AttachedFile[] =
      activeMode === 'compare'
        ? compareDocuments.flatMap((document) =>
            document.file
              ? [
                  {
                    id: `${document.file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                    name: document.file.name,
                    size: document.file.size,
                    type: document.file.type,
                    source: { kind: 'local-file', file: document.file },
                  },
                ]
              : [],
          )
        : attachedFiles
    const request: AssistantConversationRequest = { message, files }

    onStartConversation(request)
    setInputText('')
  }

  const handlePromptClick = (prompt: string) => {
    setInputText(prompt)
    inputRef.current?.focus()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#F5F5F5',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 24px',
          backgroundColor: '#F5F5F5',
        }}
      >
        <Button
          onClick={onHistory}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDEDED',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            fontFamily,
          }}
        >
          <img src={clockIcon} alt="" style={{ width: '16px', height: '16px' }} />
          History
        </Button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '0 24px 100px 24px',
          paddingTop: '15vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex' }}>
          <img
            src={logoDark}
            alt=""
            style={{ width: '40px', height: '40px', marginRight: '16px' }}
          />
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: '#272727',
              letterSpacing: '-0.96px',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            How may I assist you?
          </h1>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          aria-label="Upload documents"
          multiple
          accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.webp,.bmp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {activeMode === 'compare' && (
          <CompareDocuments documents={compareDocuments} onChange={setCompareDocuments} />
        )}

        <div style={{ width: '100%', maxWidth: '780px', marginBottom: '16px' }}>
          <ChatInput
            ref={inputRef}
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            placeholders={['Ask anything about your documents...']}
            animatePlaceholder={false}
            attachedFiles={attachedFiles}
            attachedFileVariant="preview-box"
            onRemoveFile={(fileId) => {
              setAttachedFiles((current) => {
                const removed = current.find((file) => file.id === fileId)
                if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
                return current.filter((file) => file.id !== fileId)
              })
            }}
            onFileDrop={(file) => {
              if (file.source.kind === 'local-file' && !file.previewUrl) {
                const ext = file.name.split('.').pop()?.toLowerCase() || ''
                const isImage =
                  file.source.file.type.startsWith('image/') ||
                  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
                if (isImage) file.previewUrl = URL.createObjectURL(file.source.file)
              }
              setAttachedFiles((current) => [...current, file])
            }}
            addOptions={[createFileAddOption(() => fileInputRef.current?.click())]}
            onCreateClick={() => handleModeChange('create')}
            createActive={activeMode === 'create'}
            showImprovePrompt
            onImprovePrompt={improvePrompt}
            isImprovingPrompt={isImprovingPrompt}
            dropdownPosition="top"
          />
        </div>

        <AssistantModeControls
          activeMode={activeMode}
          isMobile={isMobile}
          templates={templates}
          isLoadingTemplates={isLoadingTemplates}
          onModeChange={handleModeChange}
          onPromptClick={handlePromptClick}
        />
      </div>

      <style>
        {`
          @keyframes slideDownFadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideUpFadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  )
}
