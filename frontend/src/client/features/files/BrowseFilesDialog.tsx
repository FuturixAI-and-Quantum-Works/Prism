import FilePreviewModal from '../../components/FilePreviewModal'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { FileBrowserHeader } from './FileBrowserHeader'
import { FileBrowserList } from './FileBrowserList'
import { FileBrowserTree } from './FileBrowserTree'
import { FileSelectionActions } from './FileSelectionActions'
import { EmptyFileBrowser, FileImportAction } from './FileUploadActions'
import type { BrowseFilesModalProps } from './fileBrowserTypes'
import { useFileBrowserState } from './useFileBrowserState'

export default function BrowseFilesDialog({
  isOpen,
  files,
  error,
  onClose,
  onImport,
  onUploadFolder,
  onSelectFile,
  onDeleteFiles,
  onRenameFile,
  maxSelection,
  singleSelectMode,
  previewSourceType = 'document',
}: BrowseFilesModalProps) {
  const session = useFileBrowserState({
    files,
    onClose,
    onSelectFile,
    onDeleteFiles,
    onRenameFile,
    maxSelection,
    singleSelectMode,
    previewSourceType,
  })

  if (!isOpen) return null

  const { actions, refs, state } = session
  const hasFiles = files.length > 0
  const hasSelection = state.selectedFiles.size > 0

  return (
    <>
      <AccessibleDialog
        open={isOpen && !state.previewFile}
        onClose={onClose}
        label="Browse files"
        initialFocusRef={refs.searchInputRef}
        contentStyle={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '18px 4px 37px rgba(0, 0, 0, 0.12)',
          width: hasFiles ? '578px' : '368px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          overflow: 'hidden',
        }}
      >
        <FileBrowserHeader />
        {(state.actionError || error) && (
          <p
            role="alert"
            style={{
              margin: '0 20px 12px',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              color: '#B42318',
              fontSize: '13px',
            }}
          >
            {state.actionError || error}
          </p>
        )}
        {hasFiles ? (
          <>
            <FileBrowserTree
              currentPath={state.currentPath}
              folders={state.folders}
              searchInputRef={refs.searchInputRef}
              searchQuery={state.searchQuery}
              onNavigateFolder={actions.navigateToFolder}
              onNavigatePath={actions.navigateToPathIndex}
              onNavigateRoot={actions.navigateToRoot}
              onSearchQueryChange={actions.setSearchQuery}
            />
            <FileBrowserList
              fileKeyboardHelpId={state.fileKeyboardHelpId}
              groups={state.groups}
              selectedFiles={state.selectedFiles}
              onActivate={actions.activateFile}
              onKeyDown={actions.handleFileKeyDown}
              onPreview={actions.openPreview}
            />
            {hasSelection ? (
              <FileSelectionActions
                busy={state.pendingAction !== null}
                selectedCount={state.selectedFiles.size}
                singleSelectMode={singleSelectMode}
                onConfirm={actions.confirmSelection}
                onDelete={actions.deleteSelection}
                onDeselectAll={actions.deselectAll}
                onRename={actions.renameSelection}
                onSelectAll={actions.selectAll}
              />
            ) : (
              <FileImportAction onImport={onImport} />
            )}
          </>
        ) : (
          <EmptyFileBrowser onImport={onImport} onUploadFolder={onUploadFolder} />
        )}
      </AccessibleDialog>
      <FilePreviewModal
        actionError={state.actionError || error}
        file={state.previewFile}
        onClose={actions.closePreview}
        onEdit={actions.editPreview}
      />
    </>
  )
}
