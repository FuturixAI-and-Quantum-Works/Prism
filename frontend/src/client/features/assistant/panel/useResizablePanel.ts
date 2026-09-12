import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react'

export function useResizablePanel({
  panelWidth,
  minWidth,
  maxWidth,
  onWidthChange,
}: {
  panelWidth: number
  minWidth: number
  maxWidth: number
  onWidthChange?: (width: number) => void
}) {
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault()
    setIsResizing(true)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onWidthChange) return

      let nextWidth: number
      switch (event.key) {
        case 'ArrowLeft':
          nextWidth = panelWidth + 16
          break
        case 'ArrowRight':
          nextWidth = panelWidth - 16
          break
        case 'Home':
          nextWidth = minWidth
          break
        case 'End':
          nextWidth = maxWidth
          break
        default:
          return
      }

      event.preventDefault()
      onWidthChange(Math.min(Math.max(nextWidth, minWidth), maxWidth))
    },
    [maxWidth, minWidth, onWidthChange, panelWidth],
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const newWidth = window.innerWidth - event.clientX
      onWidthChange?.(Math.min(Math.max(newWidth, minWidth), maxWidth))
    }
    const handleMouseUp = () => setIsResizing(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, maxWidth, minWidth, onWidthChange])

  return { isResizing, handleMouseDown, handleKeyDown }
}
