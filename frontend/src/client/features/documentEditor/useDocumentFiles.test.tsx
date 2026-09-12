import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentContextFile } from '../documents/api/documentContentApi'
import { useDocumentFiles } from './useDocumentFiles'

const api = vi.hoisted(() => ({
  add: vi.fn(),
  contextFiles: [] as DocumentContextFile[] | undefined,
  documents: [] as Array<Record<string, unknown>>,
  remove: vi.fn(),
  upload: vi.fn(),
}))

vi.mock('../documents/api/documentContentApi', () => ({
  useAddDocumentContextFileMutation: () => [api.add],
  useGetDocumentContextFilesQuery: () => ({ currentData: api.contextFiles }),
  useRemoveDocumentContextFileMutation: () => [api.remove],
}))

vi.mock('../documents/api/documentCoreApi', () => ({
  useGetDocumentsQuery: () => ({ data: api.documents }),
  useUploadDocumentMutation: () => [api.upload, { isLoading: false }],
}))

const contextFile = {
  id: 'context-1',
  context_document_id: 'source-1',
  filename: 'Source.pdf',
  file_type: 'pdf',
  created_at: '2026-09-01T12:00:00.000Z',
}

describe('useDocumentFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.contextFiles = [contextFile]
    api.documents = []
    api.add.mockReturnValue({ unwrap: () => Promise.resolve(contextFile) })
    api.remove.mockReturnValue({ unwrap: () => Promise.resolve({ ok: true }) })
    api.upload.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: 'uploaded-1',
          filename: 'Uploaded.pdf',
          file_type: 'pdf',
        }),
    })
  })

  it('replaces populated context with an empty server response', async () => {
    const { result, rerender } = renderHook(() => useDocumentFiles({ documentId: 'document-1' }))
    expect(result.current.attachedFiles.map((file) => file.id)).toEqual(['source-1'])

    api.contextFiles = []
    rerender()

    expect(result.current.attachedFiles).toEqual([])
  })

  it('preserves server-backed files when attach or remove rejects', async () => {
    api.add.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Attachment was rejected.' } }),
    })
    api.remove.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Removal was rejected.' } }),
    })
    const { result } = renderHook(() => useDocumentFiles({ documentId: 'document-1' }))

    let attachError: unknown
    await act(async () => {
      try {
        await result.current.attachExisting({
          id: 'source-2',
          name: 'Second.pdf',
          type: 'pdf',
          date: 'Today',
        })
      } catch (error) {
        attachError = error
      }
    })
    expect(attachError).toBeDefined()
    expect(result.current.attachedFiles.map((file) => file.id)).toEqual(['source-1'])
    expect(result.current.error).toBe('Attachment was rejected.')

    await act(async () => result.current.remove('source-1'))
    expect(result.current.attachedFiles.map((file) => file.id)).toEqual(['source-1'])
    expect(result.current.error).toBe('Removal was rejected.')
  })

  it('does not clear the selected upload when upload or attachment fails', async () => {
    const file = new File(['terms'], 'Terms.pdf', { type: 'application/pdf' })
    const target = { files: [file], value: '/fake/Terms.pdf' }
    api.upload.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Upload failed.' } }),
    })
    const { result } = renderHook(() => useDocumentFiles({ documentId: 'document-1' }))

    await act(async () => {
      await result.current.upload({ target } as never)
    })
    expect(target.value).toBe('/fake/Terms.pdf')
    expect(result.current.error).toBe('Upload failed.')

    api.upload.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: 'uploaded-1',
          filename: 'Terms.pdf',
          file_type: 'pdf',
        }),
    })
    api.add.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Attachment failed.' } }),
    })
    await act(async () => {
      await result.current.upload({ target } as never)
    })
    expect(target.value).toBe('/fake/Terms.pdf')
    expect(result.current.error).toBe('Attachment failed.')
  })

  it('clears the selected upload only after upload and attachment succeed', async () => {
    const file = new File(['terms'], 'Terms.pdf', { type: 'application/pdf' })
    const target = { files: [file], value: '/fake/Terms.pdf' }
    const { result } = renderHook(() => useDocumentFiles({ documentId: 'document-1' }))

    await act(async () => {
      await result.current.upload({ target } as never)
    })

    expect(api.upload).toHaveBeenCalledOnce()
    expect(api.add).toHaveBeenCalledWith({
      documentId: 'document-1',
      contextDocumentId: 'uploaded-1',
    })
    expect(target.value).toBe('')
    await waitFor(() => expect(result.current.error).toBeNull())
  })
})
