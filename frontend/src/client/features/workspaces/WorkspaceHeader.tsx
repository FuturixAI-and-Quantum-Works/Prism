import complianceSourcesIcon from '../../assets/compliance/sources-icon.svg'
import workspaceHeaderCalendarIcon from '../../assets/workspace-header/calendar-icon.svg'
import workspaceHeaderFolderIcon from '../../assets/workspace-header/folder-icon.svg'
import workspaceHeaderMoreIcon from '../../assets/workspace-header/more-icon.svg'
import workspaceHeaderTabularIcon from '../../assets/workspace-header/tabular-icon.svg'
import { Button, IconButton } from '../../components/ui/Button'
import { formatTimeAgo, workspaceFont } from './workspaceModels'
import { WorkspaceMembersMenu } from './WorkspaceMembersMenu'
import type { WorkspaceMembersSession } from './useWorkspaceMembersSession'
import type { WorkspaceSidebarTab } from './workspaceModels'

interface WorkspaceHeaderProps {
  workspaceName?: string
  updatedAt?: string
  role?: string
  activeTab: WorkspaceSidebarTab
  rightPadding: string
  members: WorkspaceMembersSession
  onSelectTab: (tab: WorkspaceSidebarTab) => void
}

export function WorkspaceHeader({
  workspaceName,
  updatedAt,
  role,
  activeTab,
  rightPadding,
  members,
  onSelectTab,
}: WorkspaceHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '40px',
        padding: '0 16px',
        paddingRight: rightPadding,
        backgroundColor: 'white',
        borderBottom: '1px solid #EDEDED',
        flexShrink: 0,
        transition: 'padding-right 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src={workspaceHeaderFolderIcon} alt="" style={{ width: '28px', height: '28px' }} />
        <span
          style={{
            fontSize: '18px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.9px',
          }}
        >
          {workspaceName || 'Workspace'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}>
          <img src={workspaceHeaderCalendarIcon} alt="" style={{ width: '18px', height: '18px' }} />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 510,
              color: '#454545',
              letterSpacing: '-0.7px',
            }}
          >
            Updated {formatTimeAgo(updatedAt)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <HeaderTab
          active={activeTab === 'tabular'}
          label="Tabular"
          icon={workspaceHeaderTabularIcon}
          onClick={() => onSelectTab('tabular')}
        />
        <HeaderTab
          active={activeTab === 'compliance'}
          label="Compliance"
          icon={complianceSourcesIcon}
          onClick={() => onSelectTab('compliance')}
        />
        <WorkspaceMembersMenu session={members} canRemoveMembers={role === 'owner'} />
        <div style={{ position: 'relative' }} ref={members.refs.moreContainerRef}>
          <IconButton
            ref={members.refs.moreButtonRef}
            label="More project actions"
            aria-haspopup="menu"
            aria-expanded={members.moreOpen}
            aria-controls={members.moreOpen ? 'workspace-more-menu' : undefined}
            onClick={members.actions.toggleMore}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              padding: '0 11px',
              backgroundColor: members.moreOpen ? '#F7F7F7' : 'white',
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
            }}
          >
            <img
              src={workspaceHeaderMoreIcon}
              alt=""
              style={{ width: '24px', height: '24px', transform: 'rotate(90deg)' }}
            />
          </IconButton>
          {members.moreOpen && (
            <div
              ref={members.refs.moreMenuRef}
              id="workspace-more-menu"
              role="menu"
              aria-label="Project actions"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDEDED',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                minWidth: '180px',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <MenuAction label="Share Project" onClick={members.actions.openShare}>
                <path
                  d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08261 9.19071C7.54305 8.46738 6.6745 8 5.7 8C4.20883 8 3 9.20883 3 10.7C3 12.1912 4.20883 13.4 5.7 13.4C6.6745 13.4 7.54305 12.9326 8.08261 12.2093L15.0227 16.0294C15.0077 16.1508 15 16.2745 15 16.4C15 18.0569 16.3431 19.4 18 19.4C19.6569 19.4 21 18.0569 21 16.4C21 14.7431 19.6569 13.4 18 13.4C17.0255 13.4 16.157 13.8674 15.6174 14.5907L8.67727 10.7706C8.69231 10.6492 8.7 10.5255 8.7 10.4C8.7 10.2745 8.69231 10.1508 8.67727 10.0294L15.6174 6.20929C16.157 6.93262 17.0255 7.4 18 7.4"
                  stroke="#454545"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </MenuAction>
              <div style={{ height: '1px', backgroundColor: '#F3F3F3' }} />
              <MenuAction label="Settings" onClick={members.actions.closeMore}>
                <path
                  d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                  stroke="#454545"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z"
                  stroke="#454545"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </MenuAction>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HeaderTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: string
  onClick: () => void
}) {
  return (
    <Button
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: '40px',
        padding: '0 8px',
        backgroundColor: active ? '#F5F5F5' : 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <img src={icon} alt="" style={{ width: '18px', height: '18px' }} />
      <span
        style={{
          fontSize: '16px',
          fontWeight: 510,
          color: active ? '#338BE3' : '#454545',
          letterSpacing: '-0.8px',
        }}
      >
        {label}
      </span>
    </Button>
  )
}

function MenuAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        transition: 'background-color 0.15s',
        border: 'none',
        width: '100%',
        fontFamily: workspaceFont,
        textAlign: 'left',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = '#F7F7F7'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        {children}
      </svg>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.3px',
        }}
      >
        {label}
      </span>
    </Button>
  )
}
