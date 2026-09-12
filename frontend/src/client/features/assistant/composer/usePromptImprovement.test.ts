import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StreamAbortedError } from '../../../lib/sseTransport'
import { streamChat } from '../../../store/api/chatApi'
import { PROMPT_IMPROVEMENT_FAILURE_MESSAGE } from './ChatInputConfig'
import { usePromptImprovement } from './usePromptImprovement'

vi.mock('../../../store/api/chatApi', () => ({
  streamChat: vi.fn(),
}))

describe('usePromptImprovement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('combines streamed deltas and strips wrapping quotes', async () => {
    vi.mocked(streamChat).mockImplementation(async (request) => {
      request.onEvent({ type: 'text_delta', text: '"Clearer ' })
      request.onEvent({ type: 'content_delta', text: 'request"' })
      return { kind: 'success' }
    })
    const { result } = renderHook(() => usePromptImprovement())

    let outcome: unknown
    await act(async () => {
      outcome = await result.current.improvePrompt('unclear request')
    })

    expect(outcome).toEqual({ kind: 'improved', text: 'Clearer request' })
    expect(result.current.isImprovingPrompt).toBe(false)
    expect(streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        historyMode: 'discard',
        messages: [
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('unclear request'),
          }),
        ],
      }),
    )
  })

  it('returns a typed failure when streaming does not succeed', async () => {
    vi.mocked(streamChat).mockResolvedValue({
      kind: 'aborted',
      error: new StreamAbortedError(),
    })
    const { result } = renderHook(() => usePromptImprovement())

    let outcome: unknown
    await act(async () => {
      outcome = await result.current.improvePrompt('Keep this')
    })

    expect(outcome).toEqual({
      kind: 'failed',
      message: PROMPT_IMPROVEMENT_FAILURE_MESSAGE,
    })
  })

  it('returns a typed failure when the stream has no improved text', async () => {
    vi.mocked(streamChat).mockResolvedValue({ kind: 'success' })
    const { result } = renderHook(() => usePromptImprovement())

    let outcome: unknown
    await act(async () => {
      outcome = await result.current.improvePrompt('Keep this')
    })

    expect(outcome).toEqual({
      kind: 'failed',
      message: PROMPT_IMPROVEMENT_FAILURE_MESSAGE,
    })
  })
})
