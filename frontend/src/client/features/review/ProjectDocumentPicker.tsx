import { useEffect, useState } from 'react'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { useGetDocumentsQuery } from '../documents/documentsApi'
import { reviewFontFamily as fontFamily } from './reviewModel'

export function ProjectDocumentPicker({
  open,
  projectId,
  currentDocIds,
  onClose,
  onSave,
}: {
  open: boolean
  projectId: string | null | undefined
  currentDocIds: string[]
  onClose: () => void
  onSave: (documentIds: string[]) => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentDocIds)
  const { data: projectDocuments = [], isLoading } = useGetDocumentsQuery(
    { project_id: projectId || null },
    { skip: !open || !projectId },
  )

  useEffect(() => {
    if (open) setSelectedIds(currentDocIds)
  }, [open, currentDocIds])

  if (!open) return null

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      labelledBy="review-documents-title"
      overlayStyle={{
        backgroundColor: 'rgba(0,0,0,0.35)',
      }}
      contentStyle={{
        width: '520px',
        maxHeight: '78vh',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 18px 44px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #EDEDED' }}>
        <h2 id="review-documents-title" style={{ margin: 0, fontSize: '18px', color: '#272727' }}>
          Review documents
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#797979' }}>
          Only documents in this review project are available.
        </p>
      </div>
      <div style={{ overflow: 'auto', padding: '8px 0' }}>
        {!projectId ? (
          <div role="status" style={{ padding: '18px', color: '#797979' }}>
            This review is not linked to a project.
          </div>
        ) : isLoading ? (
          <div role="status" aria-live="polite" style={{ padding: '18px', color: '#797979' }}>
            Loading documents...
          </div>
        ) : projectDocuments.length === 0 ? (
          <div role="status" style={{ padding: '18px', color: '#797979' }}>
            No documents found in this project.
          </div>
        ) : (
          projectDocuments.map((doc) => (
            <label
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 18px',
                borderBottom: '1px solid #F3F3F3',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(doc.id)}
                onChange={() =>
                  setSelectedIds((prev) =>
                    prev.includes(doc.id) ? prev.filter((id) => id !== doc.id) : [...prev, doc.id],
                  )
                }
              />
              <span style={{ fontSize: '14px', color: '#454545' }}>{doc.filename}</span>
            </label>
          ))
        )}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '14px 18px',
          borderTop: '1px solid #EDEDED',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            height: '36px',
            border: 'none',
            borderRadius: '8px',
            padding: '0 14px',
            backgroundColor: '#F7F7F7',
            cursor: 'pointer',
            fontFamily,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(selectedIds)}
          style={{
            height: '36px',
            border: 'none',
            borderRadius: '8px',
            padding: '0 14px',
            backgroundColor: '#272727',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontFamily,
          }}
        >
          Save documents
        </button>
      </div>
    </AccessibleDialog>
  )
}
