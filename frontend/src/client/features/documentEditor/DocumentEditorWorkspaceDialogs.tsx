import { useRef, type ComponentProps, type Dispatch, type SetStateAction } from 'react'
import BrowseFilesModal from '../files/BrowseFilesDialog'
import FilePreviewModal from '../../components/FilePreviewModal'
import {
  useDeleteDocumentMutation,
  useUpdateDocumentMutation,
} from '../documents/api/documentCoreApi'
import type { Template } from '../templates/templatesApi'
import { ApprovalDialogs } from './ApprovalDialogs'
import { FixRiskDialog } from './FixRiskDialog'
import { SharingDialog } from './SharingDialog'
import { TemplatePickerDialog } from './TemplatePickerDialog'
import type { useDocumentApproval } from './useDocumentApproval'
import type { useDocumentFiles } from './useDocumentFiles'
import type { useDocumentSharing } from './useDocumentSharing'
import type { useRiskFixWorkflow } from './useRiskFixWorkflow'

interface DocumentEditorWorkspaceDialogsProps {
  approval: ReturnType<typeof useDocumentApproval>
  canManageSharing: boolean
  canOwnerReviewApproval: boolean
  canSendForApproval: boolean
  displayedTemplates: Template[]
  files: ReturnType<typeof useDocumentFiles>
  isTemplateModalOpen: boolean
  onEditFile: (fileId: string) => void
  riskFix: ReturnType<typeof useRiskFixWorkflow>
  setEditorContent: ComponentProps<typeof TemplatePickerDialog>['setEditorContent']
  setIsTemplateModalOpen: Dispatch<SetStateAction<boolean>>
  setSelectedTemplate: Dispatch<SetStateAction<Template | null>>
  setTemplateSearchQuery: Dispatch<SetStateAction<string>>
  sharing: ReturnType<typeof useDocumentSharing>
  templateSearchQuery: string
}

export function DocumentEditorWorkspaceDialogs({
  approval,
  canManageSharing,
  canOwnerReviewApproval,
  canSendForApproval,
  displayedTemplates,
  files,
  isTemplateModalOpen,
  onEditFile,
  riskFix,
  setEditorContent,
  setIsTemplateModalOpen,
  setSelectedTemplate,
  setTemplateSearchQuery,
  sharing,
  templateSearchQuery,
}: DocumentEditorWorkspaceDialogsProps) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const [deleteDocument] = useDeleteDocumentMutation()
  const [updateDocument] = useUpdateDocumentMutation()

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp"
        aria-label="Import context document"
        onChange={files.upload}
        style={{ display: 'none' }}
      />
      <TemplatePickerDialog
        displayedTemplates={displayedTemplates}
        isTemplateModalOpen={isTemplateModalOpen}
        setEditorContent={setEditorContent}
        setIsTemplateModalOpen={setIsTemplateModalOpen}
        setSelectedTemplate={setSelectedTemplate}
        setTemplateSearchQuery={setTemplateSearchQuery}
        templateSearchQuery={templateSearchQuery}
      />
      <ApprovalDialogs
        approvalError={approval.sendError}
        approvalModalOpen={approval.sendOpen}
        canOwnerReviewApproval={canOwnerReviewApproval}
        canSendForApproval={canSendForApproval}
        handleOwnerApproveDocument={approval.approve}
        handleOwnerRejectDocument={approval.reject}
        handleSendForApproval={approval.send}
        isSendingForApproval={approval.isLoading}
        ownerApprovalError={approval.reviewError}
        ownerApproveModalOpen={approval.approveOpen}
        ownerRejectAnchor={approval.rejectAnchor}
        ownerRejectModalOpen={approval.rejectOpen}
        ownerRejectNote={approval.rejectNote}
        ownerRejectPage={approval.rejectPage}
        ownerRejectSection={approval.rejectSection}
        setApprovalModalOpen={approval.setSendOpen}
        setOwnerApprovalError={approval.setReviewError}
        setOwnerApproveModalOpen={approval.setApproveOpen}
        setOwnerRejectAnchor={approval.setRejectAnchor}
        setOwnerRejectModalOpen={approval.setRejectOpen}
        setOwnerRejectNote={approval.setRejectNote}
        setOwnerRejectPage={approval.setRejectPage}
        setOwnerRejectSection={approval.setRejectSection}
      />
      <SharingDialog canManage={canManageSharing} model={sharing} />
      <FixRiskDialog model={riskFix} />
      <BrowseFilesModal
        isOpen={files.browseOpen}
        files={files.browseFiles}
        error={files.error}
        onClose={() => files.setBrowseOpen(false)}
        onImport={() => importInputRef.current?.click()}
        onSelectFile={files.attachExisting}
        onDeleteFiles={(fileIds) =>
          Promise.all(fileIds.map((fileId) => deleteDocument(fileId).unwrap())).then(
            () => undefined,
          )
        }
        onRenameFile={(fileId, name) =>
          updateDocument({ id: fileId, name })
            .unwrap()
            .then(() => undefined)
        }
      />
      <FilePreviewModal
        file={files.previewFile}
        onClose={() => files.setPreviewFile(null)}
        onEdit={(file) => onEditFile(file.id)}
      />
    </>
  )
}
