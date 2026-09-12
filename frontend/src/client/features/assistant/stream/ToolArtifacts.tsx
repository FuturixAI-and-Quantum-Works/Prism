import { Button } from '../../../components/ui/Button'
import { formatFieldLabel, formatValue } from './artifactDisplay'
import type { ChatToolCallArtifact } from './artifactTypes'

const ToolDataDisplay = ({ data }: { data: unknown }) => {
  if (data === null || data === undefined) return null

  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (trimmed.length === 0) return null
    return (
      <p
        style={{
          margin: 0,
          fontSize: '12px',
          color: '#454545',
          lineHeight: '18px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {trimmed.length > 300 ? trimmed.slice(0, 300) + '…' : trimmed}
      </p>
    )
  }

  if (typeof data !== 'object') {
    return <p style={{ margin: 0, fontSize: '12px', color: '#454545' }}>{formatValue(data)}</p>
  }

  if (Array.isArray(data)) {
    if (data.length === 0)
      return <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>No items</p>

    if (data.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return (
        <p style={{ margin: 0, fontSize: '12px', color: '#454545' }}>
          {data.slice(0, 5).join(', ')}
          {data.length > 5 ? ` and ${data.length - 5} more` : ''}
        </p>
      )
    }

    return (
      <p style={{ margin: 0, fontSize: '12px', color: '#454545' }}>
        {data.length} {data.length === 1 ? 'item' : 'items'}
      </p>
    )
  }

  const entries = Object.entries(data)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .slice(0, 6)

  if (entries.length === 0) {
    return <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>No data</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#6B7280',
              minWidth: '80px',
              flexShrink: 0,
            }}
          >
            {formatFieldLabel(key)}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#454545',
              lineHeight: '16px',
              wordBreak: 'break-word',
            }}
          >
            {formatValue(value)}
          </span>
        </div>
      ))}
      {Object.keys(data).length > 6 && (
        <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>
          +{Object.keys(data).length - 6} more fields
        </span>
      )}
    </div>
  )
}

const getToolDisplayInfo = (
  toolName: string,
): { label: string; icon: string; color: string; bgColor: string } => {
  const toolMap: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    read_document: { label: 'Reading document', icon: '📄', color: '#2563EB', bgColor: '#EFF6FF' },
    find_document: { label: 'Finding document', icon: '🔍', color: '#7C3AED', bgColor: '#F5F3FF' },
    search_documents: {
      label: 'Searching documents',
      icon: '🔍',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
    },
    search_web: { label: 'Searching the web', icon: '🌐', color: '#0891B2', bgColor: '#ECFEFF' },
    compare_documents: {
      label: 'Comparing documents',
      icon: '⚖️',
      color: '#EA580C',
      bgColor: '#FFF7ED',
    },
    extract_clauses: {
      label: 'Extracting clauses',
      icon: '📋',
      color: '#16A34A',
      bgColor: '#F0FDF4',
    },
    suggest_edit: { label: 'Suggesting edits', icon: '✏️', color: '#DC2626', bgColor: '#FEF2F2' },
    edit_document: { label: 'Editing document', icon: '📝', color: '#2563EB', bgColor: '#EFF6FF' },
    create_document: {
      label: 'Creating document',
      icon: '📄',
      color: '#16A34A',
      bgColor: '#F0FDF4',
    },
    replicate_document: {
      label: 'Copying document',
      icon: '📋',
      color: '#7C3AED',
      bgColor: '#EDE9FE',
    },
    extract_placeholders: {
      label: 'Finding placeholders',
      icon: '🔖',
      color: '#CA8A04',
      bgColor: '#FEFCE8',
    },
    fill_placeholders: {
      label: 'Filling placeholders',
      icon: '✍️',
      color: '#CA8A04',
      bgColor: '#FEFCE8',
    },
    analyze_document: {
      label: 'Analyzing document',
      icon: '🔬',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
    },
    summarize: { label: 'Summarizing content', icon: '📊', color: '#0891B2', bgColor: '#ECFEFF' },
    get_document_context: {
      label: 'Loading context',
      icon: '📚',
      color: '#6366F1',
      bgColor: '#EEF2FF',
    },
    rag_search: {
      label: 'Searching knowledge base',
      icon: '🧠',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
    },
  }

  if (toolMap[toolName]) return toolMap[toolName]

  const lowerName = toolName.toLowerCase()
  if (lowerName.includes('read'))
    return { label: 'Reading content', icon: '📄', color: '#2563EB', bgColor: '#EFF6FF' }
  if (lowerName.includes('search'))
    return { label: 'Searching', icon: '🔍', color: '#7C3AED', bgColor: '#F5F3FF' }
  if (lowerName.includes('edit'))
    return { label: 'Making changes', icon: '✏️', color: '#DC2626', bgColor: '#FEF2F2' }
  if (lowerName.includes('create'))
    return { label: 'Creating', icon: '📄', color: '#16A34A', bgColor: '#F0FDF4' }
  if (lowerName.includes('extract'))
    return { label: 'Extracting data', icon: '📋', color: '#16A34A', bgColor: '#F0FDF4' }
  if (lowerName.includes('analyze') || lowerName.includes('analyse'))
    return { label: 'Analyzing', icon: '🔬', color: '#7C3AED', bgColor: '#F5F3FF' }
  if (lowerName.includes('compare'))
    return { label: 'Comparing', icon: '⚖️', color: '#EA580C', bgColor: '#FFF7ED' }
  if (lowerName.includes('summarize') || lowerName.includes('summary'))
    return { label: 'Summarizing', icon: '📊', color: '#0891B2', bgColor: '#ECFEFF' }

  return { label: 'Processing', icon: '⚙️', color: '#6B7280', bgColor: '#F3F4F6' }
}

const getStatusDisplay = (status?: string): { label: string; isLoading: boolean } => {
  if (!status || status === 'running' || status === 'pending') {
    return { label: '', isLoading: true }
  }
  if (status === 'complete' || status === 'success') {
    return { label: 'Done', isLoading: false }
  }
  if (status === 'error' || status === 'failed') {
    return { label: 'Failed', isLoading: false }
  }
  return { label: status, isLoading: false }
}

interface ToolArtifactsProps {
  tools: ChatToolCallArtifact[]
  collapsed: Record<string, boolean>
  onToggle: (id: string) => void
}

export function ToolArtifacts({ tools, collapsed, onToggle }: ToolArtifactsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {tools.map((tool) => {
        const toolInfo = getToolDisplayInfo(tool.tool)
        const statusInfo = getStatusDisplay(tool.status)
        const isExpanded = !collapsed[tool.id]
        return (
          <div
            key={tool.id}
            style={{
              backgroundColor: toolInfo.bgColor,
              border: `1px solid ${toolInfo.color}20`,
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <Button
              onClick={() => onToggle(tool.id)}
              aria-expanded={isExpanded}
              aria-controls={tool.input || tool.output ? `chat-tool-${tool.id}` : undefined}
              aria-busy={statusInfo.isLoading}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '16px' }}>{toolInfo.icon}</span>
              <span
                style={{
                  flex: 1,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: toolInfo.color,
                  letterSpacing: '-0.3px',
                }}
              >
                {toolInfo.label}
              </span>
              {statusInfo.isLoading ? (
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: toolInfo.color,
                        animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color:
                      tool.status === 'error' || tool.status === 'failed' ? '#DC2626' : '#16A34A',
                    backgroundColor:
                      tool.status === 'error' || tool.status === 'failed' ? '#FEE2E2' : '#DCFCE7',
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  {statusInfo.label}
                </span>
              )}
              <span
                style={{
                  fontSize: '12px',
                  color: '#9CA3AF',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                ▼
              </span>
            </Button>

            {isExpanded && (tool.input || tool.output) ? (
              <>
                <div
                  id={`chat-tool-${tool.id}`}
                  style={{
                    padding: '0 14px 12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {tool.input ? (
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#9CA3AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Input
                      </span>
                      <ToolDataDisplay data={tool.input} />
                    </div>
                  ) : null}
                  {tool.output ? (
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#9CA3AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Result
                      </span>
                      <ToolDataDisplay data={tool.output} />
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
