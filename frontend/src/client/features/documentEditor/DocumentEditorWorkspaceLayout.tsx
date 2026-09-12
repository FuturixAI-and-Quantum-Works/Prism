import type { ComponentProps } from 'react'
import Layout from '../../components/Layout'
import { DocumentCanvas } from './DocumentCanvas'
import { DocumentEditorRightPanel } from './DocumentEditorRightPanel'
import { DocumentHeader } from './DocumentHeader'
import { DocumentSidebar } from './DocumentSidebar'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface DocumentEditorWorkspaceLayoutProps {
  activePage: string
  breadcrumbs: ComponentProps<typeof Layout>['breadcrumbs']
  canvas: ComponentProps<typeof DocumentCanvas>
  canGoToFlaggedSection: boolean
  children: React.ReactNode
  header: ComponentProps<typeof DocumentHeader>
  onGoToFlaggedSection: () => void
  rightPanel: ComponentProps<typeof DocumentEditorRightPanel>
  sidebar: ComponentProps<typeof DocumentSidebar>
}

export function DocumentEditorWorkspaceLayout({
  activePage,
  breadcrumbs,
  canvas,
  canGoToFlaggedSection,
  children,
  header,
  onGoToFlaggedSection,
  rightPanel,
  sidebar,
}: DocumentEditorWorkspaceLayoutProps) {
  return (
    <Layout activePage={activePage} breadcrumbs={breadcrumbs} forceSidebarCollapsed>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', fontFamily }}>
        <DocumentHeader {...header} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <DocumentSidebar {...sidebar} />
          <DocumentCanvas {...canvas} />
          <DocumentEditorRightPanel {...rightPanel} />
        </div>

        {children}

        {canGoToFlaggedSection && (
          <button
            onClick={onGoToFlaggedSection}
            style={{
              position: 'fixed',
              right: '28px',
              bottom: '28px',
              zIndex: 900,
              height: '42px',
              padding: '0 16px',
              border: '1px solid #F2C7C3',
              borderRadius: '8px',
              backgroundColor: '#C83A2D',
              color: '#FFFFFF',
              boxShadow: '0 10px 24px rgba(200, 58, 45, 0.22)',
              fontSize: '14px',
              fontWeight: 650,
              cursor: 'pointer',
              fontFamily,
            }}
          >
            Go to flagged section
          </button>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .loading-spinner {
            animation: spin 1s linear infinite;
          }
          @keyframes wordFadeIn {
            from { opacity: 0; transform: translateY(2px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-4px); }
          }
          .doc-editor-scroll::-webkit-scrollbar,
          .doc-editor-panel::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }
          .doc-editor-scroll::-webkit-scrollbar-track,
          .doc-editor-panel::-webkit-scrollbar-track {
            background: transparent;
          }
          .doc-editor-scroll::-webkit-scrollbar-thumb,
          .doc-editor-panel::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.12);
            border-radius: 10px;
          }
          .doc-editor-scroll::-webkit-scrollbar-thumb:hover,
          .doc-editor-panel::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.2);
          }
          .doc-editor-scroll::-webkit-scrollbar-button,
          .doc-editor-panel::-webkit-scrollbar-button {
            display: none;
            width: 0;
            height: 0;
          }
          .doc-editor-scroll::-webkit-scrollbar-corner,
          .doc-editor-panel::-webkit-scrollbar-corner {
            background: transparent;
          }
          .doc-editor-scroll,
          .doc-editor-panel {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.12) transparent;
          }
        `}</style>
      </div>
    </Layout>
  )
}
