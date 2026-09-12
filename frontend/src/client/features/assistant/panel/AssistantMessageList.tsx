import { useEffect, useState, type RefObject } from 'react'
import ReactMarkdown from 'react-markdown'
import aiAvatar from '../../../assets/conversation/prism.gif'
import FileTypeIcon from '../../../components/FileTypeIcon'
import { useLazyGetDocumentUrlQuery } from '../../documents/documentsApi'
import { ChatStreamArtifacts } from '../stream/ChatStreamArtifacts'
import { isImageFile, isValidUUID, parseMessageContent } from './messageModel'
import { WizardMessage } from './PanelDialogs'
import type { PanelChatMessage } from './types'
import type { AttachedFile } from '../composer/ChatInputConfig'

function ImageFilePreview({ file }: { file: AttachedFile }) {
  const [imageUrl, setImageUrl] = useState<string | null>(file.previewUrl || null)
  const [triggerGetUrl] = useLazyGetDocumentUrlQuery()
  const documentId = file.source.kind === 'stored-document' ? file.source.documentId : undefined

  useEffect(() => {
    if (file.previewUrl) {
      setImageUrl(file.previewUrl)
      return
    }
    if (documentId && !file.previewUrl && isValidUUID(documentId)) {
      triggerGetUrl({ documentId, inline: true })
        .unwrap()
        .then((result) => {
          setImageUrl(result.url)
        })
        .catch(() => {
          setImageUrl(null)
        })
    }
  }, [documentId, file.previewUrl, triggerGetUrl])

  if (!imageUrl) {
    return (
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '12px',
          backgroundColor: '#F3F4F6',
          border: '1px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="1.5" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="#9CA3AF" />
          <path
            d="M21 15L16 10L5 21"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '80px',
        height: '80px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #BFDBFE',
      }}
    >
      <img
        src={imageUrl}
        alt={file.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

interface AssistantMessageListProps {
  messages: PanelChatMessage[]
  isSending: boolean
  endRef: RefObject<HTMLDivElement | null>
  onCompleteWizard: (index: number) => void
  onCancelWizard: (index: number) => void
  onGenerateDocument: (prompt: string) => void
}

export function AssistantMessageList({
  messages,
  isSending,
  endRef,
  onCompleteWizard,
  onCancelWizard,
  onGenerateDocument,
}: AssistantMessageListProps) {
  return (
    <div
      className="hide-scrollbar"
      aria-busy={isSending}
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingRight: '8px',
      }}
    >
      {messages.map((message, index) => {
        const parsedContent =
          message.role === 'assistant' ? parseMessageContent(message.content) : message.content
        if (message.role === 'assistant' && !parsedContent && !message.wizardData) return null

        if (message.wizardData && !message.wizardData.completed) {
          return (
            <WizardMessage
              key={index}
              wizard={message.wizardData}
              parsedContent={parsedContent}
              isStreaming={!!message.isStreaming}
              onComplete={() => onCompleteWizard(index)}
              onCancel={() => onCancelWizard(index)}
              onGenerate={onGenerateDocument}
            />
          )
        }

        return (
          <div
            key={index}
            aria-busy={message.role === 'assistant' ? !!message.isStreaming : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {message.attachedFiles && message.attachedFiles.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '8px',
                }}
              >
                {message.attachedFiles.map((file) =>
                  isImageFile(file.type || '', file.name) ? (
                    <ImageFilePreview key={file.id} file={file} />
                  ) : (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                      }}
                    >
                      <FileTypeIcon filename={file.name} size="32px" />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 510,
                          letterSpacing: '-0.24px',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
            <div
              style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: message.role === 'user' ? '#272727' : '#F7F7F7',
                color: message.role === 'user' ? '#FFFFFF' : '#454545',
              }}
            >
              {message.role === 'assistant' ? (
                <div
                  className="ai-message-content"
                  style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '1.6',
                    letterSpacing: '-0.28px',
                  }}
                >
                  <ChatStreamArtifacts
                    reasoning={message.reasoning}
                    tools={message.tools}
                    sources={message.sources}
                    documents={message.documents}
                    isStreaming={message.isStreaming}
                  />
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            margin: '16px 0 8px',
                            color: '#272727',
                          }}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2
                          style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            margin: '14px 0 6px',
                            color: '#272727',
                          }}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            margin: '12px 0 6px',
                            color: '#272727',
                          }}
                        >
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            margin: '10px 0 4px',
                            color: '#272727',
                          }}
                        >
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p style={{ margin: '0 0 10px', lineHeight: '1.6' }}>{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>
                      ),
                      li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: 600 }}>{children}</strong>
                      ),
                      em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                      code: ({ children }) => (
                        <code
                          style={{
                            backgroundColor: '#E8E8E8',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote
                          style={{
                            borderLeft: '3px solid #D0D0D0',
                            paddingLeft: '12px',
                            margin: '8px 0',
                            color: '#666',
                          }}
                        >
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {parsedContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '20px',
                      letterSpacing: '-0.28px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {parsedContent}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {isSending && (
        <div
          aria-hidden="true"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={aiAvatar} alt="AI" style={{ width: '24px', height: '30px' }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#999',
                  animation: 'bounce 1.4s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#999',
                  animation: 'bounce 1.4s ease-in-out 0.2s infinite',
                }}
              />
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#999',
                  animation: 'bounce 1.4s ease-in-out 0.4s infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
