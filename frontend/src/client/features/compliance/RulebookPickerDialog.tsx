import { useEffect, useMemo, useState } from 'react'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { useGetWorkflowsQuery, type Workflow } from '../../store/api/workflowsApi'
import { complianceFontFamily } from './compliancePresentation'

interface RulebookPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (workflow: Workflow) => void
  onAddEmpty: () => void
  title?: string
  subtitle?: string
  emptyButtonLabel?: string
  accentColor?: string
  itemLabel?: string
}

export function RulebookPickerDialog({
  open,
  onClose,
  onSelect,
  onAddEmpty,
  title = 'Select Rulebook',
  subtitle = 'Choose a rulebook to add its review rules',
  emptyButtonLabel = 'Add Empty Rule',
  accentColor = '#9124FF',
  itemLabel = 'rules',
}: RulebookPickerDialogProps) {
  const { data: workflows = [], isLoading } = useGetWorkflowsQuery(
    { type: 'tabular' },
    { skip: !open },
  )
  const [searchQuery, setSearchQuery] = useState('')
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return workflows
    const query = searchQuery.toLowerCase()
    return workflows.filter(
      (workflow) =>
        workflow.title.toLowerCase().includes(query) ||
        workflow.practice?.toLowerCase().includes(query),
    )
  }, [searchQuery, workflows])

  useEffect(() => {
    if (!open) setSearchQuery('')
  }, [open])

  if (!open) return null

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      label={title}
      overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '24px' }}
      contentStyle={{
        width: '520px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '70vh',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: complianceFontFamily,
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #EDEDED',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 590,
              color: '#272727',
              letterSpacing: '-0.4px',
            }}
          >
            {title}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#797979' }}>{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#F7F7F7',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#797979',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3F3F3' }}>
        <input
          aria-label="Search rulebooks"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search rulebooks..."
          style={{
            width: '100%',
            height: '38px',
            boxSizing: 'border-box',
            border: '1px solid #E8E8E8',
            borderRadius: '8px',
            padding: '0 12px',
            fontSize: '14px',
            color: '#333333',
            outline: 'none',
            backgroundColor: '#FAFAFA',
            fontFamily: complianceFontFamily,
          }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {isLoading ? (
          <DialogStatus>Loading rulebooks...</DialogStatus>
        ) : filteredWorkflows.length === 0 ? (
          <DialogStatus>
            {searchQuery ? 'No rulebooks match your search' : 'No rulebooks available'}
          </DialogStatus>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredWorkflows.map((workflow) => (
              <button
                type="button"
                key={workflow.id}
                onClick={() => onSelect(workflow)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid #EDEDED',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontFamily: complianceFontFamily,
                }}
              >
                <span
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: accentColor === '#247BFF' ? '#ECF1FA' : '#FCF6FF',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  📋
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 590,
                      color: '#272727',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {workflow.title}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      marginTop: '2px',
                      fontSize: '12px',
                      color: '#797979',
                      gap: '8px',
                    }}
                  >
                    <span>{workflow.practice || 'General'}</span>
                    <span>•</span>
                    <span>
                      {workflow.columnsConfig?.length || 0} {itemLabel}
                    </span>
                  </span>
                </span>
                <span style={{ fontSize: '12px', color: accentColor, fontWeight: 510 }}>
                  Select
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid #EDEDED',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => {
            onAddEmpty()
            onClose()
          }}
          style={{
            height: '36px',
            padding: '0 14px',
            border: '1px solid #EDEDED',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            color: '#454545',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 510,
            fontFamily: complianceFontFamily,
          }}
        >
          {emptyButtonLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            height: '36px',
            padding: '0 14px',
            border: 'none',
            borderRadius: '8px',
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

function DialogStatus({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ padding: '40px 20px', textAlign: 'center', color: '#797979', fontSize: '14px' }}
    >
      {children}
    </div>
  )
}
