import type { FocusEvent, KeyboardEvent } from 'react'

export type ReviewPopupDismissReason = 'escape' | 'tab'

function enabledPopupItems(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]',
    ),
  ).filter(
    (item) => item.getAttribute('aria-disabled') !== 'true' && !item.hasAttribute('disabled'),
  )
}

export function handleReviewPopupFocus(event: FocusEvent<HTMLElement>) {
  if (!(event.target instanceof HTMLElement)) return
  const items = enabledPopupItems(event.currentTarget)
  if (!items.includes(event.target)) return
  items.forEach((item) => {
    item.tabIndex = item === event.target ? 0 : -1
  })
}

export function handleReviewPopupKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onClose: (reason: ReviewPopupDismissReason) => void,
) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    onClose('escape')
    return
  }
  if (event.key === 'Tab') {
    onClose('tab')
    return
  }

  const items = enabledPopupItems(event.currentTarget)
  if (items.length === 0) return

  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  let nextIndex: number | null = null

  if (event.key === 'ArrowDown')
    nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length
  if (event.key === 'ArrowUp')
    nextIndex =
      currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = items.length - 1

  if (nextIndex !== null && items[nextIndex]) {
    event.preventDefault()
    items.forEach((item, index) => {
      item.tabIndex = index === nextIndex ? 0 : -1
    })
    items[nextIndex].focus()
  }
}
