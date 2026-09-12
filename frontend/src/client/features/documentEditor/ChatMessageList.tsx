import type { Dispatch, SetStateAction } from 'react'
import type { Editor } from '@tiptap/core'
import type { ProjectChatMessage } from '../projects/projectsApi'
import { findTextMatchesInDoc } from './editorUtilities'
import { parseMessageContent, type ParsedBottleneck, type ParsedCitation } from './messageParsing'
import { ChatMarkdown } from './ChatMarkdown'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

function Citations({ citations }: { citations: ParsedCitation[] }) {
  if (citations.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '8px',
        maxWidth: '85%',
      }}
    >
      {citations.map((citation) => (
        <div
          key={citation.ref}
          title={citation.quote}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: '#F5F5F5',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#3B5998',
            cursor: 'default',
          }}
        >
          <span style={{ fontWeight: 600 }}>[{citation.ref}]</span>
          <span>Page {citation.page}</span>
        </div>
      ))}
    </div>
  )
}

interface BottleneckNavigationProps {
  bottlenecks: ParsedBottleneck[]
  editor: Editor | null
  matchIndexes: Record<string, number>
  onNavigate: (bottleneck: ParsedBottleneck, matchIndex?: number) => void
  setMatchIndexes: Dispatch<SetStateAction<Record<string, number>>>
}

function BottleneckNavigation({
  bottlenecks,
  editor,
  matchIndexes,
  onNavigate,
  setMatchIndexes,
}: BottleneckNavigationProps) {
  if (bottlenecks.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '8px',
        maxWidth: '85%',
      }}
    >
      {bottlenecks.map((bottleneck, index) => {
        const chipKey = `${bottleneck.bottleneck.slice(0, 30)}-${index}`
        const matches = editor ? findTextMatchesInDoc(editor.state.doc, bottleneck.bottleneck) : []
        const matchCount = matches.length
        const currentIndex = matchIndexes[chipKey] ?? 0
        const isDisabled = matchCount === 0

        return (
          <div key={chipKey} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onNavigate(bottleneck, currentIndex)}
              disabled={isDisabled}
              title={isDisabled ? 'This section no longer exists' : bottleneck.reason}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid #E0E0E0',
                backgroundColor: isDisabled ? '#F5F5F5' : '#FFFBEB',
                color: isDisabled ? '#999' : '#92400E',
                fontSize: '12px',
                fontWeight: 500,
                fontFamily,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span
                style={{
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {bottleneck.bottleneck.length > 35
                  ? `${bottleneck.bottleneck.slice(0, 35)}...`
                  : bottleneck.bottleneck}
              </span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>Go to section</span>
            </button>
            {matchCount > 1 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '11px',
                  color: '#6B7280',
                }}
              >
                {currentIndex + 1}/{matchCount}
                <button
                  onClick={() =>
                    setMatchIndexes((previous) => ({
                      ...previous,
                      [chipKey]: Math.max(0, currentIndex - 1),
                    }))
                  }
                  disabled={currentIndex === 0}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '2px 4px',
                    cursor: currentIndex === 0 ? 'default' : 'pointer',
                    opacity: currentIndex === 0 ? 0.4 : 1,
                    fontSize: '12px',
                    color: '#6B7280',
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={() =>
                    setMatchIndexes((previous) => ({
                      ...previous,
                      [chipKey]: Math.min(matchCount - 1, currentIndex + 1),
                    }))
                  }
                  disabled={currentIndex >= matchCount - 1}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '2px 4px',
                    cursor: currentIndex >= matchCount - 1 ? 'default' : 'pointer',
                    opacity: currentIndex >= matchCount - 1 ? 0.4 : 1,
                    fontSize: '12px',
                    color: '#6B7280',
                  }}
                >
                  ›
                </button>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ChatMessageListProps {
  messages: ProjectChatMessage[]
  editor: Editor | null
  matchIndexes: Record<string, number>
  onNavigateBottleneck: (bottleneck: ParsedBottleneck, matchIndex?: number) => void
  setMatchIndexes: Dispatch<SetStateAction<Record<string, number>>>
}

interface ChatMessageProps {
  editor: Editor | null
  matchIndexes: Record<string, number>
  message: ProjectChatMessage
  onNavigateBottleneck: (bottleneck: ParsedBottleneck, matchIndex?: number) => void
  setMatchIndexes: Dispatch<SetStateAction<Record<string, number>>>
}

function ChatMessage({
  editor,
  matchIndexes,
  message,
  onNavigateBottleneck,
  setMatchIndexes,
}: ChatMessageProps) {
  const { cleanContent, citations, bottlenecks } =
    message.role === 'assistant'
      ? parseMessageContent(message.content)
      : { cleanContent: message.content, citations: [], bottlenecks: [] }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
      }}
    >
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
          <ChatMarkdown>{cleanContent}</ChatMarkdown>
        ) : (
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
            {cleanContent}
          </p>
        )}
      </div>
      <Citations citations={citations} />
      <BottleneckNavigation
        bottlenecks={bottlenecks}
        editor={editor}
        matchIndexes={matchIndexes}
        onNavigate={onNavigateBottleneck}
        setMatchIndexes={setMatchIndexes}
      />
    </div>
  )
}

export function ChatMessageList({
  messages,
  editor,
  matchIndexes,
  onNavigateBottleneck,
  setMatchIndexes,
}: ChatMessageListProps) {
  return messages.map((message, index) => (
    <ChatMessage
      key={index}
      editor={editor}
      matchIndexes={matchIndexes}
      message={message}
      onNavigateBottleneck={onNavigateBottleneck}
      setMatchIndexes={setMatchIndexes}
    />
  ))
}
