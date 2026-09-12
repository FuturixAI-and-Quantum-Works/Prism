import { TabPanel } from '../../components/ui/Tabs'
import type { CreateWorkspaceSession } from './useCreateWorkspaceSession'
import { workspaceFont } from './workspaceModels'

interface CreateWorkspaceBasicStepProps {
  session: CreateWorkspaceSession
}

export function CreateWorkspaceBasicStep({ session }: CreateWorkspaceBasicStepProps) {
  const { fields, ids, refs, actions } = session

  return (
    <TabPanel
      value="basic"
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor={ids.workspaceNameId}
          style={{
            fontSize: '16px',
            fontWeight: 510,
            color: '#272727',
            letterSpacing: '-0.8px',
          }}
        >
          Project Name
        </label>
        <input
          id={ids.workspaceNameId}
          ref={refs.workspaceNameRef}
          type="text"
          placeholder="e.g. Q4 Contracts"
          value={fields.workspaceName}
          onChange={(event) => actions.setWorkspaceName(event.target.value)}
          style={{
            padding: '10px 15px',
            backgroundColor: '#F7F7F7',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 400,
            color: '#272727',
            outline: 'none',
            fontFamily: workspaceFont,
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor={ids.descriptionId}
          style={{
            fontSize: '16px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.8px',
          }}
        >
          Description (optional)
        </label>
        <textarea
          id={ids.descriptionId}
          placeholder="Add a short description about this workspace"
          value={fields.description}
          onChange={(event) => actions.setDescription(event.target.value)}
          style={{
            padding: '10px 15px',
            backgroundColor: '#F7F7F7',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 400,
            color: '#272727',
            outline: 'none',
            fontFamily: workspaceFont,
            minHeight: '180px',
            resize: 'none',
          }}
        />
      </div>

      <button
        type="button"
        onClick={actions.openAccessStep}
        style={{
          padding: '10px',
          height: '52px',
          backgroundColor: '#272727',
          border: 'none',
          borderRadius: '12px',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 510,
          letterSpacing: '0.2px',
          cursor: 'pointer',
          fontFamily: workspaceFont,
        }}
      >
        Next
      </button>
    </TabPanel>
  )
}
