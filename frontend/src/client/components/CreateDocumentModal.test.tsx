import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CreateDocumentModal from './CreateDocumentModal'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('CreateDocumentModal', () => {
  it('does not report success when creation returns no document id', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    const onCreateDocument = vi.fn().mockResolvedValue(undefined)

    render(
      <CreateDocumentModal
        open
        onClose={vi.fn()}
        onContinue={onContinue}
        onCreateDocument={onCreateDocument}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create Document' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to create document')
    expect(screen.queryByText('Document created successfully')).not.toBeInTheDocument()
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('ignores a stale completion after the modal closes', async () => {
    const creation = deferred<{ id: string }>()

    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open create document
          </button>
          <CreateDocumentModal
            open={open}
            onClose={() => setOpen(false)}
            onCreateDocument={() => creation.promise}
          />
        </>
      )
    }

    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Create Document' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await act(async () => {
      creation.resolve({ id: 'document-stale' })
      await creation.promise
    })

    await user.click(screen.getByRole('button', { name: 'Open create document' }))
    expect(screen.getByRole('button', { name: 'Create Document' })).toBeInTheDocument()
    expect(screen.queryByText('Document created successfully')).not.toBeInTheDocument()
  })

  it('keeps the form open when creation rejects', async () => {
    const user = userEvent.setup()
    const onCreateDocument = vi.fn().mockRejectedValue(new Error('Storage unavailable'))

    render(<CreateDocumentModal open onClose={vi.fn()} onCreateDocument={onCreateDocument} />)

    await user.click(screen.getByRole('button', { name: 'Create Document' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable')
    expect(screen.getByRole('button', { name: 'Create Document' })).toBeEnabled()
  })
})
