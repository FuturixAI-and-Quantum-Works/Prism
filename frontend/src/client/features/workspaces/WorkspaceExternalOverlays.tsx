import AiAssistantPanel from '../assistant/panel/AiAssistantPanel'
import BrowseFilesModal from '../files/BrowseFilesDialog'
import FilePreviewModal from '../../components/FilePreviewModal'
import {
  useDeleteDocumentMutation,
  useUpdateDocumentMutation,
} from '../documents/api/documentCoreApi'
import type { WorkspaceDetailSession } from './useWorkspaceDetailSession'

type WorkspaceExternalOverlaysSession = Pick<WorkspaceDetailSession, 'workspaceId' | 'isViewer'> & {
  documents: Pick<
    WorkspaceDetailSession['documents'],
    'browseFiles' | 'browseFilesOpen' | 'previewFile'
  > & {
    actions: Pick<
      WorkspaceDetailSession['documents']['actions'],
      | 'closeBrowseFiles'
      | 'closePreview'
      | 'editPreview'
      | 'importFile'
      | 'refetch'
      | 'selectUpload'
      | 'triggerUpload'
    >
    refs: Pick<WorkspaceDetailSession['documents']['refs'], 'fileInputRef'>
  }
  ai: Pick<WorkspaceDetailSession['ai'], 'collapsed' | 'setWidth' | 'toggle' | 'width'>
}

interface WorkspaceExternalOverlaysProps {
  session: WorkspaceExternalOverlaysSession
}

export function WorkspaceExternalOverlays({ session }: WorkspaceExternalOverlaysProps) {
  const documents = session.documents
  const [deleteDocument] = useDeleteDocumentMutation()
  const [updateDocument] = useUpdateDocumentMutation()

  return (
    <>
      <BrowseFilesModal
        isOpen={documents.browseFilesOpen}
        files={documents.browseFiles}
        onClose={documents.actions.closeBrowseFiles}
        onImport={documents.actions.triggerUpload}
        onSelectFile={documents.actions.importFile}
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
        file={documents.previewFile}
        onClose={documents.actions.closePreview}
        onEdit={documents.actions.editPreview}
      />
      <AiAssistantPanel
        workspaceId={session.workspaceId}
        collapsed={session.ai.collapsed}
        onToggle={session.ai.toggle}
        width={session.ai.width}
        onWidthChange={session.ai.setWidth}
        onRefetch={documents.actions.refetch}
      />
      {!session.isViewer && (
        <input
          ref={documents.refs.fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={documents.actions.selectUpload}
        />
      )}
    </>
  )
}
