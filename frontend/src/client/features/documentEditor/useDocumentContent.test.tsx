import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentContent } from './useDocumentContent'

const api = vi.hoisted(() => ({
  html: { html: '<p>Loaded</p>' } as { html: string } | undefined,
  staleHtml: undefined as { html: string } | undefined,
  refetchHtml: vi.fn(),
  save: vi.fn(),
  loadUrl: vi.fn(),
}))

vi.mock('../documents/api/documentContentApi', () => ({
  useGetDocumentHtmlQuery: () => ({
    currentData: api.html,
    data: api.staleHtml,
    refetch: api.refetchHtml,
    isError: false,
  }),
  useLazyGetDocumentUrlQuery: () => [api.loadUrl],
}))

vi.mock('../documents/api/documentVersionsApi', () => ({
  useSaveDocumentVersionFromHtmlMutation: () => [api.save, { isLoading: false }],
}))

describe('useDocumentContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.html = { html: '<p>Loaded</p>' }
    api.staleHtml = undefined
    api.refetchHtml.mockResolvedValue(undefined)
    api.save.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ version_number: 3 }),
    })
    api.loadUrl.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ url: 'https://example.com/document.pdf' }),
    })
  })

  it('loads HTML and saves the edited content as a version', async () => {
    const { result } = renderHook(() => useDocumentContent('document-1'))
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))

    act(() => result.current.setContent('<p>Edited</p>'))
    let succeeded = false
    await act(async () => {
      succeeded = await result.current.saveVersion()
    })

    expect(succeeded).toBe(true)
    expect(api.save).toHaveBeenCalledWith({
      documentId: 'document-1',
      html: '<p>Edited</p>',
      displayName: expect.stringMatching(/^Manual save /),
    })
    expect(result.current.saveMessage).toBe('Saved version 3.')
    expect(api.refetchHtml).toHaveBeenCalledOnce()
  })

  it('reports a failed manual save without confirming success', async () => {
    api.save.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Save rejected.' } }),
    })
    const { result } = renderHook(() => useDocumentContent('document-1'))
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))
    act(() => result.current.setContent('<p>Edited</p>'))

    let succeeded = true
    await act(async () => {
      succeeded = await result.current.saveVersion()
    })

    expect(succeeded).toBe(false)
    expect(result.current.saveMessage).toBe('Could not save a version. Please try again.')
  })

  it('autosaves only changed content before placeholder application', async () => {
    const afterSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useDocumentContent('document-1'))
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))

    await act(async () => result.current.autosave(afterSave))
    expect(api.save).not.toHaveBeenCalled()

    act(() => result.current.setContent('<p>Changed</p>'))
    await act(async () => result.current.autosave(afterSave))

    expect(api.save).toHaveBeenCalledWith({
      documentId: 'document-1',
      html: '<p>Changed</p>',
      displayName: 'Autosave before placeholder fill',
    })
    expect(afterSave).toHaveBeenCalledOnce()
  })

  it('clears content and loaded identity immediately when the document changes', async () => {
    const { result, rerender } = renderHook(({ documentId }) => useDocumentContent(documentId), {
      initialProps: { documentId: 'document-1' },
    })
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))

    act(() => result.current.setContent('<p>Unsaved document one</p>'))
    api.staleHtml = api.html
    api.html = undefined
    rerender({ documentId: 'document-2' })

    expect(result.current.content).toBe('')
    expect(result.current.loadedDocumentId).toBeNull()
    await act(async () => result.current.saveVersion())
    expect(api.save).not.toHaveBeenCalled()
  })

  it('accepts empty server HTML without retaining prior document content', async () => {
    const { result, rerender } = renderHook(({ documentId }) => useDocumentContent(documentId), {
      initialProps: { documentId: 'document-1' },
    })
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))

    api.html = { html: '' }
    rerender({ documentId: 'document-2' })

    await waitFor(() => expect(result.current.loadedDocumentId).toBe('document-2'))
    expect(result.current.content).toBe('')
    expect(result.current.lastLoadedHtml).toBe('')
  })

  it('ignores stale save and preview completions after switching documents', async () => {
    let resolveSave!: (value: { version_number: number }) => void
    let resolvePreview!: (value: { url: string }) => void
    api.save.mockReturnValue({
      unwrap: () =>
        new Promise<{ version_number: number }>((resolve) => {
          resolveSave = resolve
        }),
    })
    api.loadUrl.mockReturnValue({
      unwrap: () =>
        new Promise<{ url: string }>((resolve) => {
          resolvePreview = resolve
        }),
    })
    const { result, rerender } = renderHook(({ documentId }) => useDocumentContent(documentId), {
      initialProps: { documentId: 'document-1' },
    })
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))
    act(() => result.current.setContent('<p>Saved document one</p>'))

    let savePromise!: Promise<boolean>
    let previewPromise!: Promise<void>
    act(() => {
      savePromise = result.current.saveVersion()
      previewPromise = result.current.loadPreviewUrl()
    })

    api.html = { html: '<p>Document two</p>' }
    rerender({ documentId: 'document-2' })
    resolveSave({ version_number: 4 })
    resolvePreview({ url: 'https://example.com/document-one.pdf' })
    await act(async () => {
      await Promise.all([savePromise, previewPromise])
    })

    expect(result.current.content).toBe('<p>Document two</p>')
    expect(result.current.saveMessage).toBe('')
    expect(result.current.previewUrl).toBeNull()
    expect(api.refetchHtml).not.toHaveBeenCalled()
  })

  it('ignores a save from an earlier visit when returning to the same document', async () => {
    let resolveSave!: (value: { version_number: number }) => void
    api.save.mockReturnValue({
      unwrap: () =>
        new Promise<{ version_number: number }>((resolve) => {
          resolveSave = resolve
        }),
    })
    const { result, rerender } = renderHook(({ documentId }) => useDocumentContent(documentId), {
      initialProps: { documentId: 'document-1' },
    })
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))
    act(() => result.current.setContent('<p>First visit</p>'))

    let savePromise!: Promise<boolean>
    act(() => {
      savePromise = result.current.saveVersion()
    })
    api.html = { html: '<p>Document two</p>' }
    rerender({ documentId: 'document-2' })
    api.html = { html: '<p>Fresh document one</p>' }
    rerender({ documentId: 'document-1' })
    await waitFor(() => expect(result.current.content).toBe('<p>Fresh document one</p>'))
    act(() => result.current.setContent('<p>Second visit edit</p>'))

    resolveSave({ version_number: 8 })
    await act(async () => savePromise)

    expect(result.current.content).toBe('<p>Second visit edit</p>')
    expect(result.current.saveMessage).toBe('')
    expect(api.refetchHtml).not.toHaveBeenCalled()
  })

  it('ignores an autosave from an earlier visit to the same document', async () => {
    let resolveSave!: (value: { version_number: number }) => void
    api.save.mockReturnValue({
      unwrap: () =>
        new Promise<{ version_number: number }>((resolve) => {
          resolveSave = resolve
        }),
    })
    const afterSave = vi.fn().mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ documentId }) => useDocumentContent(documentId), {
      initialProps: { documentId: 'document-1' },
    })
    await waitFor(() => expect(result.current.content).toBe('<p>Loaded</p>'))
    act(() => result.current.setContent('<p>First visit</p>'))

    let savePromise!: Promise<void>
    act(() => {
      savePromise = result.current.autosave(afterSave)
    })
    api.html = { html: '<p>Document two</p>' }
    rerender({ documentId: 'document-2' })
    api.html = { html: '<p>Fresh document one</p>' }
    rerender({ documentId: 'document-1' })
    await waitFor(() => expect(result.current.content).toBe('<p>Fresh document one</p>'))
    act(() => result.current.setContent('<p>Second visit edit</p>'))

    resolveSave({ version_number: 8 })
    await act(async () => savePromise)

    expect(result.current.content).toBe('<p>Second visit edit</p>')
    expect(result.current.lastLoadedHtml).toBe('<p>Fresh document one</p>')
    expect(afterSave).not.toHaveBeenCalled()
  })
})
