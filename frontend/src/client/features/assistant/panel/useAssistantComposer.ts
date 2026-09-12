import { useRef, useState, type ChangeEvent } from 'react'
import type { AttachedFile } from '../composer/ChatInputConfig'
import { usePromptImprovement } from '../composer/usePromptImprovement'
import { isImageFile } from './messageModel'

export function useAssistantComposer() {
  const [inputText, setInputText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const { improvePrompt, isImprovingPrompt } = usePromptImprovement()
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
        previewUrl: isImageFile(file.type, file.name) ? URL.createObjectURL(file) : undefined,
      }))
      setAttachedFiles((current) => [...current, ...newFiles])
    }
    event.target.value = ''
  }

  const removeFile = (fileId: string) => {
    setAttachedFiles((current) => {
      const fileToRemove = current.find((file) => file.id === fileId)
      if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl)
      return current.filter((file) => file.id !== fileId)
    })
  }

  const addDroppedFile = (file: AttachedFile) => {
    if (
      file.source.kind === 'local-file' &&
      !file.previewUrl &&
      isImageFile(file.source.file.type, file.name)
    ) {
      file.previewUrl = URL.createObjectURL(file.source.file)
    }
    setAttachedFiles((current) => [...current, file])
  }

  const clearMessage = () => {
    setInputText('')
    setAttachedFiles([])
  }

  return {
    inputText,
    setInputText,
    attachedFiles,
    fileInputRef,
    handleFileChange,
    removeFile,
    addDroppedFile,
    clearMessage,
    isImprovingPrompt,
    improvePrompt,
  }
}
