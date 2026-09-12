import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useGetWorkflowsQuery, type Workflow } from '../../store/api/workflowsApi'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

function workflowColumns(workflow: Workflow) {
  return workflow.columnsConfig?.length ?? 0
}

function getSelectedRulebookId(workspaceId: string): string | null {
  try {
    return localStorage.getItem(`prism_workspace_rulebook_${workspaceId}`)
  } catch {
    return null
  }
}

function setSelectedRulebookId(workspaceId: string, rulebookId: string | null) {
  try {
    if (rulebookId) {
      localStorage.setItem(`prism_workspace_rulebook_${workspaceId}`, rulebookId)
    } else {
      localStorage.removeItem(`prism_workspace_rulebook_${workspaceId}`)
    }
  } catch {
    return
  }
}

interface RulebookPanelProps {
  workspaceId: string
  embedded?: boolean
  onClose?: () => void
  onRulebookSelect?: (workflow: Workflow | null) => void
}

export default function RulebookPanel({
  workspaceId,
  embedded = false,
  onClose,
  onRulebookSelect,
}: RulebookPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: workflows = [], isLoading, isError } = useGetWorkflowsQuery({ type: 'tabular' })
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    getSelectedRulebookId(workspaceId),
  )

  useEffect(() => {
    setSelectedId(getSelectedRulebookId(workspaceId))
  }, [workspaceId])

  const filteredWorkflows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return workflows
    return workflows.filter((workflow) => {
      const haystack = `${workflow.title} ${workflow.practice ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [searchQuery, workflows])

  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedId) ?? null

  function handleSelect(workflow: Workflow) {
    const newId = selectedId === workflow.id ? null : workflow.id
    setSelectedId(newId)
    setSelectedRulebookId(workspaceId, newId)
    onRulebookSelect?.(newId ? workflow : null)
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: embedded ? '100%' : '100vh',
    backgroundColor: '#FFFFFF',
    fontFamily,
  }

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #EDEDED',
          backgroundColor: 'white',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.9px',
          }}
        >
          Select Rulebook
        </h2>
        {embedded && onClose && (
          <button
            type="button"
            aria-label="Close rulebook panel"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {selectedWorkflow ? (
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#F0FDF4',
            borderBottom: '1px solid #DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16A34A"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span
              role="status"
              aria-live="polite"
              style={{ fontSize: '14px', fontWeight: 510, color: '#166534' }}
            >
              Active: {selectedWorkflow.title}
            </span>
            <span style={{ fontSize: '12px', color: '#16A34A' }}>
              ({workflowColumns(selectedWorkflow)} checks)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelect(selectedWorkflow)}
            style={{
              fontSize: '12px',
              color: '#DC2626',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily,
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '12px 20px',
            backgroundColor: '#FEF9C3',
            borderBottom: '1px solid #FDE047',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#CA8A04"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: '14px', color: '#854D0E' }}>
            Select a rulebook below to use during compliance checks for this project
          </span>
        </div>
      )}

      <div style={{ padding: '12px 20px', borderBottom: '1px solid #EDEDED' }}>
        <input
          aria-label="Search rulebooks"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rulebooks..."
          style={{
            width: '100%',
            height: '36px',
            padding: '0 12px',
            border: '1px solid #EDEDED',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily,
            outline: 'none',
            backgroundColor: '#FAFAFA',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#FAFAFA' }}>
        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            style={{ padding: '40px 20px', color: '#797979', textAlign: 'center' }}
          >
            Loading rulebooks...
          </div>
        ) : isError ? (
          <div role="alert" style={{ padding: '40px 20px', color: '#C83A2D', textAlign: 'center' }}>
            Could not load rulebooks.
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{ padding: '60px 20px', textAlign: 'center' }}
          >
            <div style={{ marginBottom: '12px' }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#CCCCCC"
                strokeWidth="1.5"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 510, color: '#454545' }}>
              {searchQuery ? 'No matching rulebooks' : 'No rulebooks available'}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#797979' }}>
              {searchQuery
                ? 'Try a different search term'
                : 'Create rulebooks from the Rulebook page to use them here'}
            </p>
          </div>
        ) : (
          <div style={{ padding: '12px' }}>
            {filteredWorkflows.map((workflow) => {
              const isSelected = selectedId === workflow.id
              return (
                <button
                  type="button"
                  key={workflow.id}
                  aria-pressed={isSelected}
                  onClick={() => handleSelect(workflow)}
                  style={{
                    width: '100%',
                    backgroundColor: isSelected ? '#F0FDF4' : 'white',
                    border: isSelected ? '2px solid #22C55E' : '1px solid #EDEDED',
                    borderRadius: '8px',
                    padding: isSelected ? '15px' : '16px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    fontFamily,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 510,
                            color: '#272727',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {workflow.title}
                        </h3>
                        {isSelected && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 510,
                              color: '#16A34A',
                              backgroundColor: '#DCFCE7',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            Selected
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#797979' }}>
                        {workflow.is_owner === false
                          ? `Shared by ${workflow.shared_by_name ?? 'someone'}`
                          : 'Owned by you'}
                      </p>
                    </div>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #22C55E' : '2px solid #D1D5DB',
                        backgroundColor: isSelected ? '#22C55E' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#454545',
                        backgroundColor: '#F3F4F6',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {workflow.practice || 'General'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#797979' }}>
                      {workflowColumns(workflow)} checks
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid #EDEDED',
          backgroundColor: '#FAFAFA',
        }}
      >
        <p style={{ margin: 0, fontSize: '12px', color: '#797979', textAlign: 'center' }}>
          Selected rulebook will be used for compliance checks in this project
        </p>
      </div>
    </div>
  )
}
