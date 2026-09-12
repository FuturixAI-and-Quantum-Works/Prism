import workspaceHeaderMoreIcon from '../../assets/workspace-header/more-icon.svg'
import { Button, IconButton } from '../../components/ui/Button'
import {
  CalendarIcon,
  CheckboxIcon,
  FileTypeIcon,
  GridTableIcon,
  MembersIcon,
  StatusIcon,
  UserIcon,
} from './WorkspaceDetailIcons'
import { formatDocumentDate, workspaceFont } from './workspaceModels'
import { WorkspaceDocumentsEmptyState } from './WorkspaceDocumentsEmptyState'
import type { WorkspaceDocumentsSession } from './useWorkspaceDocumentsSession'
import type { WorkspaceMemberView } from './workspaceModels'

interface WorkspaceDocumentsTableProps {
  session: WorkspaceDocumentsSession
  members: WorkspaceMemberView[]
  isViewer: boolean
}

export function WorkspaceDocumentsTable({
  session,
  members,
  isViewer,
}: WorkspaceDocumentsTableProps) {
  const allSelected = session.items.length > 0 && session.selectedIds.size === session.items.length
  return (
    <>
      <TableHeader
        allSelected={allSelected}
        empty={session.items.length === 0}
        onToggleAll={session.actions.toggleAll}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {session.isLoading ? (
          <div style={{ padding: '40px', color: '#797979', textAlign: 'center' }}>
            Loading documents...
          </div>
        ) : session.items.length === 0 ? (
          <WorkspaceDocumentsEmptyState
            tab={session.tab}
            constrained={Boolean(session.searchQuery || session.filters.length)}
            isViewer={isViewer}
            onCreate={session.actions.createDocument}
            onUpload={session.actions.openAddFiles}
          />
        ) : (
          session.items.map((item) => {
            const selected = session.selectedIds.has(item.id)
            const date =
              item.updatedAt || item.createdAt
                ? formatDocumentDate(item.updatedAt || item.createdAt || '')
                : { main: '-', sub: '' }
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  backgroundColor: selected ? '#FEF7F5' : 'white',
                  borderBottom: '1px solid #EDEDED',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(event) => {
                  if (!selected) event.currentTarget.style.backgroundColor = '#FAFAFA'
                }}
                onMouseLeave={(event) => {
                  if (!selected) event.currentTarget.style.backgroundColor = 'white'
                }}
              >
                <IconButton
                  label={`${selected ? 'Deselect' : 'Select'} ${item.name}`}
                  aria-pressed={selected}
                  onClick={(event) => session.actions.toggleItem(item, event)}
                  style={{
                    ...selectionCellStyle,
                    position: 'relative',
                    zIndex: 2,
                    backgroundColor: 'transparent',
                  }}
                >
                  <CheckboxIcon checked={selected} />
                </IconButton>
                <Button
                  aria-label={`Open ${item.name}`}
                  onClick={() => session.actions.openItem(item)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    session.actions.openContextMenu(
                      event.currentTarget,
                      event.clientX,
                      event.clientY,
                      item,
                    )
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
                      return
                    }
                    event.preventDefault()
                    event.stopPropagation()
                    const rect = event.currentTarget.getBoundingClientRect()
                    session.actions.openContextMenu(
                      event.currentTarget,
                      rect.left,
                      rect.bottom,
                      item,
                    )
                  }}
                  style={{
                    ...nameCellStyle,
                    borderTop: 'none',
                    borderBottom: 'none',
                    borderLeft: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontFamily: workspaceFont,
                    textAlign: 'left',
                  }}
                >
                  <FileTypeIcon extension={item.extension} mimeType={item.mimeType} />
                  <span style={ellipsisStyle}>{item.name}</span>
                </Button>
                <DataCell minWidth="180px">
                  <span style={valueStyle}>
                    {date.main} <span style={{ color: '#6B6B6B' }}>{date.sub}</span>
                  </span>
                </DataCell>
                <DataCell minWidth="120px">
                  <span style={valueStyle}>{item.type === 'document' ? 'Document' : 'File'}</span>
                </DataCell>
                <DataCell minWidth="140px">
                  <StatusBadge status={item.status} />
                </DataCell>
                <DataCell minWidth="140px">
                  <MemberAvatars members={members} />
                </DataCell>
                <div
                  style={{
                    width: '120px',
                    minWidth: '120px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <IconButton
                    id={`workspace-row-actions-${item.id}`}
                    label={`Actions for ${item.name}`}
                    aria-haspopup="menu"
                    aria-expanded={session.rowActionId === item.id}
                    aria-controls={
                      session.rowActionId === item.id
                        ? `workspace-row-actions-menu-${item.id}`
                        : undefined
                    }
                    onClick={(event) => session.actions.openRowActions(event, item.id)}
                    onKeyDown={(event) => session.actions.openRowActions(event, item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '32px',
                      padding: '0 8px',
                      backgroundColor: session.rowActionId === item.id ? '#F7F7F7' : 'transparent',
                      border: '1px solid #EDEDED',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(event) => {
                      if (session.rowActionId !== item.id) {
                        event.currentTarget.style.backgroundColor = '#F5F5F5'
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (session.rowActionId !== item.id) {
                        event.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <img
                      src={workspaceHeaderMoreIcon}
                      alt=""
                      style={{ width: '18px', height: '18px', transform: 'rotate(90deg)' }}
                    />
                  </IconButton>
                  {session.rowActionId === item.id && <RowActions session={session} item={item} />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function TableHeader({
  allSelected,
  empty,
  onToggleAll,
}: {
  allSelected: boolean
  empty: boolean
  onToggleAll: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderBottom: '1px solid #EDEDED',
      }}
    >
      <IconButton
        label={allSelected ? 'Clear document selection' : 'Select all documents'}
        aria-pressed={allSelected}
        disabled={empty}
        onClick={onToggleAll}
        style={selectionCellStyle}
      >
        <CheckboxIcon checked={allSelected} />
      </IconButton>
      <HeaderCell width="300px" align="start" icon={<GridTableIcon />} label="Name" />
      <HeaderCell minWidth="180px" icon={<CalendarIcon />} label="Date Modified" />
      <HeaderCell minWidth="120px" icon={<UserIcon />} label="Role" />
      <HeaderCell minWidth="140px" icon={<StatusIcon />} label="Status" />
      <HeaderCell minWidth="140px" icon={<MembersIcon />} label="Members" gap="10px" />
      <HeaderCell width="120px" label="Actions" last />
    </div>
  )
}

function HeaderCell({
  width,
  minWidth,
  align = 'center',
  icon,
  label,
  gap = '8px',
  last = false,
}: {
  width?: string
  minWidth?: string
  align?: 'start' | 'center'
  icon?: React.ReactNode
  label: string
  gap?: string
  last?: boolean
}) {
  return (
    <div
      style={{
        width,
        minWidth: width || minWidth,
        flex: width ? undefined : 1,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'start' ? 'flex-start' : 'center',
        gap,
        padding: '10px',
        borderRight: last ? 'none' : '1px solid #EDEDED',
        flexShrink: width ? 0 : undefined,
      }}
    >
      {icon}
      <span
        style={{
          fontSize: '16px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.8px',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function DataCell({ minWidth, children }: { minWidth: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        borderRight: '1px solid #EDEDED',
      }}
    >
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  const displayStatus = status || 'pending'
  const color =
    { ready: '#10B981', processing: '#F59E0B', error: '#EF4444', pending: '#6B7280' }[
      displayStatus
    ] || '#6B7280'
  const label =
    { ready: 'Ready', processing: 'Processing', error: 'Error', pending: 'Pending' }[
      displayStatus
    ] || displayStatus
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 9px',
        backgroundColor: 'white',
        border: '1px solid #EDEDED',
        borderRadius: '37px',
        minWidth: '80px',
        justifyContent: 'center',
      }}
    >
      <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: color }} />
      <span
        style={{
          fontSize: '12px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.6px',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function MemberAvatars({ members }: { members: WorkspaceMemberView[] }) {
  const displayedMembers =
    members.length > 0 ? members : [{ id: 'owner', initials: 'O', color: '#3F6F00' }]
  const extra = Math.max(0, displayedMembers.length - 3)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {displayedMembers.slice(0, 3).map((member, index) => (
          <span
            key={member.id}
            style={{
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              backgroundColor: member.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: index < Math.min(displayedMembers.length, 3) - 1 ? '-6px' : 0,
              zIndex: 3 - index,
              fontSize: '5.32px',
              fontWeight: 510,
              color: 'white',
              letterSpacing: '-0.27px',
            }}
          >
            {member.initials}
          </span>
        ))}
      </div>
      {extra > 0 && (
        <span
          style={{
            fontSize: '14px',
            fontWeight: 510,
            color: '#999',
            letterSpacing: '-0.7px',
          }}
        >
          {extra}+
        </span>
      )}
    </div>
  )
}

function RowActions({
  session,
  item,
}: {
  session: WorkspaceDocumentsSession
  item: WorkspaceDocumentsSession['items'][number]
}) {
  const action = (callback: () => void) => {
    session.actions.closeRowActions()
    callback()
  }
  return (
    <div
      ref={session.refs.rowActionMenuRef}
      id={`workspace-row-actions-menu-${item.id}`}
      role="menu"
      aria-label={`Actions for ${item.name}`}
      style={{
        position: 'absolute',
        top: '100%',
        right: '10px',
        marginTop: '4px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #EDEDED',
        borderRadius: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        minWidth: '140px',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      <RowAction
        kind="open"
        label="Open"
        onClick={() => action(() => session.actions.openItem(item))}
      />
      {item.type === 'document' && (
        <>
          <div style={{ height: '1px', backgroundColor: '#F3F3F3' }} />
          <RowAction
            kind="edit"
            label="Edit"
            onClick={() => action(() => session.actions.editItem(item))}
          />
        </>
      )}
      <div style={{ height: '1px', backgroundColor: '#F3F3F3' }} />
      <RowAction
        kind="preview"
        label="Preview"
        onClick={() => action(() => session.actions.previewItem(item))}
      />
    </div>
  )
}

function RowAction({
  kind,
  label,
  onClick,
}: {
  kind: 'open' | 'edit' | 'preview'
  label: string
  onClick: () => void
}) {
  return (
    <Button
      role="menuitem"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        transition: 'background-color 0.15s',
        border: 'none',
        width: '100%',
        fontFamily: workspaceFont,
        textAlign: 'left',
        fontSize: '14px',
        fontWeight: 510,
        color: '#454545',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = '#F7F7F7'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <RowActionIcon kind={kind} />
      <span style={{ letterSpacing: '-0.3px' }}>{label}</span>
    </Button>
  )
}

const selectionCellStyle = {
  width: '40px',
  minWidth: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRight: '1px solid #EDEDED',
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
}

const nameCellStyle = {
  width: '300px',
  minWidth: '300px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px',
  borderRight: '1px solid #EDEDED',
  flexShrink: 0,
}

const valueStyle = {
  fontSize: '14px',
  fontWeight: 510,
  color: '#454545',
  letterSpacing: '-0.7px',
}
const ellipsisStyle = {
  ...valueStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
}

function RowActionIcon({ kind }: { kind: 'open' | 'edit' | 'preview' }) {
  if (kind === 'open') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 3h6v6"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 14L21 3"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'edit') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
          stroke="#454545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="#454545"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="#454545" strokeWidth="2" />
    </svg>
  )
}
