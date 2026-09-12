import { useCallback, useState } from 'react'
import type { SupportingDocument } from './complianceModels'
import { complianceFontFamily } from './compliancePresentation'
import { PrimaryDocumentPanel } from './PrimaryDocumentPanel'
import { SupportingDocumentsPanel } from './SupportingDocumentsPanel'

interface DocumentSourcesPanelProps {
  documentName: string
  uploadTime: string
  isLoading: boolean
  supportingDocuments: SupportingDocument[]
  error: string | null
  onUpload: () => void
  onBrowse: () => void
  onClear: () => void | Promise<void>
  onPreview: (document: SupportingDocument) => void
  onRemove: (documentId: string) => void | Promise<void>
}

export function DocumentSourcesPanel({
  documentName,
  uploadTime,
  isLoading,
  supportingDocuments,
  error,
  onUpload,
  onBrowse,
  onClear,
  onPreview,
  onRemove,
}: DocumentSourcesPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [primaryDocumentHeight, setPrimaryDocumentHeight] = useState<number | null>(null)
  const updateHeight = useCallback((height: number) => setPrimaryDocumentHeight(height), [])

  return (
    <section
      className="custom-scrollbar"
      style={{
        width: 'auto',
        maxHeight: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '7px 20px',
          borderBottom: '1px solid #EDEDED',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <p
          style={{
            margin: 0,
            flex: 1,
            fontSize: '18px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.9px',
            lineHeight: '21px',
            fontFamily: complianceFontFamily,
          }}
        >
          Documents and Supporting files
        </p>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls="compliance-documents"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '32px',
            width: '92px',
            padding: '8px 14px',
            backgroundColor: '#F7F7F7',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: complianceFontFamily,
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 510, color: '#454545' }}>
            {collapsed ? 'Expand' : 'Collapse'}
          </span>
        </button>
      </div>
      {error && (
        <p
          role="alert"
          style={{
            margin: '8px 20px 0',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            color: '#B42318',
            fontSize: '13px',
          }}
        >
          {error}
        </p>
      )}
      {!collapsed && (
        <div id="compliance-documents" style={{ display: 'flex', flex: 1, overflowX: 'hidden' }}>
          <PrimaryDocumentPanel
            documentName={documentName}
            uploadTime={uploadTime}
            isLoading={isLoading}
            onHeightChange={updateHeight}
          />
          <SupportingDocumentsPanel
            documents={supportingDocuments}
            primaryDocumentHeight={primaryDocumentHeight}
            onUpload={onUpload}
            onBrowse={onBrowse}
            onClear={onClear}
            onPreview={onPreview}
            onRemove={onRemove}
          />
        </div>
      )}
    </section>
  )
}
