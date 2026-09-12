import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DirectoryInput } from './DirectoryInput'

describe('DirectoryInput', () => {
  it('owns directory attributes, forwards its ref, and emits file changes', async () => {
    const user = userEvent.setup()
    const inputRef = createRef<HTMLInputElement>()
    const onChange = vi.fn()

    render(<DirectoryInput ref={inputRef} aria-label="Folder" onChange={onChange} />)

    const input = screen.getByLabelText<HTMLInputElement>('Folder')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('multiple')
    expect(input).toHaveAttribute('webkitdirectory')
    expect(input).toHaveAttribute('directory')
    expect(inputRef.current).toBe(input)

    const file = new File(['contract'], 'matter/contract.txt', { type: 'text/plain' })
    await user.upload(input, file)

    expect(onChange).toHaveBeenCalledOnce()
    expect(input.files).toHaveLength(1)
    expect(input.files?.[0]).toBe(file)
  })
})
