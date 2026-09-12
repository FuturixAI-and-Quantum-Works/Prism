import { useEffect, useMemo, useState } from 'react'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { complianceFontFamily } from './compliancePresentation'

interface ProjectPickerDialogProps {
  open: boolean
  onClose: () => void
  workspaces: Array<{ id: string; name: string; file_count?: number; created_at?: string }>
  onSelect: (workspaceId: string) => void
}

export function ProjectPickerDialog({
  open,
  onClose,
  workspaces,
  onSelect,
}: ProjectPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces
    const query = searchQuery.toLowerCase()
    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(query))
  }, [searchQuery, workspaces])

  useEffect(() => {
    if (!open) setSearchQuery('')
  }, [open])

  if (!open) return null

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      labelledBy="project-picker-title"
      overlayStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        padding: '24px',
      }}
      contentStyle={{
        width: '480px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '70vh',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: complianceFontFamily,
      }}
    >
      <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2
            id="project-picker-title"
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 590,
              color: '#171717',
              letterSpacing: '-0.4px',
              lineHeight: '22px',
            }}
          >
            Select Project
          </h2>
          <button
            type="button"
            aria-label="Close project picker"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#F7F7F7',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#797979',
            }}
          >
            ×
          </button>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#797979',
            letterSpacing: '-0.3px',
            lineHeight: '18px',
          }}
        >
          Choose a project to start compliance review
        </p>
      </div>

      <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F3F3' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '40px',
            backgroundColor: '#F7F7F7',
            borderRadius: '10px',
            padding: '0 12px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
              stroke="#999"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            aria-label="Search projects"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              color: '#333333',
              outline: 'none',
              fontFamily: complianceFontFamily,
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
        {filteredWorkspaces.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#797979',
              fontSize: '14px',
            }}
          >
            {searchQuery ? 'No projects match your search' : 'No projects available'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredWorkspaces.map((workspace) => {
              const hasFiles = (workspace.file_count || 0) > 0
              return (
                <button
                  type="button"
                  key={workspace.id}
                  onClick={() => hasFiles && onSelect(workspace.id)}
                  disabled={!hasFiles}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '1px solid #EDEDED',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    cursor: hasFiles ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    fontFamily: complianceFontFamily,
                    opacity: hasFiles ? 1 : 0.5,
                  }}
                >
                  <span
                    style={{
                      width: '44px',
                      height: '44px',
                      backgroundColor: '#F0EBFF',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path
                        d="M19.25 5.5H12.375L10.725 3.575C10.45 3.25 10.025 3.025 9.625 3.025H2.75C1.925 3.025 1.375 3.575 1.375 4.4V17.6C1.375 18.425 1.925 18.975 2.75 18.975H19.25C20.075 18.975 20.625 18.425 20.625 17.6V6.875C20.625 6.05 20.075 5.5 19.25 5.5Z"
                        stroke="#7C3AED"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 590,
                        color: '#272727',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {workspace.name}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: '3px',
                        fontSize: '13px',
                        color: '#797979',
                      }}
                    >
                      {workspace.file_count || 0} document
                      {(workspace.file_count || 0) !== 1 ? 's' : ''}
                    </span>
                  </span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7.5 5L12.5 10L7.5 15"
                      stroke="#999999"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #EDEDED', textAlign: 'right' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            height: '40px',
            padding: '0 20px',
            border: 'none',
            borderRadius: '10px',
            backgroundColor: '#F7F7F7',
            color: '#454545',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 510,
            fontFamily: complianceFontFamily,
          }}
        >
          Cancel
        </button>
      </div>
    </AccessibleDialog>
  )
}
