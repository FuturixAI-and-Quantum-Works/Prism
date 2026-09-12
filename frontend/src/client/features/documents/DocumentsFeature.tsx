import FilePreviewModal from '../../components/FilePreviewModal'
import { DocumentContextMenu } from './DocumentActions'
import { DocumentDialogs } from './DocumentDialogs'
import { DocumentShareDialog } from './DocumentShareDialog'
import { DocumentsContent } from './DocumentsContent'
import { DocumentsToolbar } from './DocumentsToolbar'
import { documentFontFamily } from './documentLibraryModel'
import { useDocumentsScreen } from './useDocumentsScreen'

export interface DocumentsFeatureProps {
  isShared?: boolean
}

export default function DocumentsFeature({ isShared = false }: DocumentsFeatureProps) {
  const session = useDocumentsScreen(isShared)

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F5F5F5',
        fontFamily: documentFontFamily,
      }}
    >
      <DocumentsToolbar session={session} />
      <DocumentsContent session={session} />
      <DocumentDialogs session={session} />
      <DocumentShareDialog session={session} />
      <FilePreviewModal
        file={session.previewDocument}
        onClose={() => session.actions.setPreviewDocument(null)}
        onEdit={session.actions.editPreview}
        onShare={session.actions.sharePreview}
      />
      <DocumentContextMenu session={session} />
    </div>
  )
}
