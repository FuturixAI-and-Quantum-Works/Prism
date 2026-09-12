import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardAssistant } from './DashboardAssistant'

const mocks = vi.hoisted(() => ({
  deleteDocument: vi.fn((_id: string) => ({ unwrap: () => Promise.resolve() })),
  updateDocument: vi.fn((_input: { id: string; name: string }) => ({
    unwrap: () => Promise.resolve(),
  })),
  uploadDocument: vi.fn((_data: FormData) => ({ unwrap: () => Promise.resolve() })),
}))

vi.mock('../assistant/panel/AiAssistantPanel', () => ({ default: () => null }))
vi.mock('../files/BrowseFilesDialog', () => ({
  default: ({
    onDeleteFiles,
    onImport,
    onRenameFile,
    onUploadFolder,
    error,
  }: {
    onDeleteFiles: (ids: string[]) => void
    onImport: () => void
    onRenameFile: (id: string, name: string) => void
    onUploadFolder: () => void
    error?: string
  }) => (
    <>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onImport}>
        Import from browser
      </button>
      <button type="button" onClick={onUploadFolder}>
        Import folder from browser
      </button>
      <button type="button" onClick={() => onRenameFile('document-1', 'Renamed.docx')}>
        Rename selected
      </button>
      <button type="button" onClick={() => onDeleteFiles(['document-1'])}>
        Delete selected
      </button>
    </>
  ),
}))
vi.mock('../documents/api/documentCoreApi', () => ({
  useDeleteDocumentMutation: () => [mocks.deleteDocument],
  useUpdateDocumentMutation: () => [mocks.updateDocument],
  useUploadDocumentMutation: () => [mocks.uploadDocument],
}))

const session = {
  actions: {
    openWorkspace: vi.fn(),
    selectFile: vi.fn(),
    setAiPanelCollapsed: vi.fn(),
    setAiPanelWidth: vi.fn(),
    setBrowseFilesModalOpen: vi.fn(),
  },
  aiPanelCollapsed: false,
  aiPanelWidth: 400,
  browseFiles: [],
  browseFilesModalOpen: true,
  isWorkspacesEmpty: true,
  recentWorkspaces: [],
  userName: 'Alex',
}

describe('DashboardAssistant file actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses document services for upload, rename, and delete controls', async () => {
    const user = userEvent.setup()
    render(<DashboardAssistant session={session} onAddProject={vi.fn()} />)

    const fileInput = screen.getByLabelText<HTMLInputElement>('Import documents')
    const folderInput = screen.getByLabelText<HTMLInputElement>('Upload document folder')
    const fileClick = vi.spyOn(fileInput, 'click')
    const folderClick = vi.spyOn(folderInput, 'click')

    await user.click(screen.getByRole('button', { name: 'Import from browser' }))
    await user.click(screen.getByRole('button', { name: 'Import folder from browser' }))
    expect(fileClick).toHaveBeenCalledOnce()
    expect(folderClick).toHaveBeenCalledOnce()

    const file = new File(['agreement'], 'agreement.txt', { type: 'text/plain' })
    await user.upload(fileInput, file)
    await waitFor(() => expect(mocks.uploadDocument).toHaveBeenCalledOnce())
    expect(mocks.uploadDocument.mock.calls[0]?.[0].get('file')).toBe(file)

    await user.click(screen.getByRole('button', { name: 'Rename selected' }))
    expect(mocks.updateDocument).toHaveBeenCalledWith({
      id: 'document-1',
      name: 'Renamed.docx',
    })

    await user.click(screen.getByRole('button', { name: 'Delete selected' }))
    expect(mocks.deleteDocument).toHaveBeenCalledWith('document-1')
  })

  it('reports upload failures in the file browser', async () => {
    mocks.uploadDocument.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { detail: 'Upload was rejected.' } }),
    })
    const user = userEvent.setup()
    render(<DashboardAssistant session={session} onAddProject={vi.fn()} />)

    await user.upload(
      screen.getByLabelText<HTMLInputElement>('Import documents'),
      new File(['agreement'], 'agreement.txt', { type: 'text/plain' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Upload was rejected.')
  })
})
