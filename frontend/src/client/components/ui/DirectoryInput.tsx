import { forwardRef, useCallback, type ComponentPropsWithoutRef, type ForwardedRef } from 'react'

export type DirectoryInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'directory' | 'multiple' | 'type' | 'webkitdirectory'
>

function assignRef(ref: ForwardedRef<HTMLInputElement>, element: HTMLInputElement | null) {
  if (typeof ref === 'function') {
    ref(element)
  } else if (ref) {
    ref.current = element
  }
}

export const DirectoryInput = forwardRef<HTMLInputElement, DirectoryInputProps>(
  function DirectoryInput(props, forwardedRef) {
    const setInputRef = useCallback(
      (element: HTMLInputElement | null) => {
        if (element) {
          element.setAttribute('webkitdirectory', '')
          element.setAttribute('directory', '')
        }
        assignRef(forwardedRef, element)
      },
      [forwardedRef],
    )

    return <input {...props} ref={setInputRef} type="file" multiple />
  },
)
