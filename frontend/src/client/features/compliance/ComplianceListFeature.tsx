import { useCallback, useState } from 'react'
import Layout from '../../components/Layout'
import BrowseFilesModal from '../files/BrowseFilesDialog'
import { ComplianceListContent } from './ComplianceListContent'
import { ComplianceListToolbar } from './ComplianceListToolbar'
import { ComplianceReviewActions } from './ComplianceReviewActions'
import { ProjectPickerDialog } from './ProjectPickerDialog'
import { complianceFontFamily, useCompliancePresentation } from './compliancePresentation'
import type { ComplianceListAction, ComplianceListDocument } from './reviewListModel'
import { useComplianceListSession } from './useComplianceListSession'

export function ComplianceListFeature() {
  useCompliancePresentation()
  const session = useComplianceListSession()
  const [action, setAction] = useState<ComplianceListAction | null>(null)
  const closeAction = useCallback(() => setAction(null), [])

  const openMenu = useCallback(
    (
      document: ComplianceListDocument,
      position: { top: number; left: number },
      trigger: HTMLButtonElement,
    ) => {
      setAction((current) =>
        current?.kind === 'menu' && current.document.id === document.id
          ? null
          : { kind: 'menu', document, position, trigger },
      )
    },
    [],
  )

  const openContextMenu = useCallback(
    (
      document: ComplianceListDocument,
      position: { top: number; left: number },
      trigger: HTMLButtonElement | null,
    ) => setAction({ kind: 'context', document, position, trigger }),
    [],
  )

  return (
    <Layout activePage="compliance">
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F5F5F5',
          fontFamily: complianceFontFamily,
        }}
      >
        <ComplianceListToolbar
          searchQuery={session.search.query}
          onSearchChange={session.search.setQuery}
          activeFilters={session.search.activeFilters}
          onToggleFilter={session.search.toggleFilter}
          onClearFilters={session.search.clearFilters}
          sortOption={session.search.sortOption}
          onSortChange={session.search.setSortOption}
          onUpload={session.upload.open}
          onOpenProjectPicker={() => session.dialogs.setProjectPickerOpen(true)}
        />
        {session.upload.error && (
          <p
            role="alert"
            style={{
              margin: '12px 20px 0',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              color: '#B42318',
              fontSize: '13px',
            }}
          >
            {session.upload.error}
          </p>
        )}
        <ComplianceListContent
          documents={session.documents.filtered}
          isUploading={session.upload.isUploading}
          activeMenuId={action?.kind === 'menu' ? action.document.id : null}
          activeContextMenuId={action?.kind === 'context' ? action.document.id : null}
          onUpload={session.upload.open}
          onBrowse={() => session.dialogs.setBrowseFilesOpen(true)}
          onOpenReview={session.documents.openReview}
          onOpenMenu={openMenu}
          onOpenContextMenu={openContextMenu}
        />
        <ComplianceReviewActions
          action={action}
          onClose={closeAction}
          onOpenReview={({ document }) => session.documents.openReview(document)}
          onDelete={async ({ document }) => {
            await session.documents.deleteReview(document.id)
          }}
        />

        <input
          ref={session.upload.fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp"
          style={{ display: 'none' }}
          onChange={session.upload.handleFileUpload}
        />
        <input
          ref={(input) => {
            session.upload.folderInputRef.current = input
            input?.setAttribute('webkitdirectory', '')
          }}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={session.upload.handleFileUpload}
        />

        <BrowseFilesModal
          isOpen={session.dialogs.browseFilesOpen}
          files={session.documents.browseFiles}
          error={session.upload.error}
          singleSelectMode={true}
          onClose={() => session.dialogs.setBrowseFilesOpen(false)}
          onImport={session.upload.open}
          onUploadFolder={() => session.upload.folderInputRef.current?.click()}
          onSelectFile={(file) => session.documents.openBrowseFile(file.id)}
          onDeleteFiles={session.documents.deleteFiles}
          onRenameFile={session.documents.renameFile}
        />

        <ProjectPickerDialog
          open={session.dialogs.projectPickerOpen}
          onClose={() => session.dialogs.setProjectPickerOpen(false)}
          workspaces={session.documents.workspaces}
          onSelect={session.navigateToProject}
        />
      </div>
    </Layout>
  )
}
