import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ type = 'button', ...props }, ref) {
    return <button {...props} ref={ref} type={type} />
  },
)

export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
    label: string
    children: ReactNode
  }
>(function IconButton({ children, label, title = label, type = 'button', ...props }, ref) {
  return (
    <button {...props} ref={ref} type={type} aria-label={label} title={title}>
      {children}
    </button>
  )
})
