import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../../lib/apiTransport'
import { useDocumentExport } from './useDocumentExport'

vi.mock('../../lib/apiTransport', () => ({
  apiFetch: vi.fn(),
  apiUrl: (path: string) => path,
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('useDocumentExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:document'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it.each(['pdf', 'docx'] as const)('downloads a confirmed %s export', async (format) => {
    mockedApiFetch.mockResolvedValue(new Response(new Blob(['document'])))
    const { result } = renderHook(() =>
      useDocumentExport({
        documentId: 'document-1',
        documentName: 'Agreement',
        html: '<p>Terms</p>',
      }),
    )

    let succeeded = false
    await act(async () => {
      succeeded = await result.current[format === 'pdf' ? 'exportPdf' : 'exportDocx']()
    })

    expect(succeeded).toBe(true)
    expect(result.current.error).toBeNull()
    expect(mockedApiFetch).toHaveBeenCalledWith('/documents/document-1/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '<p>Terms</p>', format }),
    })
  })

  it('returns failure and exposes the server message without downloading', async () => {
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Export permission was denied.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const { result } = renderHook(() =>
      useDocumentExport({
        documentId: 'document-1',
        documentName: 'Agreement',
        html: '<p>Terms</p>',
      }),
    )

    let succeeded = true
    await act(async () => {
      succeeded = await result.current.exportPdf()
    })

    expect(succeeded).toBe(false)
    expect(result.current.error).toBe('Export permission was denied.')
    expect(click).not.toHaveBeenCalled()
  })

  it('reports network failures and keeps the operation retryable', async () => {
    mockedApiFetch
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(new Response(new Blob(['document'])))
    const { result } = renderHook(() =>
      useDocumentExport({
        documentId: 'document-1',
        documentName: 'Agreement',
        html: '<p>Terms</p>',
      }),
    )

    await act(async () => {
      expect(await result.current.exportDocx()).toBe(false)
    })
    expect(result.current.error).toBe('Network unavailable')

    await act(async () => {
      expect(await result.current.exportDocx()).toBe(true)
    })
    expect(result.current.error).toBeNull()
  })

  it('does not associate an old export failure with a newly selected document', async () => {
    let rejectExport!: (reason: unknown) => void
    mockedApiFetch.mockReturnValue(
      new Promise<Response>((_, reject) => {
        rejectExport = reject
      }),
    )
    const { result, rerender } = renderHook(
      ({ documentId }) =>
        useDocumentExport({
          documentId,
          documentName: 'Agreement',
          html: '<p>Terms</p>',
        }),
      { initialProps: { documentId: 'document-1' } },
    )

    let exportPromise!: Promise<boolean>
    act(() => {
      exportPromise = result.current.exportPdf()
    })
    rerender({ documentId: 'document-2' })
    rejectExport(new Error('Old document export failed.'))
    await act(async () => exportPromise)

    expect(result.current.error).toBeNull()
  })
})
