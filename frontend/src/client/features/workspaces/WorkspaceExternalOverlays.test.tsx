import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceExternalOverlays } from './WorkspaceExternalOverlays'

const mocks = vi.hoisted(() => {
  const mutationResult = () => ({ unwrap: () => Promise.resolve() })
  return {
    deleteDocument: vi.fn(mutationResult),
    updateDocument: vi.fn(mutationResult),
  }
})

vi.mock('../assistant/panel/AiAssistantPanel', () => ({ default: () => null }))
vi.mock('../../components/FilePreviewModal', () => ({ default: () => null }))
vi.mock('../files/BrowseFilesDialog', () => ({
  default: ({
    onDeleteFiles,
    onRenameFile,
    onUploadFolder,
  }: {
    onDeleteFiles: (fileIds: string[]) => void
    onRenameFile: (fileId: string, name: string) => void
    onUploadFolder?: () => void
  }) => (
    <>
      {onUploadFolder && (
        <button type="button" onClick={onUploadFolder}>
          Upload folder
        </button>
      )}
      <button type="button" onClick={() => onDeleteFiles(['document-1'])}>
        Delete source
      </button>
      <button type="button" onClick={() => onRenameFile('document-1', 'Renamed.pdf')}>
        Rename source
      </button>
    </>
  ),
}))
vi.mock('../documents/api/documentCoreApi', () => ({
  useDeleteDocumentMutation: () => [mocks.deleteDocument],
  useUpdateDocumentMutation: () => [mocks.updateDocument],
}))

function makeSession() {
  return {
    workspaceId: 'workspace-1',
    isViewer: false,
    documents: {
      browseFilesOpen: true,
      browseFiles: [],
      previewFile: null,
      refs: { fileInputRef: createRef<HTMLInputElement>() },
      actions: {
        closeBrowseFiles: vi.fn(),
        triggerUpload: vi.fn(),
        importFile: vi.fn(),
        closePreview: vi.fn(),
        editPreview: vi.fn(),
        selectUpload: vi.fn(),
        refetch: vi.fn(),
      },
    },
    ai: {
      collapsed: true,
      toggle: vi.fn(),
      width: 420,
      setWidth: vi.fn(),
    },
  }
}

describe('WorkspaceExternalOverlays', () => {
  it('omits unsupported folder upload and wires document mutations', async () => {
    const user = userEvent.setup()
    render(<WorkspaceExternalOverlays session={makeSession()} />)

    expect(screen.queryByRole('button', { name: 'Upload folder' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete source' }))
    expect(mocks.deleteDocument).toHaveBeenCalledWith('document-1')

    await user.click(screen.getByRole('button', { name: 'Rename source' }))
    expect(mocks.updateDocument).toHaveBeenCalledWith({
      id: 'document-1',
      name: 'Renamed.pdf',
    })
  })
})
