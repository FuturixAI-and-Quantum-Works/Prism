import { Button } from '../../components/ui/Button'
import { ActivityIcon, AnalysisIcon, DocumentsIcon, RulebookIcon } from './WorkspaceDetailIcons'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceSidebarTab } from './workspaceModels'

const items = [
  { id: 'documents' as const, label: 'Documents', icon: DocumentsIcon },
  { id: 'rulebook' as const, label: 'Rulebook', icon: RulebookIcon },
  { id: 'analysis' as const, label: 'Analysis', icon: AnalysisIcon },
  { id: 'activity' as const, label: 'Activity', icon: ActivityIcon },
]

interface WorkspaceSidebarProps {
  activeTab: WorkspaceSidebarTab
  onSelect: (tab: WorkspaceSidebarTab) => void
}

export function WorkspaceSidebar({ activeTab, onSelect }: WorkspaceSidebarProps) {
  return (
    <div
      style={{
        width: '145px',
        height: '100%',
        backgroundColor: 'white',
        borderRight: '0.5px solid #EDEDED',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 12px',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '0 8px' }}>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 510,
            color: '#666',
            letterSpacing: '-0.7px',
          }}
        >
          Project
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => {
          const Icon = item.icon
          const active = activeTab === item.id
          return (
            <Button
              key={item.id}
              aria-pressed={active}
              onClick={() => onSelect(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: active ? '#F7F7F7' : 'transparent',
                transition: 'background-color 0.15s',
                border: 'none',
                width: '100%',
                fontFamily: workspaceFont,
                textAlign: 'left',
              }}
              onMouseEnter={(event) => {
                if (!active) event.currentTarget.style.backgroundColor = '#FAFAFA'
              }}
              onMouseLeave={(event) => {
                if (!active) event.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span style={{ color: '#454545' }}>
                <Icon />
              </span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 510,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                }}
              >
                {item.label}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
