import { useEffect, useRef, useState } from 'react'

export type TopbarPopover = 'account' | 'notifications'

export function useTopbarState() {
  const [activePopover, setActivePopover] = useState<TopbarPopover | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const accountContainerRef = useRef<HTMLDivElement>(null)
  const notificationsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activePopover) return

    const handleClickOutside = (event: MouseEvent) => {
      const activeContainer =
        activePopover === 'account'
          ? accountContainerRef.current
          : notificationsContainerRef.current
      if (activeContainer && !activeContainer.contains(event.target as Node)) {
        setActivePopover(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activePopover])

  const togglePopover = (popover: TopbarPopover) => {
    setActivePopover((current) => (current === popover ? null : popover))
  }

  return {
    accountContainerRef,
    activePopover,
    closePopover: () => setActivePopover(null),
    closeSettings: () => setSettingsOpen(false),
    notificationsContainerRef,
    openSettings: () => {
      setActivePopover(null)
      setSettingsOpen(true)
    },
    settingsOpen,
    togglePopover,
  }
}
