import { useRef, useState, type ChangeEvent } from 'react'
import type { AttachedFile } from '../composer/ChatInputConfig'

export function useCompareFlow(onDocumentsSelected: () => void) {
  const [isOpen, setIsOpen] = useState(false)
  const [documents, setDocuments] = useState<AttachedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const newFiles: AttachedFile[] = Array.from(files).map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        source: { kind: 'local-file', file },
      }))
      setDocuments((current) => [...current, ...newFiles])
      onDocumentsSelected()
    }
    event.target.value = ''
  }

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    documents,
    fileInputRef,
    handleFileChange,
  }
}
