import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DocumentEditorWorkspaceDialogs } from './DocumentEditorWorkspaceDialogs'

const mocks = vi.hoisted(() => ({
  deleteDocument: vi.fn((_id: string) => ({ unwrap: () => Promise.resolve() })),
  updateDocument: vi.fn((_input: { id: string; name: string }) => ({
    unwrap: () => Promise.resolve(),
  })),
}))

vi.mock('../files/BrowseFilesDialog', () => ({
  default: ({
    onDeleteFiles,
    onImport,
    onRenameFile,
    onUploadFolder,
  }: {
    onDeleteFiles: (ids: string[]) => void
    onImport: () => void
    onRenameFile: (id: string, name: string) => void
    onUploadFolder?: () => void
  }) => (
    <>
      <button type="button" onClick={onImport}>
        Import document
      </button>
      {onUploadFolder && <button type="button">Upload folder</button>}
      <button type="button" onClick={() => onRenameFile('document-1', 'Renamed.docx')}>
        Rename selected
      </button>
      <button type="button" onClick={() => onDeleteFiles(['document-1'])}>
        Delete selected
      </button>
    </>
  ),
}))
vi.mock('../../components/FilePreviewModal', () => ({ default: () => null }))
vi.mock('../documents/api/documentCoreApi', () => ({
  useDeleteDocumentMutation: () => [mocks.deleteDocument],
  useUpdateDocumentMutation: () => [mocks.updateDocument],
}))
vi.mock('./ApprovalDialogs', () => ({ ApprovalDialogs: () => null }))
vi.mock('./FixRiskDialog', () => ({ FixRiskDialog: () => null }))
vi.mock('./SharingDialog', () => ({ SharingDialog: () => null }))
vi.mock('./TemplatePickerDialog', () => ({ TemplatePickerDialog: () => null }))

const props = {
  approval: {},
  canManageSharing: false,
  canOwnerReviewApproval: false,
  canSendForApproval: false,
  displayedTemplates: [],
  files: {
    attachExisting: vi.fn(),
    browseFiles: [],
    browseOpen: true,
    folderInputRef: { current: null },
    previewFile: null,
    setBrowseOpen: vi.fn(),
    setPreviewFile: vi.fn(),
    upload: vi.fn(),
  },
  isTemplateModalOpen: false,
  onEditFile: vi.fn(),
  riskFix: {},
  setEditorContent: vi.fn(),
  setIsTemplateModalOpen: vi.fn(),
  setSelectedTemplate: vi.fn(),
  setTemplateSearchQuery: vi.fn(),
  sharing: {},
  templateSearchQuery: '',
} as unknown as ComponentProps<typeof DocumentEditorWorkspaceDialogs>

describe('DocumentEditorWorkspaceDialogs', () => {
  it('uses document services for rename and delete controls', async () => {
    const user = userEvent.setup()
    render(<DocumentEditorWorkspaceDialogs {...props} />)

    await user.click(screen.getByRole('button', { name: 'Rename selected' }))
    expect(mocks.updateDocument).toHaveBeenCalledWith({
      id: 'document-1',
      name: 'Renamed.docx',
    })

    await user.click(screen.getByRole('button', { name: 'Delete selected' }))
    expect(mocks.deleteDocument).toHaveBeenCalledWith('document-1')
  })

  it('uses the context uploader and hides unsupported folder upload', async () => {
    const user = userEvent.setup()
    render(<DocumentEditorWorkspaceDialogs {...props} />)
    const input = screen.getByLabelText<HTMLInputElement>('Import context document')
    const click = vi.spyOn(input, 'click')

    await user.click(screen.getByRole('button', { name: 'Import document' }))

    expect(click).toHaveBeenCalledOnce()
    await user.upload(input, new File(['terms'], 'terms.pdf', { type: 'application/pdf' }))
    expect(props.files.upload).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Upload folder' })).not.toBeInTheDocument()
  })
})
