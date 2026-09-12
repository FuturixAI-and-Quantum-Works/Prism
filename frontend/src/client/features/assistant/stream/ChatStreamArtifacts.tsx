import { memo, useMemo, useState } from 'react'
import { DocumentArtifacts } from './DocumentArtifacts'
import { ReasoningArtifact } from './ReasoningArtifact'
import { SourceArtifacts } from './SourceArtifacts'
import { ToolArtifacts } from './ToolArtifacts'
import type {
  ChatDocumentArtifact,
  ChatSourceResultArtifact,
  ChatToolCallArtifact,
} from './artifactTypes'

interface ChatStreamArtifactsProps {
  reasoning?: string
  tools?: ChatToolCallArtifact[]
  sources?: ChatSourceResultArtifact[]
  documents?: ChatDocumentArtifact[]
  isStreaming?: boolean
}

export const ChatStreamArtifacts = memo(function ChatStreamArtifacts({
  reasoning,
  tools: _tools = [],
  sources = [],
  documents = [],
  isStreaming = false,
}: ChatStreamArtifactsProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const visibleTools: typeof _tools = []
  const visibleSources = useMemo(() => sources.slice(0, 6), [sources])

  if (
    !reasoning &&
    visibleTools.length === 0 &&
    visibleSources.length === 0 &&
    documents.length === 0
  )
    return null

  const toggle = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '10px',
        width: '100%',
      }}
    >
      {visibleTools.length > 0 && (
        <ToolArtifacts tools={visibleTools} collapsed={collapsed} onToggle={toggle} />
      )}

      {reasoning && <ReasoningArtifact reasoning={reasoning} isStreaming={isStreaming} />}

      {documents.length > 0 && <DocumentArtifacts documents={documents} />}

      {visibleSources.length > 0 && <SourceArtifacts sources={visibleSources} />}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
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
          background: linear-gradient(90deg, #888787 25%, #b0b0b0 50%, #888787 75%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  )
})
