import { type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

interface AccessibleDialogProps {
  children: ReactNode
  contentStyle?: CSSProperties
  initialFocusRef?: RefObject<HTMLElement | null>
  label?: string
  labelledBy?: string
  onClose: () => void
  open: boolean
  overlayStyle?: CSSProperties
}

const defaultOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

export function AccessibleDialog({
  children,
  contentStyle,
  initialFocusRef,
  label,
  labelledBy,
  onClose,
  open,
  overlayStyle,
}: AccessibleDialogProps) {
  const dialogRef = useDialogFocus(open, onClose, initialFocusRef)
  const labelledById = labelledBy?.trim() || undefined

  if (!open) return null

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div
      role="presentation"
      style={{ ...defaultOverlayStyle, ...overlayStyle }}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledById ? undefined : label}
        aria-labelledby={labelledById}
        tabIndex={-1}
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  )
}
