import { useRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import { AccessibleDialog } from './AccessibleDialog'
import { Tab, TabList, TabPanel, Tabs } from './Tabs'

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <section data-testid="dialog-background" aria-hidden="false">
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
      </section>
      <aside
        data-testid="pre-isolated-background"
        aria-hidden="true"
        ref={(element) => element?.setAttribute('inert', '')}
      />
      <AccessibleDialog open={open} onClose={() => setOpen(false)} label="Example dialog">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </AccessibleDialog>
    </>
  )
}

function HiddenCandidatesDialogHarness() {
  const [open, setOpen] = useState(false)
  const outsideRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button ref={outsideRef} type="button" onClick={() => setOpen(true)}>
        Open filtered dialog
      </button>
      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        label="Filtered dialog"
        initialFocusRef={outsideRef}
      >
        <div hidden>
          <button type="button">Hidden action</button>
        </div>
        <div aria-hidden="true">
          <button type="button">Aria-hidden action</button>
        </div>
        <div ref={(element) => element?.setAttribute('inert', '')}>
          <button type="button">Inert action</button>
        </div>
        <div style={{ display: 'none' }}>
          <button type="button">Display-hidden action</button>
        </div>
        <div style={{ visibility: 'hidden' }}>
          <button type="button">Visibility-hidden action</button>
        </div>
        <button type="button" disabled>
          Disabled action
        </button>
        <button type="button">Available action</button>
      </AccessibleDialog>
    </>
  )
}

function NestedDialogHarness() {
  const [outerOpen, setOuterOpen] = useState(false)
  const [innerOpen, setInnerOpen] = useState(false)

  return (
    <>
      <section data-testid="nested-background">
        <button type="button" onClick={() => setOuterOpen(true)}>
          Open outer dialog
        </button>
      </section>
      <AccessibleDialog open={outerOpen} onClose={() => setOuterOpen(false)} label="Outer dialog">
        <button type="button" onClick={() => setInnerOpen(true)}>
          Open inner dialog
        </button>
        <button type="button">Outer action</button>
        <AccessibleDialog open={innerOpen} onClose={() => setInnerOpen(false)} label="Inner dialog">
          <button type="button">Inner action</button>
        </AccessibleDialog>
      </AccessibleDialog>
    </>
  )
}

function TabsHarness() {
  const [value, setValue] = useState('details')
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabList aria-label="Document sections">
        <Tab value="details">Details</Tab>
        <Tab value="activity">Activity</Tab>
      </TabList>
      <TabPanel value="details">Document details</TabPanel>
      <TabPanel value="activity">Document activity</TabPanel>
    </Tabs>
  )
}

describe('accessible UI primitives', () => {
  it('traps dialog focus, closes with Escape, and restores focus', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })

    await user.click(trigger)
    const first = screen.getByRole('button', { name: 'First action' })
    const last = screen.getByRole('button', { name: 'Last action' })
    const background = screen.getByTestId('dialog-background')
    expect(first).toHaveFocus()
    expect(background).toHaveAttribute('inert')
    expect(background).toHaveAttribute('aria-hidden', 'true')
    expect(await axe(screen.getByRole('dialog'))).toHaveNoViolations()

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(last).toHaveFocus()
    await user.tab()
    expect(first).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(background).not.toHaveAttribute('inert')
    expect(background).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByTestId('pre-isolated-background')).toHaveAttribute('inert')
    expect(screen.getByTestId('pre-isolated-background')).toHaveAttribute('aria-hidden', 'true')
  })

  it('ignores invalid initial focus and unavailable descendants', async () => {
    const user = userEvent.setup()
    render(<HiddenCandidatesDialogHarness />)

    await user.click(screen.getByRole('button', { name: 'Open filtered dialog' }))

    expect(screen.getByRole('button', { name: 'Available action' })).toHaveFocus()
  })

  it('keeps the background isolated until the last nested dialog closes', async () => {
    const user = userEvent.setup()
    render(<NestedDialogHarness />)

    const trigger = screen.getByRole('button', { name: 'Open outer dialog' })
    await user.click(trigger)
    const innerTrigger = screen.getByRole('button', { name: 'Open inner dialog' })
    expect(innerTrigger).toHaveFocus()

    await user.click(innerTrigger)
    expect(screen.getByRole('button', { name: 'Inner action' })).toHaveFocus()
    expect(screen.getByTestId('nested-background')).toHaveAttribute('inert')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Inner dialog' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Outer dialog' })).toBeInTheDocument()
    expect(innerTrigger).toHaveFocus()
    expect(screen.getByTestId('nested-background')).toHaveAttribute('inert')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(screen.getByTestId('nested-background')).not.toHaveAttribute('inert')
  })

  it('supports arrow-key tab selection', async () => {
    const user = userEvent.setup()
    const { container } = render(<TabsHarness />)
    const details = screen.getByRole('tab', { name: 'Details' })

    await user.tab()
    expect(details).toHaveFocus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Document activity')
    expect(await axe(container)).toHaveNoViolations()
  })
})
