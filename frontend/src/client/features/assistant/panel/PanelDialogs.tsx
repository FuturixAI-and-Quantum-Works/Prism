import { useCreateDocumentMutation } from '../../documents/documentsApi'
import CreateDocumentModal from '../../../components/CreateDocumentModal'
import TemplateWizardCard from '../../../components/chat/TemplateWizardCard'
import type { WizardData } from './types'

export function CreateDocumentDialog({
  open,
  projectId,
  workspaceId,
  onClose,
  onContinue,
}: {
  open: boolean
  projectId?: string
  workspaceId?: string
  onClose: () => void
  onContinue: (documentId: string) => void
}) {
  const [createDocument] = useCreateDocumentMutation()

  return (
    <CreateDocumentModal
      open={open}
      onClose={onClose}
      onCreateDocument={async (document) => {
        const result = await createDocument({
          filename: document.name,
          project_id: projectId,
          workspace_id: workspaceId,
        }).unwrap()
        return { id: result.id }
      }}
      onContinue={onContinue}
    />
  )
}

export function WizardMessage({
  wizard,
  parsedContent,
  isStreaming,
  onComplete,
  onCancel,
  onGenerate,
}: {
  wizard: WizardData
  parsedContent: string
  isStreaming: boolean
  onComplete: () => void
  onCancel: () => void
  onGenerate: (prompt: string) => void
}) {
  return (
    <div
      aria-busy={isStreaming}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
      }}
    >
      {parsedContent && (
        <div
          style={{
            maxWidth: '85%',
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            backgroundColor: '#F7F7F7',
            color: '#454545',
            marginBottom: '12px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '20px',
              letterSpacing: '-0.28px',
            }}
          >
            {parsedContent}
          </p>
        </div>
      )}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {wizard.template_id === null ? (
          <TemplateWizardCard
            mode="generated"
            templateName={wizard.template_name}
            fields={wizard.fields}
            onCancel={onCancel}
            onGenerate={(documentType, values) => {
              onComplete()
              const valuesText = Object.entries(values)
                .filter(([, value]) => value.trim())
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
              onGenerate(
                `Generate a ${documentType} document with the following details:\n\n${valuesText}`,
              )
            }}
          />
        ) : (
          <TemplateWizardCard
            mode="template"
            templateId={wizard.template_id}
            templateName={wizard.template_name}
            fields={wizard.fields}
            onCancel={onCancel}
            onDocumentCreated={onComplete}
          />
        )}
      </div>
    </div>
  )
}
