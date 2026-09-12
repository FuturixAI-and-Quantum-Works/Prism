import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { CreateWorkspaceSetup } from './CreateWorkspaceSetup'
import { CreateWorkspaceSuccess } from './CreateWorkspaceSuccess'
import { workspaceFont } from './workspaceModels'
import { useCreateWorkspaceSession } from './useCreateWorkspaceSession'

export interface CreateWorkspaceModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const session = useCreateWorkspaceSession({ onClose })
  return (
    <AccessibleDialog
      open={open}
      onClose={session.actions.close}
      label={session.step === 'success' ? 'Workspace created' : 'Create workspace'}
      initialFocusRef={session.refs.workspaceNameRef}
      contentStyle={{
        width: '452px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0px 0px 44px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        fontFamily: workspaceFont,
      }}
    >
      {session.step === 'success' ? (
        <CreateWorkspaceSuccess session={session} />
      ) : (
        <CreateWorkspaceSetup session={session} />
      )}
    </AccessibleDialog>
  )
}
