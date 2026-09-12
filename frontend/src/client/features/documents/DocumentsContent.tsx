import { Button } from '../../components/ui/Button'
import { DocumentCard } from './DocumentCard'
import { documentFontFamily } from './documentLibraryModel'
import { DocumentsEmptyState } from './DocumentsEmptyState'
import type { DocumentsScreenSession } from './useDocumentsScreen'

export function DocumentsContent({ session }: { session: DocumentsScreenSession }) {
  const { statusFilter, isLoading, isError, documents, isMobile, isShared, actions } = session

  return (
    <div
      id="documents-results"
      role="tabpanel"
      aria-label={`${statusFilter === 'active' ? 'Active' : 'Done'} documents`}
      style={{
        flex: 1,
        padding: '24px',
        overflow: 'auto',
        backgroundColor: '#F5F5F5',
      }}
    >
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
          }}
        >
          <p style={{ color: '#666', fontSize: '16px' }}>Loading documents...</p>
        </div>
      ) : isError ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            height: '220px',
          }}
        >
          <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
            Documents could not be loaded.
          </p>
          <Button
            onClick={() => actions.retry()}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#272727',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontFamily: documentFontFamily,
            }}
          >
            Retry
          </Button>
        </div>
      ) : session.sourceDocumentCount === 0 ? (
        <DocumentsEmptyState
          onUpload={actions.uploadFromEmptyState}
          onUseTemplate={actions.useTemplate}
          onCreateDocument={actions.createDocument}
          isShared={isShared}
        />
      ) : documents.length === 0 ? (
        <div
          role="status"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '220px',
            color: '#666',
            fontSize: '16px',
          }}
        >
          No documents match your search or status filter.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fill, minmax(239px, 1fr))',
            gap: isMobile ? '12px' : '16px',
          }}
        >
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onClick={() =>
                actions.setPreviewDocument({
                  sourceType: 'document',
                  id: doc.id,
                  filename: doc.title,
                  fileType: doc.fileType,
                  createdAt: doc.createdAt,
                })
              }
              onContextMenu={(event) => actions.openPointerContextMenu(event, doc)}
              onContextMenuKeyDown={(event) => actions.openKeyboardContextMenu(event, doc)}
              onAction={(action) => actions.runDocumentAction(action, doc)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
