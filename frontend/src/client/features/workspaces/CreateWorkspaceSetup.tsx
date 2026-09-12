import matter from '../../assets/icons/matter.png'
import { Tab, TabList, Tabs } from '../../components/ui/Tabs'
import { CreateWorkspaceAccessStep } from './CreateWorkspaceAccessStep'
import { CreateWorkspaceBasicStep } from './CreateWorkspaceBasicStep'
import type { CreateWorkspaceSession } from './useCreateWorkspaceSession'
import { workspaceFont } from './workspaceModels'

interface CreateWorkspaceSetupProps {
  session: CreateWorkspaceSession
}

export function CreateWorkspaceSetup({ session }: CreateWorkspaceSetupProps) {
  const { actions, step } = session

  return (
    <>
      <div style={{ padding: '20px 20px 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <img src={matter} style={{ width: '24px', height: '24px' }} alt="" />
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 510,
              color: '#272727',
              letterSpacing: '0.2px',
              lineHeight: '21px',
              margin: 0,
            }}
          >
            Start Working on a Matter
          </h2>
        </div>
        <p
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#454545',
            letterSpacing: '-0.28px',
            lineHeight: '18px',
            margin: 0,
          }}
        >
          Set up a controlled space for files, versions, and approvals
        </p>
      </div>

      <Tabs value={step} onValueChange={actions.changeStep}>
        <TabList
          aria-label="Workspace setup steps"
          style={{
            display: 'flex',
            marginTop: '12px',
            border: '1px solid #EDEDED',
            borderLeft: 'none',
            borderRight: 'none',
          }}
        >
          <Tab
            value="basic"
            style={{
              flex: 1,
              padding: '10px',
              textAlign: 'center',
              backgroundColor: step === 'basic' ? '#F7F7F7' : 'transparent',
              borderRight: '1px solid #EDEDED',
              cursor: 'pointer',
              borderTop: 'none',
              borderBottom: 'none',
              borderLeft: 'none',
              fontFamily: workspaceFont,
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '0.2px',
              }}
            >
              Enter basic info
            </span>
          </Tab>
          <Tab
            value="access"
            style={{
              flex: 1,
              padding: '10px',
              textAlign: 'center',
              backgroundColor: step === 'access' ? '#F7F7F7' : 'transparent',
              cursor: 'pointer',
              border: 'none',
              fontFamily: workspaceFont,
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '0.2px',
              }}
            >
              Invite Members
            </span>
          </Tab>
        </TabList>

        <CreateWorkspaceBasicStep session={session} />
        <CreateWorkspaceAccessStep session={session} />
      </Tabs>
    </>
  )
}
