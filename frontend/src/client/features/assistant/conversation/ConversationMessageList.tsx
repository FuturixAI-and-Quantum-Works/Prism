import { useEffect, useState, type RefObject } from 'react'
import ReactMarkdown from 'react-markdown'
import aiAvatar from '../../../assets/conversation/prism.gif'
import type { AttachedFile } from '../composer/ChatInputConfig'
import FileTypeIcon from '../../../components/FileTypeIcon'
import { useLazyGetDocumentUrlQuery } from '../../documents/documentsApi'
import { ChatStreamArtifacts } from '../stream/ChatStreamArtifacts'
import {
  filterToolCallContent,
  generateFollowUps,
  getActionVisibility,
  getGreeting,
  getWelcomeMessage,
  isImageAttachment,
  type ConversationMessage,
} from './conversationModel'
import { ResponseActions } from './ResponseActions'

interface ImageFilePreviewProps {
  file: AttachedFile
}

function ImageFilePreview({ file }: ImageFilePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(file.previewUrl || null)
  const [triggerGetUrl] = useLazyGetDocumentUrlQuery()
  const documentId = file.source.kind === 'stored-document' ? file.source.documentId : undefined

  useEffect(() => {
    if (file.previewUrl) {
      setImageUrl(file.previewUrl)
      return
    }
    if (documentId && !file.previewUrl) {
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
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}

interface ConversationMessageListProps {
  messages: ConversationMessage[]
  attachedFiles: AttachedFile[]
  isLoading: boolean
  isMobile: boolean
  showWelcome: boolean
  userName: string
  messagesContainerRef: RefObject<HTMLDivElement | null>
  messagesEndRef: RefObject<HTMLDivElement | null>
  onFollowUpClick: (text: string) => void
}

export function ConversationMessageList({
  messages,
  attachedFiles,
  isLoading,
  isMobile,
  showWelcome,
  userName,
  messagesContainerRef,
  messagesEndRef,
  onFollowUpClick,
}: ConversationMessageListProps) {
  return (
    <div
      ref={messagesContainerRef}
      aria-busy={isLoading}
      style={{
        flex: 1,
        overflow: 'auto',
        padding: isMobile ? '32px 9px 68px' : '32px 100px 90px 100px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#F5f5f5',
      }}
    >
      <div style={{ maxWidth: '1013px', width: '100%', margin: '0 auto' }}>
        {showWelcome && messages.length === 0 && !isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '60px 20px',
              minHeight: '300px',
            }}
          >
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 590,
                color: '#272727',
                letterSpacing: '-1.2px',
                margin: '0 0 8px 0',
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif',
              }}
            >
              {getGreeting()}, {userName.split(' ')[0]}
            </h1>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 400,
                color: '#6B7280',
                letterSpacing: '-0.4px',
                lineHeight: '26px',
                margin: 0,
                maxWidth: '500px',
              }}
            >
              {getWelcomeMessage()}
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isEmptyStreamingMessage =
            message.role === 'assistant' &&
            message.isStreaming &&
            !message.content &&
            !message.tools?.length &&
            !message.reasoning &&
            !message.sources?.length &&
            !message.documents?.length

          if (isEmptyStreamingMessage) {
            return null
          }

          return (
            <div
              key={message.id}
              aria-busy={message.role === 'assistant' ? !!message.isStreaming : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '5px',
                marginBottom: '16px',
              }}
            >
              {message.role === 'user' ? (
                <>
                  {(() => {
                    const isFirstUserMessage =
                      messages.filter((candidate) => candidate.role === 'user')[0]?.id ===
                      message.id
                    const filesToShow = message.files?.length
                      ? message.files
                      : isFirstUserMessage
                        ? attachedFiles
                        : []
                    if (filesToShow.length === 0) return null
                    return (
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '8px',
                          justifyContent: 'flex-end',
                        }}
                      >
                        {filesToShow.map((file) => {
                          if (isImageAttachment(file)) {
                            return <ImageFilePreview key={file.id} file={file} />
                          }

                          return (
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
                              <FileTypeIcon filename={file.name} size="40px" />
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 510,
                                  color: '#1E40AF',
                                  letterSpacing: '-0.24px',
                                  maxWidth: '150px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {file.name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '15px',
                      padding: '10px',
                      maxWidth: '400px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#454545',
                        letterSpacing: '-0.28px',
                        lineHeight: '18px',
                        margin: 0,
                      }}
                    >
                      {message.content}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 510,
                        color: '#999999',
                        letterSpacing: '-0.6px',
                        lineHeight: '16px',
                      }}
                    >
                      {message.timestamp}
                    </span>
                    <div
                      style={{
                        width: '1px',
                        height: '14px',
                        backgroundColor: '#EDEDED',
                        transform: 'rotate(90deg)',
                      }}
                    />
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    width: '100%',
                  }}
                >
                  <img src={aiAvatar} alt="AI" style={{ width: '24px', height: '30px' }} />
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {message.title && (
                      <h3
                        data-assistant-content="true"
                        style={{
                          fontSize: '18px',
                          fontWeight: 510,
                          color: '#454545',
                          letterSpacing: '-0.9px',
                          lineHeight: '21px',
                          margin: 0,
                        }}
                      >
                        {message.title}
                      </h3>
                    )}
                    <ChatStreamArtifacts
                      reasoning={message.reasoning}
                      tools={message.tools}
                      sources={message.sources}
                      documents={message.documents}
                      isStreaming={message.isStreaming}
                    />
                    <div
                      data-assistant-content="true"
                      className={
                        message.isStreaming
                          ? 'streaming-cursor markdown-content'
                          : 'markdown-content'
                      }
                      style={{
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#454545',
                        letterSpacing: '-0.28px',
                        lineHeight: '22px',
                      }}
                    >
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1
                              style={{
                                fontSize: '20px',
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
                                fontSize: '18px',
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
                                fontSize: '16px',
                                fontWeight: 600,
                                margin: '12px 0 4px',
                                color: '#272727',
                              }}
                            >
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p style={{ margin: '8px 0', lineHeight: '22px' }}>{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li style={{ margin: '4px 0', lineHeight: '22px' }}>{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong style={{ fontWeight: 600 }}>{children}</strong>
                          ),
                          em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                          code: ({ children, className }) => {
                            const isInline = !className
                            return isInline ? (
                              <code
                                style={{
                                  backgroundColor: '#F3F4F6',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {children}
                              </code>
                            ) : (
                              <code
                                style={{
                                  display: 'block',
                                  backgroundColor: '#F3F4F6',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontFamily: 'monospace',
                                  overflowX: 'auto',
                                  margin: '8px 0',
                                }}
                              >
                                {children}
                              </code>
                            )
                          },
                          pre: ({ children }) => (
                            <pre
                              style={{
                                margin: '8px 0',
                                backgroundColor: '#F3F4F6',
                                padding: '12px',
                                borderRadius: '8px',
                                overflowX: 'auto',
                              }}
                            >
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote
                              style={{
                                borderLeft: '3px solid #7C3AED',
                                paddingLeft: '12px',
                                margin: '8px 0',
                                color: '#6B7280',
                                fontStyle: 'italic',
                              }}
                            >
                              {children}
                            </blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#7C3AED', textDecoration: 'underline' }}
                            >
                              {children}
                            </a>
                          ),
                          hr: () => (
                            <hr
                              style={{
                                border: 'none',
                                borderTop: '1px solid #E5E7EB',
                                margin: '16px 0',
                              }}
                            />
                          ),
                          table: ({ children }) => (
                            <table
                              style={{
                                borderCollapse: 'collapse',
                                width: '100%',
                                margin: '8px 0',
                              }}
                            >
                              {children}
                            </table>
                          ),
                          th: ({ children }) => (
                            <th
                              style={{
                                border: '1px solid #E5E7EB',
                                padding: '8px 12px',
                                backgroundColor: '#F9FAFB',
                                fontWeight: 600,
                                textAlign: 'left',
                              }}
                            >
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td style={{ border: '1px solid #E5E7EB', padding: '8px 12px' }}>
                              {children}
                            </td>
                          ),
                          details: ({ children }) => (
                            <details
                              style={{
                                margin: '10px 0',
                                border: '1px solid #EDEDED',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                backgroundColor: '#FBFBFB',
                              }}
                            >
                              {children}
                            </details>
                          ),
                          summary: ({ children }) => (
                            <summary
                              style={{
                                cursor: 'pointer',
                                fontWeight: 590,
                                color: '#454545',
                                fontSize: '13px',
                              }}
                            >
                              {children}
                            </summary>
                          ),
                        }}
                      >
                        {filterToolCallContent(message.content)}
                      </ReactMarkdown>
                    </div>

                    {!isLoading &&
                      messages[messages.length - 1]?.id === message.id &&
                      (() => {
                        const lastUserMessage =
                          messages.filter((candidate) => candidate.role === 'user').pop()
                            ?.content || ''
                        const filteredContent = filterToolCallContent(message.content)
                        return (
                          <ResponseActions
                            onFollowUpClick={onFollowUpClick}
                            onCopy={() => {
                              navigator.clipboard.writeText(filteredContent)
                            }}
                            onDownload={() => {
                              const blob = new Blob([filteredContent], { type: 'text/plain' })
                              const url = URL.createObjectURL(blob)
                              const anchor = document.createElement('a')
                              anchor.href = url
                              anchor.download = `response-${new Date().toISOString().slice(0, 10)}.txt`
                              document.body.appendChild(anchor)
                              anchor.click()
                              document.body.removeChild(anchor)
                              URL.revokeObjectURL(url)
                            }}
                            followUps={generateFollowUps(message.content, lastUserMessage)}
                            visibility={getActionVisibility(lastUserMessage, message.content)}
                          />
                        )
                      })()}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {isLoading &&
          (() => {
            const streamingMessage = messages.find(
              (message) => message.role === 'assistant' && message.isStreaming,
            )
            const hasVisibleContent =
              streamingMessage &&
              (streamingMessage.content ||
                streamingMessage.tools?.length ||
                streamingMessage.reasoning ||
                streamingMessage.sources?.length ||
                streamingMessage.documents?.length)
            if (hasVisibleContent) {
              return null
            }
            return (
              <div aria-hidden="true" style={{ display: 'flex' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    marginTop: '8px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '16px 16px 16px 4px',
                      backgroundColor: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
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
              </div>
            )
          })()}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
