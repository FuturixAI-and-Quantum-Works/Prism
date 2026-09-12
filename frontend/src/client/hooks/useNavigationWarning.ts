import { useEffect } from 'react'
import { useAppSelector } from '../store/hooks'
import { selectHasRunningProcesses } from '../store/slices/pendingProcessesSlice'

export function useNavigationWarning(): void {
  const hasRunningProcesses = useAppSelector(selectHasRunningProcesses)

  useEffect(() => {
    if (!hasRunningProcesses) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasRunningProcesses])
}
