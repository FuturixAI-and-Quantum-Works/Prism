import {
  createContext,
  useContext,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

interface TabsContextValue {
  baseId: string
  onValueChange: (value: string) => void
  value: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const value = useContext(TabsContext)
  if (!value) throw new Error('Tab components must be rendered inside Tabs.')
  return value
}

export function Tabs({
  children,
  onValueChange,
  value,
}: {
  children: ReactNode
  onValueChange: (value: string) => void
  value: string
}) {
  const baseId = useId()
  return (
    <TabsContext.Provider value={{ baseId, onValueChange, value }}>{children}</TabsContext.Provider>
  )
}

export function TabList({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? [],
    )
    if (tabs.length === 0) return

    event.preventDefault()
    const currentIndex = Math.max(
      0,
      tabs.findIndex((tab) => tab === document.activeElement),
    )
    let nextIndex = currentIndex
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    tabs[nextIndex].focus()
    tabs[nextIndex].click()
  }

  return (
    <div {...props} ref={listRef} role="tablist" onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}

export function Tab({
  children,
  controls,
  value,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  children: ReactNode
  controls?: string
  value: string
}) {
  const context = useTabsContext()
  const selected = context.value === value
  return (
    <button
      {...props}
      id={`${context.baseId}-tab-${value}`}
      type="button"
      role="tab"
      aria-controls={controls ?? `${context.baseId}-panel-${value}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={(event) => {
        context.onValueChange(value)
        props.onClick?.(event)
      }}
    >
      {children}
    </button>
  )
}

export function TabPanel({
  children,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = useTabsContext()
  if (context.value !== value) return null
  return (
    <div
      {...props}
      id={`${context.baseId}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${context.baseId}-tab-${value}`}
      tabIndex={0}
    >
      {children}
    </div>
  )
}
