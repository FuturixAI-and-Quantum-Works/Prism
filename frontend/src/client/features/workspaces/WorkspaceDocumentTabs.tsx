import auditIcon from '../../assets/empty-state/audit-icon.svg'
import legalDocumentIcon from '../../assets/empty-state/legal-document-icon.svg'
import starGradientIcon from '../../assets/empty-state/star-gradient.svg'
import { Button } from '../../components/ui/Button'
import { Tab, TabList } from '../../components/ui/Tabs'
import { workspaceFont } from './workspaceModels'
import type { WorkspaceDocumentTab } from './workspaceModels'

interface WorkspaceDocumentTabsProps {
  activeTab: WorkspaceDocumentTab
  onOpenAssistant: () => void
}

export function WorkspaceDocumentTabs({ activeTab, onOpenAssistant }: WorkspaceDocumentTabsProps) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #EDEDED',
        position: 'relative',
        height: '48px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '16px',
          top: '7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'calc(100% - 32px)',
        }}
      >
        <TabList
          aria-label="Workspace documents"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '34px' }}
        >
          <DocumentTab value="primary" icon={auditIcon} label="Primary Documents" />
          <DocumentTab value="supporting" icon={legalDocumentIcon} label="Supporting Documents" />
        </TabList>
        <Button
          onClick={onOpenAssistant}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '89px',
            height: '26px',
            border: '1px solid #FF5227',
            borderRadius: '3px',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontFamily: workspaceFont,
          }}
        >
          <img src={starGradientIcon} alt="" style={{ width: '15px', height: '16px' }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 510,
              background:
                'linear-gradient(90deg, #FF5227 17.788%, #EB622C 48.558%, #B4E7FF 98.558%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.6px',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            Ask AI
          </span>
        </Button>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: activeTab === 'primary' ? 0 : '203px',
          width: '200px',
          height: '2px',
          backgroundColor: '#F36A33',
          borderRadius: '17px',
          transition: 'left 0.2s ease',
        }}
      />
    </div>
  )
}

function DocumentTab({
  value,
  icon,
  label,
}: {
  value: WorkspaceDocumentTab
  icon: string
  label: string
}) {
  return (
    <Tab
      value={value}
      controls="workspace-documents-panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: value === 'primary' ? '8px' : '10px',
        height: '34px',
        padding: '10px',
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        backgroundColor: value === 'primary' ? 'transparent' : 'white',
        fontFamily: workspaceFont,
      }}
    >
      <div
        style={{
          width: value === 'primary' ? '18px' : '24px',
          height: value === 'primary' ? '18px' : '24px',
          overflow: 'hidden',
        }}
      >
        <img src={icon} alt="" style={{ width: '100%', height: '100%' }} />
      </div>
      <span
        style={{
          fontSize: '16px',
          fontWeight: 510,
          color: value === 'primary' ? '#454545' : '#666',
          letterSpacing: '-0.8px',
          lineHeight: '21px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </Tab>
  )
}
