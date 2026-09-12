import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const menuItemSelector = [
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
].join(',')

interface UseMenuFocusOptions {
  open: boolean
  onClose: () => void
  onOpen?: () => void
  triggerRef: RefObject<HTMLElement | null>
}

function isUnavailable(element: HTMLElement) {
  if (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true') return true

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

function getMenuItems(menu: HTMLElement) {
  return Array.from(menu.querySelectorAll<HTMLElement>(menuItemSelector)).filter(
    (item) => item.closest('[role="menu"]') === menu,
  )
}

function getEnabledItems(menu: HTMLElement) {
  return getMenuItems(menu).filter((item) => !isUnavailable(item))
}

export function useMenuFocus<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
  onOpen,
  triggerRef,
}: UseMenuFocusOptions): RefObject<T | null> {
  const menuRef = useRef<T>(null)
  const wasOpenRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const onOpenRef = useRef(onOpen)
  onCloseRef.current = onClose
  onOpenRef.current = onOpen

  useLayoutEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }

    const menu = menuRef.current
    if (!menu) return

    const items = getEnabledItems(menu)
    const focusedItem = items.find((item) => item === document.activeElement)
    const activeItem = focusedItem ?? items[0]

    getMenuItems(menu).forEach((item) => {
      item.tabIndex = -1
    })

    if (activeItem) {
      activeItem.tabIndex = 0
      if (!wasOpenRef.current) activeItem.focus()
    }

    wasOpenRef.current = true
  })

  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    if (!menu) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setTimeout(() => onCloseRef.current(), 0)
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        triggerRef.current?.focus()
        return
      }

      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

      const items = getEnabledItems(menu)
      if (items.length === 0) return

      event.preventDefault()
      event.stopPropagation()

      const currentIndex = items.findIndex((item) => item === document.activeElement)
      let nextIndex = 0

      if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length
      } else if (event.key === 'ArrowUp') {
        nextIndex =
          currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
      } else if (event.key === 'End') {
        nextIndex = items.length - 1
      }

      const nextItem = items[nextIndex]
      items.forEach((item) => {
        item.tabIndex = item === nextItem ? 0 : -1
      })
      nextItem.focus()
    }

    const handleSelection = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const item = event.target.closest<HTMLElement>(menuItemSelector)
      if (
        !item ||
        item.closest('[role="menu"]') !== menu ||
        item.getAttribute('role') === 'menuitemcheckbox' ||
        isUnavailable(item)
      ) {
        return
      }
      triggerRef.current?.focus()
    }

    menu.addEventListener('keydown', handleKeyDown)
    menu.addEventListener('click', handleSelection, true)
    return () => {
      menu.removeEventListener('keydown', handleKeyDown)
      menu.removeEventListener('click', handleSelection, true)
    }
  })

  useEffect(() => {
    const trigger = triggerRef.current
    if (!trigger || open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      if (!onOpenRef.current) return

      event.preventDefault()
      event.stopPropagation()
      onOpenRef.current()
    }

    trigger.addEventListener('keydown', handleKeyDown)
    return () => trigger.removeEventListener('keydown', handleKeyDown)
  })

  return menuRef
}
