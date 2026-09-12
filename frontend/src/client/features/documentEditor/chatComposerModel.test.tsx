import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getComposerStatusText, resolveComposerMessage, useChatComposer } from './chatComposerModel'

describe('chat composer model', () => {
  it('resolves the current draft before a fallback and trims both', () => {
    expect(resolveComposerMessage('  Current draft  ', 'Fallback')).toBe('Current draft')
    expect(resolveComposerMessage('   ', '  Fallback  ')).toBe('Fallback')
    expect(resolveComposerMessage('', '   ')).toBe('')
  })

  it('gives streaming announcements precedence over sending', () => {
    expect(getComposerStatusText(false, false)).toBe('')
    expect(getComposerStatusText(true, false)).toBe('Sending message')
    expect(getComposerStatusText(true, true)).toBe('Assistant is responding')
  })

  it('owns draft and send transitions', async () => {
    let releaseSend: () => void = () => undefined
    const send = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseSend = () => resolve()
        }),
    )
    const { result } = renderHook(() => useChatComposer({ isSending: false, messages: [], send }))

    act(() => {
      result.current.setInputText('  Review this agreement  ')
    })

    let submission: Promise<void>
    act(() => {
      submission = result.current.handleSendMessage()
    })

    expect(send).toHaveBeenCalledWith('Review this agreement')
    expect(result.current.inputText).toBe('')

    await act(async () => {
      releaseSend()
      await submission
    })
  })

  it('sends on Enter but leaves Shift+Enter to the textarea', () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useChatComposer({ isSending: false, messages: [], send }))
    const preventDefault = vi.fn()

    act(() => result.current.setInputText('Draft'))
    act(() =>
      result.current.handleKeyDown({
        key: 'Enter',
        shiftKey: true,
        preventDefault,
      }),
    )
    expect(preventDefault).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()

    act(() =>
      result.current.handleKeyDown({
        key: 'Enter',
        shiftKey: false,
        preventDefault,
      }),
    )
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith('Draft')
  })

  it('does not clear or submit while a send is in progress', () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useChatComposer({ isSending: true, messages: [], send }))

    act(() => result.current.setInputText('Keep this draft'))
    act(() => {
      void result.current.handleSendMessage()
    })

    expect(send).not.toHaveBeenCalled()
    expect(result.current.inputText).toBe('Keep this draft')
  })
})
