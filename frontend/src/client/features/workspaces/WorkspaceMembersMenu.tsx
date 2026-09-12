import { Button } from '../../components/ui/Button'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceMembersSession } from './useWorkspaceMembersSession'

interface WorkspaceMembersMenuProps {
  session: WorkspaceMembersSession
  canRemoveMembers: boolean
}

export function WorkspaceMembersMenu({ session, canRemoveMembers }: WorkspaceMembersMenuProps) {
  const selectedMember = session.members.find((member) => member.id === session.memberDetailsId)
  return (
    <div
      ref={session.refs.memberContainerRef}
      style={{ display: 'flex', alignItems: 'center', padding: '7px 0', position: 'relative' }}
    >
      {session.members.map((member, index) => (
        <Button
          key={member.id}
          aria-label={`View ${member.fullName || member.email || (member.isOwner ? 'owner' : 'member')}`}
          aria-haspopup="dialog"
          aria-expanded={session.memberDetailsId === member.id}
          aria-controls={
            session.memberDetailsId === member.id ? `member-details-${member.id}` : undefined
          }
          onClick={(event) => session.actions.toggleMemberDetails(member.id, event.currentTarget)}
          style={{
            width: '25px',
            height: '25px',
            borderRadius: '50%',
            backgroundColor: member.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: index < session.members.length - 1 ? '-6px' : '0',
            border: member.isOwner ? '2px solid #30D294' : 'none',
            zIndex: session.members.length - index,
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            padding: 0,
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontWeight: 510,
              color: 'white',
              letterSpacing: '-0.45px',
            }}
          >
            {member.initials}
          </span>
        </Button>
      ))}
      {selectedMember && (
        <div
          ref={session.refs.memberDetailsRef}
          id={`member-details-${selectedMember.id}`}
          role="dialog"
          aria-label={`${selectedMember.fullName || selectedMember.email || 'Member'} details`}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopPropagation()
            session.actions.closeMemberDetails(true)
          }}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDEDED',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: '220px',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F3F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: selectedMember.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: selectedMember.isOwner ? '2px solid #30D294' : 'none',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 510, color: 'white' }}>
                  {selectedMember.initials}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 510,
                    color: '#272727',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedMember.fullName ||
                    selectedMember.email ||
                    (selectedMember.isOwner ? 'Owner' : 'Member')}
                </div>
                {selectedMember.email && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#797979',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedMember.email}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 510,
                  color: selectedMember.isOwner
                    ? '#16A34A'
                    : selectedMember.role === 'admin'
                      ? '#338CE4'
                      : selectedMember.role === 'editor'
                        ? '#F59E0B'
                        : '#6B7280',
                  backgroundColor: selectedMember.isOwner
                    ? '#DCFCE7'
                    : selectedMember.role === 'admin'
                      ? '#DBEAFE'
                      : selectedMember.role === 'editor'
                        ? '#FEF3C7'
                        : '#F3F4F6',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'capitalize',
                }}
              >
                {selectedMember.isOwner ? 'Owner' : selectedMember.role}
              </span>
            </div>
          </div>
          {!selectedMember.isOwner && canRemoveMembers && selectedMember.userId && (
            <Button
              onClick={() => {
                const userId = selectedMember.userId
                if (!userId) return
                session.actions.requestRemove(
                  selectedMember.id,
                  userId,
                  selectedMember.fullName || selectedMember.email || 'this member',
                )
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                transition: 'background-color 0.15s',
                border: 'none',
                width: '100%',
                fontFamily: workspaceFont,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#FEF2F2'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="#DC2626"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 510, color: '#DC2626' }}>
                Remove from project
              </span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
