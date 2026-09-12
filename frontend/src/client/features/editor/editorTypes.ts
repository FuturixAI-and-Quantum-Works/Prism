import type { Editor } from '@tiptap/core'

export interface TiptapEditorProps {
  content: string
  onContentChange?: (html: string) => void
  editable?: boolean
  placeholder?: string
  zoom?: number
  onZoomChange?: (zoom: number) => void
  onFocusChange?: (focused: boolean) => void
  onEditorReady?: (editor: Editor | null) => void
}
