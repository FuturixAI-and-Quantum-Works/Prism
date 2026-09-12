import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentComments } from './useDocumentComments'

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('../documents/api/documentGovernanceApi', () => ({
  useGetDocumentCommentsQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: api.refetch,
  }),
  useCreateDocumentCommentMutation: () => [api.create, { isLoading: false }],
  useUpdateDocumentCommentMutation: () => [api.update],
}))

describe('useDocumentComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.create.mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) })
    api.update.mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) })
  })

  it('creates comments against the current version and clears the composer', async () => {
    const { result } = renderHook(() =>
      useDocumentComments({
        documentId: 'document-1',
        currentVersionId: 'version-2',
        canComment: true,
      }),
    )

    act(() => result.current.setText('Review this clause'))
    await act(async () => result.current.add())

    expect(api.create).toHaveBeenCalledWith({
      documentId: 'document-1',
      body: 'Review this clause',
      version_id: 'version-2',
      anchor_text: null,
    })
    expect(result.current.text).toBe('')
  })

  it('blocks comment creation when the role lacks permission', async () => {
    const { result } = renderHook(() =>
      useDocumentComments({
        documentId: 'document-1',
        currentVersionId: null,
        canComment: false,
      }),
    )

    act(() => result.current.setText('Disallowed'))
    await act(async () => result.current.add())

    expect(api.create).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Your current document role cannot add comments.')
  })
})
