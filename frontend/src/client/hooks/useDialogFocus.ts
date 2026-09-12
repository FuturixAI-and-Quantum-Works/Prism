import { useLayoutEffect, useRef, type RefObject } from 'react'

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',')

interface IsolationState {
  ariaHidden: string | null
  count: number
  inert: boolean
  inertAttribute: string | null
}

const dialogStack: object[] = []
const isolationStates = new WeakMap<HTMLElement, IsolationState>()

function isUnavailable(element: HTMLElement) {
  if (
    !element.isConnected ||
    element.matches(':disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  ) {
    return true
  }

  let current: HTMLElement | null = element
  while (current) {
    if (
      current.hidden ||
      current.getAttribute('aria-hidden') === 'true' ||
      current.hasAttribute('inert')
    ) {
      return true
    }

    const style = getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden') return true
    current = current.parentElement
  }

  return false
}

function acquireIsolation(element: HTMLElement) {
  const existing = isolationStates.get(element)
  if (existing) {
    existing.count += 1
    return
  }

  isolationStates.set(element, {
    ariaHidden: element.getAttribute('aria-hidden'),
    count: 1,
    inert: element.inert,
    inertAttribute: element.getAttribute('inert'),
  })
  element.inert = true
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}

function releaseIsolation(element: HTMLElement) {
  const state = isolationStates.get(element)
  if (!state) return

  state.count -= 1
  if (state.count > 0) return

  isolationStates.delete(element)
  element.inert = state.inert
  if (state.inertAttribute !== null) {
    element.setAttribute('inert', state.inertAttribute)
  } else {
    element.removeAttribute('inert')
  }
  if (state.ariaHidden !== null) {
    element.setAttribute('aria-hidden', state.ariaHidden)
  } else {
    element.removeAttribute('aria-hidden')
  }
}

function isolateOutsideDialog(dialog: HTMLElement) {
  const isolated: HTMLElement[] = []
  let pathElement = dialog
  let parent = pathElement.parentElement

  while (parent) {
    Array.from(parent.children).forEach((sibling) => {
      if (sibling !== pathElement && sibling instanceof HTMLElement) {
        acquireIsolation(sibling)
        isolated.push(sibling)
      }
    })

    if (parent === document.body) break
    pathElement = parent
    parent = parent.parentElement
  }

  return () => {
    isolated.reverse().forEach(releaseIsolation)
  }
}

export function useDialogFocus(
  open: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useLayoutEffect(() => {
    if (!open) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (!dialog) return

    const stackEntry = {}
    dialogStack.push(stackEntry)
    const releaseIsolation = isolateOutsideDialog(dialog)
    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.tabIndex >= 0 && !isUnavailable(element),
      )

    const requestedTarget = initialFocusRef?.current
    const target =
      requestedTarget &&
      requestedTarget.isConnected &&
      dialog.contains(requestedTarget) &&
      !isUnavailable(requestedTarget)
        ? requestedTarget
        : (focusable()[0] ?? dialog)
    target.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== stackEntry) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const activeElement = document.activeElement
      if (
        event.shiftKey &&
        (activeElement === first || activeElement === dialog || !dialog.contains(activeElement))
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const stackIndex = dialogStack.lastIndexOf(stackEntry)
      if (stackIndex >= 0) dialogStack.splice(stackIndex, 1)
      releaseIsolation()
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [initialFocusRef, open])

  return dialogRef
}
