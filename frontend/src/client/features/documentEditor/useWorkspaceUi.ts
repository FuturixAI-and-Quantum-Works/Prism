import { useEffect, useRef, useState } from 'react'
import { placeholderTexts } from './workspaceOptions'

export function useAnimatedPlaceholder() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setPlaceholderIndex((previous) => (previous + 1) % placeholderTexts.length)
        setIsAnimating(false)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return { isAnimating, placeholderIndex }
}

interface UseWorkspaceDropdownsOptions {
  closeDialogs: () => void
}

export function useWorkspaceDropdowns({ closeDialogs }: UseWorkspaceDropdownsOptions) {
  const [moreOptionsDropdownOpen, setMoreOptionsDropdownOpen] = useState(false)
  const moreOptionsDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        moreOptionsDropdownOpen &&
        moreOptionsDropdownRef.current &&
        !moreOptionsDropdownRef.current.contains(target)
      ) {
        setMoreOptionsDropdownOpen(false)
      }
    }

    if (moreOptionsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moreOptionsDropdownOpen])

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMoreOptionsDropdownOpen(false)
      closeDialogs()
    }
    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [closeDialogs])

  return {
    moreOptionsDropdownOpen,
    moreOptionsDropdownRef,
    setMoreOptionsDropdownOpen,
  }
}

export function useRightPanelResize() {
  const [rightPanelWidth, setRightPanelWidth] = useState(580)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - event.clientX
      setRightPanelWidth(Math.max(320, Math.min(800, newWidth)))
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  return { isResizing, resizeRef, rightPanelWidth, setIsResizing }
}
