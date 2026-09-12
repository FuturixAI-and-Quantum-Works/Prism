import { useRef, useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import { useMenuFocus } from './useMenuFocus'

function markInert(element: HTMLDivElement | null) {
  if (element) element.setAttribute('inert', '')
}

function MenuHarness({ onActivate = vi.fn() }: { onActivate?: () => void }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useMenuFocus({
    open,
    onClose: () => setOpen(false),
    onOpen: () => setOpen(true),
    triggerRef,
  })

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Actions
      </button>
      {open && (
        <div ref={menuRef} role="menu" aria-label="Actions">
          <div hidden>
            <button type="button" role="menuitem" data-testid="hidden-item">
              Hidden
            </button>
          </div>
          <div aria-hidden="true">
            <button type="button" role="menuitem" data-testid="aria-hidden-item">
              Aria hidden
            </button>
          </div>
          <div ref={markInert}>
            <button type="button" role="menuitem" data-testid="inert-item">
              Inert
            </button>
          </div>
          <div style={{ display: 'none' }}>
            <button type="button" role="menuitem" data-testid="display-hidden-item">
              Display hidden
            </button>
          </div>
          <button type="button" role="menuitem" disabled data-testid="disabled-item">
            Disabled
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onActivate()
              setOpen(false)
            }}
          >
            First
          </button>
          <button type="button" role="menuitem">
            Second
          </button>
          <button type="button" role="menuitem">
            Third
          </button>
        </div>
      )}
      <button type="button">After</button>
    </>
  )
}

function SelectionHarness() {
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const [choice, setChoice] = useState('first')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useMenuFocus({
    open,
    onClose: () => setOpen(false),
    triggerRef,
  })

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen((current) => !current)}>
        Choose
      </button>
      {open && (
        <div ref={menuRef} role="menu" aria-label="Choices">
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={checked}
            onClick={() => setChecked((current) => !current)}
          >
            Include archived
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={choice === 'second'}
            onClick={() => {
              setChoice('second')
              setOpen(false)
            }}
          >
            Second choice
          </button>
        </div>
      )}
    </>
  )
}

describe('useMenuFocus', () => {
  it('moves focus, maintains one roving tab stop, and supports menu navigation', async () => {
    const user = userEvent.setup()
    const { container } = render(<MenuHarness />)

    await user.tab()
    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    const menu = screen.getByRole('menu', { name: 'Actions' })
    const first = within(menu).getByRole('menuitem', { name: 'First' })
    const second = within(menu).getByRole('menuitem', { name: 'Second' })
    const third = within(menu).getByRole('menuitem', { name: 'Third' })

    expect(first).toHaveFocus()
    expect([first, second, third].filter((item) => item.tabIndex === 0)).toEqual([first])
    expect(screen.getByTestId('hidden-item')).toHaveAttribute('tabindex', '-1')
    expect(screen.getByTestId('aria-hidden-item')).toHaveAttribute('tabindex', '-1')
    expect(screen.getByTestId('inert-item')).toHaveAttribute('tabindex', '-1')
    expect(screen.getByTestId('display-hidden-item')).toHaveAttribute('tabindex', '-1')
    expect(screen.getByTestId('disabled-item')).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(first).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(third).toHaveFocus()
    await user.keyboard('{Home}')
    expect(first).toHaveFocus()
    await user.keyboard('{End}')
    expect(third).toHaveFocus()
    expect([first, second, third].filter((item) => item.tabIndex === 0)).toEqual([third])
    expect(await axe(container)).toHaveNoViolations()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('leaves Enter and Space activation to native buttons', async () => {
    const user = userEvent.setup()
    const onActivate = vi.fn()
    render(<MenuHarness onActivate={onActivate} />)

    const trigger = screen.getByRole('button', { name: 'Actions' })
    await user.tab()
    await user.keyboard('{Enter}')
    const first = screen.getByRole('menuitem', { name: 'First' })
    expect(first).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onActivate).toHaveBeenCalledOnce()
    expect(trigger).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onActivate).toHaveBeenCalledTimes(2)
    expect(trigger).toHaveFocus()
  })

  it('keeps checkbox menus open and closes radio menus after selection', async () => {
    const user = userEvent.setup()
    render(<SelectionHarness />)

    const trigger = screen.getByRole('button', { name: 'Choose' })
    await user.tab()
    await user.keyboard('{Enter}')

    const checkbox = screen.getByRole('menuitemcheckbox', { name: 'Include archived' })
    expect(checkbox).toHaveFocus()
    await user.keyboard(' ')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menu', { name: 'Choices' })).toBeInTheDocument()
    expect(checkbox).toHaveFocus()

    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.queryByRole('menu', { name: 'Choices' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it.each([
    { direction: 'forward', shift: false, destination: 'After' },
    { direction: 'backward', shift: true, destination: 'Actions' },
  ])(
    'closes on $direction Tab without overriding browser focus movement',
    async ({ shift, destination }) => {
      const user = userEvent.setup()
      render(<MenuHarness />)

      const trigger = screen.getByRole('button', { name: 'Actions' })
      await user.click(trigger)
      expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus()

      await user.tab({ shift })

      expect(screen.queryByRole('menu', { name: 'Actions' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: destination })).toHaveFocus()
    },
  )
})
