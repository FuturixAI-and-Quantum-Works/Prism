import { useEffect, type CSSProperties, type KeyboardEvent } from 'react'

export const complianceFontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

export const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export type PopupCloseReason = 'escape' | 'tab'

export function handlePopupKeyDown(
  event: KeyboardEvent<HTMLElement>,
  itemSelector: string,
  onClose: (reason: PopupCloseReason) => void,
) {
  if (event.key === 'Tab') {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(itemSelector),
    ).filter((item) => !item.disabled)
    const activeItem =
      event.target instanceof HTMLElement ? event.target.closest(itemSelector) : null
    items.forEach((item) => {
      item.tabIndex = item === activeItem ? 0 : -1
    })
    setTimeout(() => onClose('tab'), 0)
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    onClose('escape')
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(itemSelector),
  ).filter((item) => !item.disabled)
  if (items.length === 0) return

  event.preventDefault()
  const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length
  items[nextIndex].focus()
}

export function useCompliancePresentation() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .skeleton-shimmer {
        background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite ease-in-out;
        border-radius: 4px;
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }

      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #D9D9D9;
        border-radius: 4px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #BFBFBF;
      }

      .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #D9D9D9 transparent;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])
}
